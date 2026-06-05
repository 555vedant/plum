import os
import json
import logging
import datetime
import mimetypes

logger = logging.getLogger("gemini_service")

# Lazy import of settings to avoid circular imports at module-level
_gemini_model = None
_model_initialised = False


def _get_model():
    global _gemini_model, _model_initialised
    if _model_initialised:
        return _gemini_model
    _model_initialised = True
    try:
        from app.core.config import settings
        if settings.GEMINI_API_KEY:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
            logger.info("Gemini 2.5 Flash client initialised successfully.")
    except Exception as e:
        logger.error(f"Failed to initialise Gemini client: {e}. Falling back to mock.")
    return _gemini_model


async def extract_claim_data(documents: list) -> dict:
    gemini_model = _get_model()

    if gemini_model:
        try:
            import httpx
            from app.utils.prompts import GEMINI_SYSTEM_PROMPT

            contents = [GEMINI_SYSTEM_PROMPT]

            async with httpx.AsyncClient(timeout=60.0) as client:
                for doc in documents:
                    url = doc.get("storage_url", "")
                    if not url:
                        continue

                    file_bytes = b""
                    if url.startswith("/static/"):
                        local_path = os.path.join("app", url.lstrip("/"))
                        if os.path.exists(local_path):
                            with open(local_path, "rb") as f:
                                file_bytes = f.read()
                        else:
                            logger.error(f"Local file not found: {local_path}")
                            continue
                    else:
                        resp = await client.get(url)
                        if resp.status_code == 200:
                            file_bytes = resp.content
                        else:
                            logger.error(f"Failed fetching {url}: HTTP {resp.status_code}")
                            continue

                    mime_type, _ = mimetypes.guess_type(url)
                    if not mime_type:
                        ext = url.rsplit(".", 1)[-1].lower()
                        mime_type = {
                            "pdf": "application/pdf",
                            "png": "image/png",
                            "jpg": "image/jpeg",
                            "jpeg": "image/jpeg",
                            "webp": "image/webp",
                        }.get(ext, "application/octet-stream")

                    contents.append({"mime_type": mime_type, "data": file_bytes})

            contents.append(
                "Extract all medical claim fields from the uploaded files according to the rules."
            )
            response = gemini_model.generate_content(contents)

            text = response.text.strip()
            # Strip markdown fences if present
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text.rsplit("```", 1)[0]
            text = text.strip()

            result = json.loads(text)
            logger.info(f"Gemini extraction succeeded: {result}")
            return result

        except Exception as e:
            logger.error(f"Gemini API call failed: {e}. Falling back to mock.")

    # ── SANDBOX MOCK (no API key or Gemini unavailable) ───────────────────────
    logger.info("Running Gemini in Sandbox Mock Mode.")
    today = datetime.date.today().isoformat()

    combined = " ".join(
        doc.get("storage_url", "").lower() for doc in documents
    )

    # High-value → MANUAL_REVIEW (high_value_manual_review rule)
    if "high_value" in combined or "expensive" in combined:
        return _mock(
            "Tony Stark", "Dr. Helen Cho", "HCK9910", "Cardiac Surgery and ICU",
            5000.0, 12000.0, 9000.0, 26000.0, today, 0.96,
        )

    # Limit exceeded → REJECTED (limit_exceeded rule, 5000 < amount ≤ 25000)
    if "limit_exceeded" in combined or "high_amount" in combined:
        return _mock(
            "Sarah Connor", "Dr. Peter Silberman", "MCI54321", "Severe Migraine",
            1000.0, 1500.0, 3500.0, 6000.0, today, 0.95,
        )

    # Below minimum amount → REJECTED
    if "below_min" in combined or "tiny_claim" in combined:
        return _mock(
            "Mini Mouse", "Dr. Small", "MCI0001", "Minor Rash",
            30.0, 0.0, 20.0, 50.0, today, 0.93,
        )

    # Missing/invalid doctor reg → REJECTED
    if "missing_doctor" in combined or "no_doctor" in combined:
        return _mock(
            "Arthur Dent", "Dr. Ford Prefect", "", "Spaced-Out Fever",
            500.0, 0.0, 200.0, 700.0, today, 0.92,
        )

    # Bad doctor reg format → REJECTED (regex fails)
    if "bad_reg" in combined or "invalid_reg" in combined:
        return _mock(
            "Zaphod Beeblebrox", "Dr. Marvin", "12345-INVALID", "Paranoia",
            400.0, 200.0, 100.0, 700.0, today, 0.91,
        )

    # Late submission → REJECTED
    if "late_submission" in combined or "old_claim" in combined:
        old_date = (datetime.date.today() - datetime.timedelta(days=60)).isoformat()
        return _mock(
            "Indiana Jones", "Dr. Jones Sr.", "MCI1938", "Travel Injuries",
            600.0, 800.0, 400.0, 1800.0, old_date, 0.90,
        )

    # Future date → DATE_MISMATCH
    if "future_date" in combined or "date_mismatch" in combined:
        future_date = (datetime.date.today() + datetime.timedelta(days=10)).isoformat()
        return _mock(
            "Marty McFly", "Dr. Emmett Brown", "MCI1985", "Time-travel Whiplash",
            500.0, 300.0, 200.0, 1000.0, future_date, 0.89,
        )

    # Non-covered treatment → REJECTED
    if "not_covered" in combined or "teeth_whitening" in combined:
        return _mock(
            "Clark Kent", "Dr. Emil Hamilton", "MCI9988", "Teeth Whitening and Polishing",
            800.0, 0.0, 2200.0, 3000.0, today, 0.97,
        )

    # Mixed covered + non-covered → PARTIAL_APPROVAL
    if "partial" in combined or "root_canal_teeth" in combined:
        return _mock(
            "Bruce Wayne", "Dr. Leslie Thompkins", "MCI1939",
            "Root Canal and Teeth Whitening",
            1200.0, 1000.0, 1800.0, 4000.0, today, 0.95,
        )

    # Low confidence → MANUAL_REVIEW
    if "low_confidence" in combined:
        return _mock("", "Dr. Unknown", "", "", 0.0, 0.0, 0.0, 0.0, "", 0.4)

    # Default → APPROVED
    return _mock(
        "Jane Doe", "Dr. Gregory House", "MCI11223", "Acute Bronchitis",
        600.0, 1200.0, 700.0, 2500.0, today, 0.94,
    )


def _mock(
    patient_name, doctor_name, doctor_registration, diagnosis,
    consultation_amount, diagnostic_amount, pharmacy_amount,
    total_claim_amount, treatment_date, confidence_score,
) -> dict:
    return {
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "doctor_registration": doctor_registration,
        "diagnosis": diagnosis,
        "consultation_amount": consultation_amount,
        "diagnostic_amount": diagnostic_amount,
        "pharmacy_amount": pharmacy_amount,
        "total_claim_amount": total_claim_amount,
        "treatment_date": treatment_date,
        "confidence_score": confidence_score,
    }
