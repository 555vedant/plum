import uuid
import logging
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from app.models.claim import Claim
from app.models.document import Document
from app.models.extracted_data import ExtractedData
from app.core.database import explain_database_error
from app.services.extraction_service import extract_and_validate
from app.services.adjudication_service import adjudicate
from app.schemas.claim import ProcessClaimRequest

logger = logging.getLogger("claim_service")


def _money(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _combine_text(*values: Any) -> str:
    parts: list[str] = []
    for value in values:
        if isinstance(value, list):
            parts.extend(str(item) for item in value if item)
        elif value:
            parts.append(str(value))
    return "; ".join(parts)


def _test_case_to_extracted_data(test_case: dict) -> tuple[dict, list[str]]:
    input_data = test_case.get("input_data", {})
    documents = input_data.get("documents", {})
    prescription = documents.get("prescription", {})
    bill = documents.get("bill", {})
    expected = test_case.get("expected_output", {})

    consultation_amount = _money(
        bill.get("consultation_fee")
        or bill.get("consultation")
        or bill.get("root_canal")
    )
    diagnostic_amount = _money(
        bill.get("diagnostic_tests")
        or bill.get("mri_scan")
        or bill.get("therapy_charges")
        or bill.get("diet_plan")
    )
    total_claim_amount = _money(input_data.get("claim_amount"))
    pharmacy_amount = max(total_claim_amount - consultation_amount - diagnostic_amount, 0.0)
    diagnosis = _combine_text(
        prescription.get("diagnosis"),
        prescription.get("procedures"),
        prescription.get("treatment"),
        prescription.get("tests_prescribed"),
    )

    extracted_data = {
        "patient_name": input_data.get("member_name", ""),
        "doctor_name": prescription.get("doctor_name", ""),
        "doctor_registration": prescription.get("doctor_reg", ""),
        "diagnosis": diagnosis,
        "consultation_amount": consultation_amount,
        "diagnostic_amount": diagnostic_amount,
        "pharmacy_amount": pharmacy_amount,
        "total_claim_amount": total_claim_amount,
        "treatment_date": input_data.get("treatment_date", ""),
        "confidence_score": _money(expected.get("confidence_score", 0.95)),
    }

    document_types = []
    if "prescription" in documents:
        document_types.append("Prescription")
    if "bill" in documents:
        document_types.append("Bill")

    return extracted_data, document_types


async def process_and_save_claim(db: AsyncSession, request: ProcessClaimRequest) -> Claim:
    # 1. Build documents list for extraction
    documents_list = [
        {"storage_url": doc.storage_url, "document_type": doc.document_type}
        for doc in request.documents
    ]

    # 2. Extract structured data via Gemini (or mock)
    extracted_data = await extract_and_validate(documents_list)

    # 3. Run rule engine
    document_types = [doc.document_type for doc in request.documents]
    decision = adjudicate(extracted_data, document_types)

    # 4. Persist
    claim_id = str(uuid.uuid4())

    db_claim = Claim(
        id=claim_id,
        status=decision["status"],
        claimed_amount=extracted_data["total_claim_amount"],
        approved_amount=decision["approved_amount"],
        confidence_score=decision["confidence_score"],
        decision_reason=decision["reason"],
    )
    db.add(db_claim)

    for doc in request.documents:
        db.add(Document(
            id=doc.id or str(uuid.uuid4()),  # id is Optional — generate if absent
            claim_id=claim_id,
            document_type=doc.document_type,
            storage_url=doc.storage_url,
        ))

    db.add(ExtractedData(
        id=str(uuid.uuid4()),
        claim_id=claim_id,
        extracted_json=extracted_data,
    ))

    try:
        await db.commit()
    except SQLAlchemyError as e:
        await db.rollback()
        raise RuntimeError(explain_database_error(e)) from e

    # Re-fetch so selectin relationships are populated
    try:
        result = await db.execute(select(Claim).filter(Claim.id == claim_id))
    except SQLAlchemyError as e:
        raise RuntimeError(explain_database_error(e)) from e
    claim = result.scalar_one_or_none()
    logger.info(f"Claim {claim_id} saved — status={decision['status']}")
    return claim


async def run_and_save_test_cases(db: AsyncSession, test_cases: list[dict]) -> dict:
    results = []

    for test_case in test_cases:
        extracted_data, document_types = _test_case_to_extracted_data(test_case)
        decision = adjudicate(extracted_data, document_types)
        claim_id = str(uuid.uuid4())

        db.add(Claim(
            id=claim_id,
            status=decision["status"],
            claimed_amount=extracted_data["total_claim_amount"],
            approved_amount=decision["approved_amount"],
            confidence_score=decision["confidence_score"],
            decision_reason=f"{test_case.get('case_id', 'TEST_CASE')}: {decision['reason']}",
        ))

        for document_type in document_types:
            db.add(Document(
                id=str(uuid.uuid4()),
                claim_id=claim_id,
                document_type=document_type,
                storage_url=f"test-case://{test_case.get('case_id', claim_id)}/{document_type.lower()}",
            ))

        db.add(ExtractedData(
            id=str(uuid.uuid4()),
            claim_id=claim_id,
            extracted_json=extracted_data,
        ))

        expected_decision = str(test_case.get("expected_output", {}).get("decision", "")).upper()
        actual_decision = decision["status"].replace("_APPROVAL", "")

        results.append({
            "case_id": test_case.get("case_id"),
            "case_name": test_case.get("case_name"),
            "claim_id": claim_id,
            "expected_decision": expected_decision,
            "actual_decision": decision["status"],
            "matched_expected": bool(expected_decision and actual_decision == expected_decision),
            "approved_amount": decision["approved_amount"],
            "reason": decision["reason"],
        })

    try:
        await db.commit()
    except SQLAlchemyError as e:
        await db.rollback()
        raise RuntimeError(explain_database_error(e)) from e

    return {
        "total": len(results),
        "matched": sum(1 for result in results if result["matched_expected"]),
        "results": results,
    }


async def update_claim_status(
    db: AsyncSession,
    claim_id: str,
    status: str,
    approved_amount: float,
    comment: str,
) -> Claim | None:
    result = await db.execute(select(Claim).filter(Claim.id == claim_id))
    claim = result.scalar_one_or_none()
    if not claim:
        return None

    claim.status = status
    claim.approved_amount = approved_amount
    claim.decision_reason = (
        f"MANUAL_DECISION: Status overridden to {status}. "
        f"Approved ₹{approved_amount:,.2f}. "
        f"Audit note: {comment}"
    )

    await db.commit()
    await db.refresh(claim)
    logger.info(f"Claim {claim_id} manually updated → {status}, ₹{approved_amount}")
    return claim


async def get_all_claims(db: AsyncSession) -> list:
    result = await db.execute(select(Claim).order_by(Claim.created_at.desc()))
    return list(result.scalars().all())


async def get_claim_details(db: AsyncSession, claim_id: str) -> Claim | None:
    result = await db.execute(select(Claim).filter(Claim.id == claim_id))
    return result.scalar_one_or_none()
