import { Claim } from "../types/claim"

export const API_BASE = "http://localhost:8000/api/claims"

export interface UploadResult {
  id: string
  filename: string
  storage_url: string
}

export interface PolicyConfig {
  max_claim_amount: number
  high_value_manual_review_threshold: number
  min_claim_amount: number
  min_confidence_threshold: number
  late_submission_days: number
  doctor_reg_pattern: string
  required_document_types: string[]
  non_covered_keywords: string[]
  covered_keywords: string[]
}

export interface TestCaseRunResult {
  total: number
  matched: number
  results: {
    case_id: string
    case_name: string
    claim_id: string
    expected_decision: string
    actual_decision: string
    matched_expected: boolean
    approved_amount: number
    reason: string
  }[]
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Upload failed: ${errText || response.statusText}`)
  }

  return response.json()
}

export interface ProcessDocumentItem {
  id: string
  document_type: string
  storage_url: string
}

export async function processClaim(documents: ProcessDocumentItem[]): Promise<Claim> {
  const response = await fetch(`${API_BASE}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documents }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Claim processing failed: ${errText || response.statusText}`)
  }

  return response.json()
}

export async function getClaims(): Promise<Claim[]> {
  const response = await fetch(API_BASE, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch claims log.")
  }

  return response.json()
}

export async function runTestCases(): Promise<TestCaseRunResult> {
  const response = await fetch(`${API_BASE}/run-test-cases`, {
    method: "POST",
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Test case run failed: ${errText || response.statusText}`)
  }

  return response.json()
}

export async function getClaimById(id: string): Promise<Claim> {
  const response = await fetch(`${API_BASE}/${id}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch details for claim ID ${id}.`)
  }

  return response.json()
}

export async function getPolicies(): Promise<PolicyConfig> {
  const response = await fetch(`${API_BASE}/policies`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch policy configurations.")
  }

  return response.json()
}

export async function updatePolicies(config: PolicyConfig): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/policies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to update policies: ${errText || response.statusText}`)
  }

  return response.json()
}

export async function submitManualDecision(
  id: string,
  status: string,
  approvedAmount: number,
  comment: string
): Promise<Claim> {
  const response = await fetch(`${API_BASE}/${id}/adjudicate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
      approved_amount: approvedAmount,
      comment,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to submit manual override: ${errText || response.statusText}`)
  }

  return response.json()
}
