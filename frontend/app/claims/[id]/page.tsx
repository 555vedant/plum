'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, FileText, Database, Shield, Calendar,
  ExternalLink, ShieldAlert, CheckCircle2,
} from "lucide-react"
import { getClaimById, submitManualDecision } from "../../../lib/api"
import { Claim } from "../../../types/claim"
import DecisionCard from "../../../components/DecisionCard"
import LoadingSpinner from "../../../components/LoadingSpinner"

interface ClaimDetailsProps {
  params: {
    id: string
  }
}

export default function ClaimDetailsPage({ params }: ClaimDetailsProps) {
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualAmount, setManualAmount] = useState<number>(0)
  const [manualComment, setManualComment] = useState("")
  const [submittingOverride, setSubmittingOverride] = useState(false)
  const [overrideSuccess, setOverrideSuccess] = useState(false)

  const fetchClaim = () => {
    setLoading(true)
    getClaimById(params.id)
      .then(res => {
        setClaim(res)
        setManualAmount(res.claimed_amount)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || "Failed to load claim details.")
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchClaim()
  }, [params.id])

  const handleManualAction = async (status: "APPROVED" | "REJECTED") => {
    if (!claim) return
    if (!manualComment.trim()) {
      alert("Please provide an audit comment for the manual action.")
      return
    }

    setSubmittingOverride(true)
    try {
      const finalAmt = status === "APPROVED" ? manualAmount : 0
      const updatedClaim = await submitManualDecision(claim.id, status, finalAmt, manualComment)
      setClaim(updatedClaim)
      setOverrideSuccess(true)
      setTimeout(() => setOverrideSuccess(false), 3000)
    } catch (err: any) {
      alert(`Manual adjudication failed: ${err.message}`)
    } finally {
      setSubmittingOverride(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-lg border border-slate-200 bg-white p-10 shadow-sm">
        <LoadingSpinner status="Retrieving Claim Logs..." />
      </div>
    )
  }

  if (error || !claim) {
    return (
      <div className="mx-auto mt-12 max-w-md space-y-4 rounded-lg border border-rose-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <Shield className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-950">Error Loading Claim</h3>
          <p className="text-xs text-slate-500">{error || "Claim details could not be retrieved."}</p>
        </div>
        <Link
          href="/claims"
          className="inline-block rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Claims Log
        </Link>
      </div>
    )
  }

  const extData = claim.extracted_data?.extracted_json
  const prefixUrl = (url: string) => {
    if (url.startsWith("/static/")) return `http://localhost:8000${url}`
    return url
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/claims"
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Logs</span>
          </Link>
          <h2 className="flex flex-wrap items-center gap-2 text-2xl font-semibold text-slate-950">
            <span>Claim Details</span>
            <span className="font-mono text-xs font-normal text-slate-500">({claim.id})</span>
          </h2>
        </div>

        <div className="font-mono text-xs text-slate-500">
          <p className="flex items-center gap-1 sm:justify-end">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(claim.created_at).toLocaleString()}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {claim.status === "MANUAL_REVIEW" && (
            <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-2 text-blue-800">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="text-base font-semibold">Manual Adjudication Panel</h3>
              </div>
              <p className="text-xs text-blue-900">
                This claim is pending manual review. Review the extracted data and attachments, then render a final policy decision.
              </p>

              {overrideSuccess && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Manual review logged successfully.</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Approved Amount (Rs)
                  </label>
                  <input
                    type="number"
                    max={claim.claimed_amount}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-950 focus:border-blue-600"
                  />
                  <span className="block text-[10px] text-slate-500">
                    Claimed: Rs {claim.claimed_amount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Audit Comment
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter override explanation"
                    value={manualComment}
                    onChange={(e) => setManualComment(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 placeholder:text-slate-400 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleManualAction("APPROVED")}
                  disabled={submittingOverride}
                  className="flex-1 rounded-md bg-emerald-700 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  Approve Claim
                </button>
                <button
                  onClick={() => handleManualAction("REJECTED")}
                  disabled={submittingOverride}
                  className="flex-1 rounded-md bg-rose-700 py-2.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
                >
                  Reject Claim
                </button>
              </div>
            </div>
          )}

          <DecisionCard claim={claim} />

          {extData && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <Database className="h-4 w-4 text-blue-700" />
                <span>Extracted Data Payload</span>
              </h3>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DataField label="Patient Name" value={extData.patient_name || "N/A"} />
                <DataField label="Consulting Physician" value={extData.doctor_name || "N/A"} />
                <DataField label="Doctor Medical License" value={extData.doctor_registration || "N/A"} mono />
                <DataField label="Diagnosis" value={extData.diagnosis || "N/A"} />
                <DataField label="Consultation Amount" value={`Rs ${extData.consultation_amount?.toLocaleString("en-IN") || "0"}`} mono />
                <DataField label="Diagnostic Amount" value={`Rs ${extData.diagnostic_amount?.toLocaleString("en-IN") || "0"}`} mono />
                <DataField label="Pharmacy Amount" value={`Rs ${extData.pharmacy_amount?.toLocaleString("en-IN") || "0"}`} mono />
                <DataField label="Treatment Date" value={extData.treatment_date || "N/A"} mono />
              </div>

              <div className="space-y-2 pt-2">
                <span className="block text-xs font-semibold text-slate-500">Raw Extraction Output</span>
                <pre className="max-h-48 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700">
                  {JSON.stringify(extData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <FileText className="h-4 w-4 text-blue-700" />
              <span>Uploaded Files ({claim.documents.length})</span>
            </h3>

            <div className="space-y-3">
              {claim.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {doc.document_type}
                      </span>
                      <p className="max-w-[180px] truncate text-xs font-semibold text-slate-950">
                        {doc.storage_url.split("/").pop()}
                      </p>
                    </div>
                    <a
                      href={prefixUrl(doc.storage_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 rounded p-1 text-slate-500 hover:bg-white hover:text-slate-950"
                      title="Open Document in New Tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  {doc.storage_url.match(/\.(jpeg|jpg|gif|png|webp)/i) && (
                    <div className="relative h-28 overflow-hidden rounded-md border border-slate-200 bg-white">
                      <img
                        src={prefixUrl(doc.storage_url)}
                        alt={doc.document_type}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {doc.storage_url.endsWith(".pdf") && (
                    <div className="flex h-16 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-xs text-slate-600">
                      <FileText className="h-5 w-5 text-rose-600" />
                      <span>PDF Document</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DataField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5 rounded-md border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-semibold text-slate-500">{label}</span>
      <span className={`text-sm font-medium text-slate-950 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  )
}
