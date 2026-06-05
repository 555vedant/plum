import logging
from app.services.gemini_service import extract_claim_data

logger = logging.getLogger("extraction_service")

async def extract_and_validate(documents: list[dict]) -> dict:
    try:
        data = await extract_claim_data(documents)
    except Exception as e:
        logger.error(f"Error during Gemini extraction: {e}")
        data = {}

    # Ensure structure is valid
    validated_data = {
        "patient_name": str(data.get("patient_name", "") or "").strip(),
        "doctor_name": str(data.get("doctor_name", "") or "").strip(),
        "doctor_registration": str(data.get("doctor_registration", "") or "").strip(),
        "diagnosis": str(data.get("diagnosis", "") or "").strip(),
        "consultation_amount": float(data.get("consultation_amount") or 0.0),
        "diagnostic_amount": float(data.get("diagnostic_amount") or 0.0),
        "pharmacy_amount": float(data.get("pharmacy_amount") or 0.0),
        "total_claim_amount": float(data.get("total_claim_amount") or 0.0),
        "treatment_date": str(data.get("treatment_date", "") or "").strip(),
        "confidence_score": float(data.get("confidence_score") or 0.0)
    }

    # If total_claim_amount is 0.0 but subcomponents are set, compute total
    if validated_data["total_claim_amount"] <= 0.0:
        validated_data["total_claim_amount"] = (
            validated_data["consultation_amount"] +
            validated_data["diagnostic_amount"] +
            validated_data["pharmacy_amount"]
        )

    return validated_data
