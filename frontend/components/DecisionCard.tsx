'use client'

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, Loader2 } from "lucide-react"
import { Claim } from "../types/claim"
import { getPolicies, PolicyConfig } from "../lib/api"

interface DecisionCardProps {
  claim: Claim
}

const DEFAULT_POLICIES: PolicyConfig = {
  max_claim_amount: 5000,
  high_value_manual_review_threshold: 25000,
  min_claim_amount: 100,
  min_confidence_threshold: 0.8,
  late_submission_days: 30,
  doctor_reg_pattern: "^[A-Z]{1,5}[0-9]{4,10}$",
  required_document_types: ["Prescription"],
  non_covered_keywords: ["teeth whitening", "whitening", "cosmetic"],
  covered_keywords: ["root canal", "fever", "cough", "infection"],
}

export default function DecisionCard({ claim }: DecisionCardProps) {
  const [policies, setPolicies] = useState<PolicyConfig>(DEFAULT_POLICIES)

  useEffect(() => {
    getPolicies().then(setPolicies).catch(() => {})
  }, [])

  const extData = claim.extracted_data?.extracted_json
  const docTypes = claim.documents.map(d => d.document_type.toLowerCase().trim())
  const reason = claim.decision_reason ?? ""
  const diagnosis = (extData?.diagnosis ?? "").toLowerCase()
  const doctorReg = (extData?.doctor_registration ?? "").trim()
  const claimedAmount = claim.claimed_amount ?? 0
  const confidence = claim.confidence_score ?? 0
  const treatmentDateStr = (extData?.treatment_date ?? "").trim()

  const isHighValue = claimedAmount > policies.high_value_manual_review_threshold
  const isConfident = confidence >= policies.min_confidence_threshold
  const isAboveMin = claimedAmount >= policies.min_claim_amount
  const requiredDocs = policies.required_document_types.map(d => d.toLowerCase())
  const missingDocs = requiredDocs.filter(r => !docTypes.includes(r))
  const hasAllDocs = missingDocs.length === 0
  const hasDoctorReg = doctorReg.length > 0

  let doctorRegFormatOk = false
  try {
    doctorRegFormatOk = hasDoctorReg && new RegExp(policies.doctor_reg_pattern).test(doctorReg)
  } catch {
    doctorRegFormatOk = hasDoctorReg
  }

  let treatmentDate: Date | null = null
  try {
    if (treatmentDateStr) treatmentDate = new Date(treatmentDateStr)
  } catch {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysDiff = treatmentDate
    ? Math.floor((today.getTime() - treatmentDate.getTime()) / 86400000)
    : null

  const isNotFutureDate = daysDiff === null || daysDiff >= 0
  const isNotLateSubmission = daysDiff === null || (daysDiff >= 0 && daysDiff <= policies.late_submission_days)
  const isUnderLimit = claimedAmount <= policies.max_claim_amount
  const hasNonCovered = policies.non_covered_keywords.some(kw => diagnosis.includes(kw.toLowerCase()))
  const hasCovered = policies.covered_keywords.some(kw => diagnosis.includes(kw.toLowerCase()))
  const isCoverageOk = !hasNonCovered || (hasNonCovered && hasCovered)
  const isPartial = hasNonCovered && hasCovered

  const rules = [
    {
      name: "High-Value Claim Check",
      code: "HIGH_VALUE_MANUAL_REVIEW",
      desc: `Claims exceeding Rs ${policies.high_value_manual_review_threshold.toLocaleString("en-IN")} require officer sign-off.`,
      status: !isHighValue,
      message: isHighValue
        ? `Amount Rs ${claimedAmount.toLocaleString("en-IN")} exceeds the high-value threshold.`
        : `Amount Rs ${claimedAmount.toLocaleString("en-IN")} is within the high-value ceiling.`,
    },
    {
      name: "AI Extraction Confidence",
      code: "LOW_CONFIDENCE",
      desc: `Composite score must be at least ${(policies.min_confidence_threshold * 100).toFixed(0)}%.`,
      status: isConfident,
      message: `Confidence score: ${(confidence * 100).toFixed(1)}%.`,
    },
    {
      name: "Minimum Claimable Amount",
      code: "BELOW_MIN_AMOUNT",
      desc: `Claims below Rs ${policies.min_claim_amount.toLocaleString("en-IN")} cannot be processed.`,
      status: isAboveMin,
      message: isAboveMin
        ? `Claim meets the minimum threshold.`
        : `Claim is below the minimum threshold.`,
    },
    {
      name: "Required Documents Submitted",
      code: "MISSING_DOCUMENTS",
      desc: `Required: ${policies.required_document_types.join(", ")}.`,
      status: hasAllDocs,
      message: hasAllDocs ? "All required document types are present." : `Missing: ${missingDocs.join(", ")}.`,
    },
    {
      name: "Doctor Registration",
      code: "DOCTOR_REG_REGEX_VALIDATION",
      desc: "Medical license must be present and match the required pattern.",
      status: doctorRegFormatOk,
      message: !hasDoctorReg ? "No doctor registration number found." : `License value: ${doctorReg}.`,
    },
    {
      name: "Treatment Date",
      code: "DATE_MISMATCH",
      desc: "Claims cannot be filed for future treatments.",
      status: isNotFutureDate,
      message: treatmentDate ? `Treatment date: ${treatmentDateStr}.` : "Treatment date not found.",
    },
    {
      name: `Late Submission (${policies.late_submission_days} days)`,
      code: "LATE_SUBMISSION",
      desc: `Claims must be filed within ${policies.late_submission_days} days of treatment.`,
      status: isNotLateSubmission,
      message: daysDiff === null ? "Treatment date unavailable." : `Submitted ${daysDiff} day(s) after treatment.`,
    },
    {
      name: `Claim Limit`,
      code: "LIMIT_EXCEEDED",
      desc: `Amount must not exceed Rs ${policies.max_claim_amount.toLocaleString("en-IN")}.`,
      status: isUnderLimit,
      message: isUnderLimit ? "Amount is within limit." : "Amount exceeds limit.",
    },
    {
      name: "Treatment Coverage",
      code: "NON_COVERED_TREATMENT",
      desc: "Diagnosis must fall within covered medical categories.",
      status: isCoverageOk,
      message: isPartial
        ? "Partial approval: covered procedures approved and exclusions deducted."
        : hasNonCovered
          ? "Diagnosis contains excluded items."
          : diagnosis
            ? "Diagnosis is covered under the current policy."
            : "Diagnosis field is empty.",
    },
  ]

  const getBanner = (status: string) => {
    switch (status.toUpperCase()) {
      case "APPROVED":
        return {
          title: "Claim Approved",
          bg: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-800",
          icon: <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-emerald-700" />,
          desc: "All policy validation rules passed. Claim is cleared for automatic disbursement.",
        }
      case "PARTIAL_APPROVAL":
        return {
          title: "Partially Approved",
          bg: "bg-amber-50 border-amber-200",
          text: "text-amber-800",
          icon: <AlertCircle className="h-7 w-7 flex-shrink-0 text-amber-700" />,
          desc: "Covered procedures are approved. Non-covered line items were excluded.",
        }
      case "REJECTED":
        return {
          title: "Claim Rejected",
          bg: "bg-rose-50 border-rose-200",
          text: "text-rose-800",
          icon: <XCircle className="h-7 w-7 flex-shrink-0 text-rose-700" />,
          desc: "This claim violated one or more policy rules and was rejected.",
        }
      case "MANUAL_REVIEW":
        return {
          title: "Manual Review Required",
          bg: "bg-sky-50 border-sky-200",
          text: "text-sky-800",
          icon: <HelpCircle className="h-7 w-7 flex-shrink-0 text-sky-700" />,
          desc: "Claim is flagged for officer review due to confidence or value checks.",
        }
      default:
        return {
          title: "Decision Pending",
          bg: "bg-slate-50 border-slate-200",
          text: "text-slate-800",
          icon: <Loader2 className="h-7 w-7 flex-shrink-0 animate-spin text-slate-600" />,
          desc: "The adjudication outcome is not yet determined.",
        }
    }
  }

  const banner = getBanner(claim.status)

  return (
    <div className="space-y-6">
      <div className={`flex flex-col items-start gap-4 rounded-lg border p-5 sm:flex-row sm:items-center ${banner.bg}`}>
        {banner.icon}
        <div className="space-y-1">
          <h3 className={`text-xl font-semibold ${banner.text}`}>{banner.title}</h3>
          <p className="text-sm text-slate-700">{banner.desc}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="border-b border-slate-200 pb-3 text-base font-semibold text-slate-950">
          Policy Adjudication Rules ({rules.filter(r => r.status).length}/{rules.length} passed)
        </h4>

        <div className="divide-y divide-slate-200">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-3 py-4 first:pt-4 last:pb-0">
              {rule.status
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                : <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
              }
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-slate-950">{rule.name}</span>
                  <span className={`rounded px-2 py-0.5 font-mono text-[10px] ${
                    rule.status ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}>
                    {rule.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{rule.desc}</p>
                <p className={`text-xs font-medium ${rule.status ? "text-emerald-700" : "text-rose-700"}`}>
                  {rule.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          System Decision Log
        </h4>
        <pre className="mt-3 whitespace-pre-wrap break-all rounded-md border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700">
          {reason || "No decision log available."}
        </pre>
      </div>
    </div>
  )
}
