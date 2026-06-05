import os
import re
import json
import logging
import datetime

logger = logging.getLogger("adjudication_service")
POLICY_FILE = os.path.join("app", "static", "policy_config.json")

_DEFAULT_POLICIES = {
    "max_claim_amount": 5000.0,
    "high_value_manual_review_threshold": 25000.0,
    "min_claim_amount": 100.0,
    "min_confidence_threshold": 0.8,
    "late_submission_days": 30,
    "doctor_reg_pattern": "^(?:[A-Z]{1,5}[0-9]{4,10}|[A-Z]{2}/[0-9]{1,10}/[0-9]{4})$",
    "required_document_types": ["Prescription"],
    "non_covered_keywords": [
        "teeth whitening", "whitening", "cosmetic", "acne",
        "hair transplant", "weight loss", "aesthetic", "rhinoplasty", "liposuction",
    ],
    "covered_keywords": [
        "root canal", "dental cavity", "cavity", "fever", "cough",
        "infection", "consultation", "fracture", "flu", "malaria", "diabetes", "hypertension",
    ],
}


def get_policies() -> dict:
    if os.path.exists(POLICY_FILE):
        try:
            with open(POLICY_FILE, "r") as f:
                loaded = json.load(f)
            # Merge with defaults so new keys added later don't crash
            merged = {**_DEFAULT_POLICIES, **loaded}
            return merged
        except Exception as e:
            logger.error(f"Failed to read policy configuration: {e}")
    return dict(_DEFAULT_POLICIES)


def save_policies(policy_data: dict) -> None:
    try:
        os.makedirs(os.path.dirname(POLICY_FILE), exist_ok=True)
        with open(POLICY_FILE, "w") as f:
            json.dump(policy_data, f, indent=2)
        logger.info("Saved policy configurations successfully.")
    except Exception as e:
        logger.error(f"Failed to save policy configuration: {e}")
        raise RuntimeError(f"Could not persist policy settings: {e}")


