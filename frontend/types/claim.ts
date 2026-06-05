export interface Document {
  id: string
  claim_id: string
  document_type: string
  storage_url: string
}

export interface ExtractedJsonPayload {
  patient_name: string
  doctor_name: string
  doctor_registration: string
  diagnosis: string
  consultation_amount: number
  diagnostic_amount: number
  pharmacy_amount: number
  total_claim_amount: number
  treatment_date: string
  confidence_score: number
}

export interface ExtractedData {
  id: string
  claim_id: string
  extracted_json: ExtractedJsonPayload
}

export interface Claim {
  id: string
  status: 'APPROVED' | 'REJECTED' | 'PARTIAL_APPROVAL' | 'MANUAL_REVIEW' | string
  claimed_amount: number
  approved_amount: number
  confidence_score: number
  decision_reason: string
  created_at: string
  documents: Document[]
  extracted_data?: ExtractedData
}