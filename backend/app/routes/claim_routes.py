import uuid
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.claim import (
    ProcessClaimRequest, ClaimResponse,
    ManualAdjudicateRequest, PolicyConfigSchema,
)
from app.services.claim_service import (
    process_and_save_claim, get_all_claims,
    get_claim_details, update_claim_status,
    run_and_save_test_cases,
)
from app.services.adjudication_service import get_policies, save_policies

router = APIRouter()


# ── Static / collection routes first (MUST precede /{id} routes) ─────────────

@router.get("/", response_model=list[ClaimResponse])
async def list_claims(db: AsyncSession = Depends(get_db)):
    try:
        return await get_all_claims(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch claims: {e}")


@router.get("/policies", response_model=PolicyConfigSchema)
async def get_active_policies():
    try:
        return get_policies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load policies: {e}")


@router.post("/policies")
async def update_active_policies(config: PolicyConfigSchema):
    try:
        save_policies(config.model_dump())
        return {"status": "success", "message": "Policy configurations updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save policies: {e}")


@router.post("/process", response_model=ClaimResponse)
async def process_claim(request: ProcessClaimRequest, db: AsyncSession = Depends(get_db)):
    if not request.documents:
        raise HTTPException(status_code=400, detail="Cannot process a claim with no documents.")
    try:
        return await process_and_save_claim(db, request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process claim: {e}")


# ── Path-parameter routes last ────────────────────────────────────────────────

@router.post("/run-test-cases")
async def run_test_cases(db: AsyncSession = Depends(get_db)):
    test_cases_path = Path(__file__).resolve().parents[2] / "test_cases.json"
    try:
        with test_cases_path.open("r", encoding="utf-8") as f:
            payload = json.load(f)
        test_cases = payload.get("test_cases", [])
        if not test_cases:
            raise HTTPException(status_code=400, detail="No test cases found in backend/test_cases.json.")
        return await run_and_save_test_cases(db, test_cases)
    except HTTPException:
        raise
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="backend/test_cases.json was not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run test cases: {e}")


@router.get("/{claim_id}", response_model=ClaimResponse)
async def get_claim(claim_id: str, db: AsyncSession = Depends(get_db)):
    try:
        claim = await get_claim_details(db, claim_id)
        if not claim:
            raise HTTPException(status_code=404, detail=f"Claim '{claim_id}' not found.")
        return claim
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch claim: {e}")


@router.post("/{claim_id}/adjudicate", response_model=ClaimResponse)
async def manual_adjudicate_claim(
    claim_id: str,
    request: ManualAdjudicateRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        claim = await get_claim_details(db, claim_id)
        if not claim:
            raise HTTPException(status_code=404, detail=f"Claim '{claim_id}' not found.")

        status_upper = request.status.upper()
        if status_upper not in {"APPROVED", "REJECTED", "PARTIAL_APPROVAL", "MANUAL_REVIEW"}:
            raise HTTPException(status_code=400, detail=f"Invalid status '{request.status}'.")

        updated = await update_claim_status(
            db=db,
            claim_id=claim_id,
            status=status_upper,
            approved_amount=request.approved_amount,
            comment=request.comment,
        )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual override failed: {e}")