def _parse_date(date_str: str):
    """Try to parse YYYY-MM-DD date string. Returns datetime.date or None."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None


def adjudicate(extracted_data: dict, document_types: list) -> dict:
    """
    Evaluates all adjudication policy rules against a claim.

    Rules (in priority order):
      0. HIGH_VALUE_MANUAL_REVIEW  — amount > 25 000  → MANUAL_REVIEW
      1. LOW_CONFIDENCE            — composite score < threshold → MANUAL_REVIEW
      2. BELOW_MIN_AMOUNT          — total < min_claim_amount → REJECTED
      3. MISSING_DOCUMENTS         — required doc types absent → REJECTED
      4. INVALID_DOCTOR_REGISTRATION (regex) → REJECTED
      5. LATE_SUBMISSION           — treatment_date > N days ago → REJECTED
      6. DATE_MISMATCH             — treatment date is in the future → REJECTED
      7. LIMIT_EXCEEDED            — amount > max_claim_amount → REJECTED
      8. NON_COVERED_TREATMENT     — diagnosis exclusions → REJECTED / PARTIAL_APPROVAL
      9. APPROVED                  — all rules pass
    """
    policies = get_policies()

    max_amount = float(policies.get("max_claim_amount", 5000.0))
    high_value_threshold = float(policies.get("high_value_manual_review_threshold", 25000.0))
    min_amount = float(policies.get("min_claim_amount", 100.0))
    min_confidence = float(policies.get("min_confidence_threshold", 0.8))
    late_days = int(policies.get("late_submission_days", 30))
    doctor_reg_pattern = str(
        policies.get(
            "doctor_reg_pattern",
            r"^(?:[A-Z]{1,5}[0-9]{4,10}|[A-Z]{2}/[0-9]{1,10}/[0-9]{4})$",
        )
    )
    required_doc_types = [d.lower() for d in policies.get("required_document_types", ["Prescription"])]
    non_covered_keywords = policies.get("non_covered_keywords", [])
    covered_keywords = policies.get("covered_keywords", [])

    # ── Composite confidence score ─────────────────────────────────────────────
    required_fields = ["patient_name", "doctor_name", "diagnosis", "treatment_date", "total_claim_amount"]
    present_fields = [f for f in required_fields if extracted_data.get(f)]
    document_completeness = len(present_fields) / len(required_fields)

    extraction_confidence = float(extracted_data.get("confidence_score", 0.0))
    confidence = round((extraction_confidence * 0.7) + (document_completeness * 0.3), 4)

    total_amount = float(extracted_data.get("total_claim_amount", 0.0))
    normalized_doc_types = [dt.lower().strip() for dt in document_types]
    doctor_reg = str(extracted_data.get("doctor_registration", "") or "").strip()
    treatment_date_str = str(extracted_data.get("treatment_date", "") or "").strip()
    diagnosis = str(extracted_data.get("diagnosis", "") or "").lower()

    # ── RULE 0: High-value → mandatory manual review ──────────────────────────
    if total_amount > high_value_threshold:
        return {
            "status": "MANUAL_REVIEW",
            "approved_amount": 0.0,
            "confidence_score": confidence,
            "reason": (
                f"HIGH_VALUE_MANUAL_REVIEW: Claim amount ₹{total_amount:,.2f} exceeds the high-value "
                f"manual-review threshold of ₹{high_value_threshold:,.2f}. Escalated for officer sign-off."
            ),
        }

    # ── RULE 1: Low confidence → manual review ────────────────────────────────
    if confidence < min_confidence:
        return {
            "status": "MANUAL_REVIEW",
            "approved_amount": 0.0,
            "confidence_score": confidence,
            "reason": (
                f"LOW_CONFIDENCE: Composite score {confidence:.2f} is below the "
                f"{min_confidence:.2f} threshold. Insufficient data quality for auto-adjudication."
            ),
        }

    # ── RULE 2: Below minimum claimable amount ────────────────────────────────
    if total_amount < min_amount:
        return {
            "status": "REJECTED",
            "approved_amount": 0.0,
            "confidence_score": confidence,
            "reason": (
                f"BELOW_MIN_AMOUNT: Claim amount ₹{total_amount:,.2f} is below the minimum "
                f"claimable threshold of ₹{min_amount:,.2f}."
            ),
        }

    # ── RULE 3: Missing required document types ───────────────────────────────
    missing_docs = [req for req in required_doc_types if req not in normalized_doc_types]
    if missing_docs:
        missing_str = ", ".join(d.title() for d in missing_docs)
        return {
            "status": "REJECTED",
            "approved_amount": 0.0,
            "confidence_score": confidence,
            "reason": f"MISSING_DOCUMENTS: Required document(s) not submitted: {missing_str}.",
        }

    # ── RULE 4: Doctor registration — regex validation ────────────────────────
    if not doctor_reg:
        return {
            "status": "REJECTED",
            "approved_amount": 0.0,
            "confidence_score": confidence,
            "reason": "INVALID_DOCTOR_REGISTRATION: Doctor registration number is absent from documents.",
        }
    try:
        if not re.match(doctor_reg_pattern, doctor_reg):
            return {
                "status": "REJECTED",
                "approved_amount": 0.0,
                "confidence_score": confidence,
                "reason": (
                    f"INVALID_DOCTOR_REGISTRATION: Registration '{doctor_reg}' does not match "
                    f"the required format (pattern: {doctor_reg_pattern})."
                ),
            }
    except re.error:
        # If the saved pattern is somehow malformed, skip regex check
        logger.warning(f"doctor_reg_pattern '{doctor_reg_pattern}' is invalid regex — skipping format check.")

    # ── RULE 5: Late submission ───────────────────────────────────────────────
    treatment_date = _parse_date(treatment_date_str)
    if treatment_date:
        today = datetime.date.today()
        days_since = (today - treatment_date).days

        # ── RULE 6: Date mismatch — treatment date is in the future ──────────
        if days_since < 0:
            return {
                "status": "REJECTED",
                "approved_amount": 0.0,
                "confidence_score": confidence,
                "reason": (
                    f"DATE_MISMATCH: Treatment date '{treatment_date_str}' is in the future "
                    f"({abs(days_since)} day(s) ahead). Cannot process claims for future treatments."
                ),
            }

        if days_since > late_days:
            return {
                "status": "REJECTED",
                "approved_amount": 0.0,
                "confidence_score": confidence,
                "reason": (
                    f"LATE_SUBMISSION: Claim submitted {days_since} day(s) after treatment date "
                    f"'{treatment_date_str}'. Policy allows a maximum of {late_days} days."
                ),
            }

    # ── RULE 7: Amount limit exceeded ────────────────────────────────────────
    if total_amount > max_amount:
        return {
            "status": "REJECTED",
            "approved_amount": 0.0,
            "confidence_score": confidence,
            "reason": (
                f"LIMIT_EXCEEDED: Claim total ₹{total_amount:,.2f} exceeds the automatic "
                f"approval ceiling of ₹{max_amount:,.2f}."
            ),
        }

    # ── RULE 8: Treatment coverage ────────────────────────────────────────────
    has_non_covered = any(kw.lower() in diagnosis for kw in non_covered_keywords)
    has_covered = any(kw.lower() in diagnosis for kw in covered_keywords)

    if has_non_covered:
        non_covered_matches = [kw for kw in non_covered_keywords if kw.lower() in diagnosis]
        match_str = ", ".join(non_covered_matches)

        if has_covered:
            # Partial: approve consultation + diagnostics; exclude pharmacy/cosmetic
            consult_amt = float(extracted_data.get("consultation_amount", 0.0))
            diag_amt = float(extracted_data.get("diagnostic_amount", 0.0))
            approved_amount = consult_amt + diag_amt
            if approved_amount <= 0:
                approved_amount = round(total_amount * 0.5, 2)
            approved_amount = min(approved_amount, total_amount)

            return {
                "status": "PARTIAL_APPROVAL",
                "approved_amount": approved_amount,
                "confidence_score": confidence,
                "reason": (
                    f"PARTIAL_APPROVAL: Medically covered procedures approved (₹{approved_amount:,.2f}). "
                    f"Excluded non-covered items: {match_str}."
                ),
            }
        else:
            return {
                "status": "REJECTED",
                "approved_amount": 0.0,
                "confidence_score": confidence,
                "reason": (
                    f"NON_COVERED_TREATMENT: Diagnosed condition(s) '{match_str}' are excluded "
                    f"under the current insurance policy."
                ),
            }

    # ── RULE 9: All rules passed ──────────────────────────────────────────────
    return {
        "status": "APPROVED",
        "approved_amount": total_amount,
        "confidence_score": confidence,
        "reason": "APPROVED_CLAIM: All policy validation rules passed. Claim cleared for disbursement.",
    }
