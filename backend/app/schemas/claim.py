from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class DocumentSchema(BaseModel):
    id: str
    claim_id: str
    document_type: str
    storage_url: str

    class Config:
        from_attributes = True


class ExtractedDataSchema(BaseModel):
    id: str
    claim_id: str
    extracted_json: Any

    class Config:
        from_attributes = True


class ClaimResponse(BaseModel):
    id: str
    status: str
    claimed_amount: float
    approved_amount: float
    confidence_score: float
    decision_reason: str
    created_at: datetime
    documents: List[DocumentSchema]
    extracted_data: Optional[ExtractedDataSchema] = None

    class Config:
        from_attributes = True


class DocumentInput(BaseModel):
    id: Optional[str] = None   # optional — generated server-side if omitted
    document_type: str
    storage_url: str


class ProcessClaimRequest(BaseModel):
    documents: List[DocumentInput]


class ManualAdjudicateRequest(BaseModel):
    status: str
    approved_amount: float
    comment: str


class PolicyConfigSchema(BaseModel):
    max_claim_amount: float
    high_value_manual_review_threshold: float = 25000.0
    min_claim_amount: float = 100.0
    min_confidence_threshold: float
    late_submission_days: int = 30
    doctor_reg_pattern: str = "^(?:[A-Z]{1,5}[0-9]{4,10}|[A-Z]{2}/[0-9]{1,10}/[0-9]{4})$"
    required_document_types: List[str] = ["Prescription"]
    non_covered_keywords: List[str]
    covered_keywords: List[str]
