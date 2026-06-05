'use client'

import Link from "next/link"
import { Calendar, User, IndianRupee, Award, ArrowRight } from "lucide-react"
import { Claim } from "../types/claim"

interface ClaimCardProps {
  claim: Claim
}

export default function ClaimCard({ claim }: ClaimCardProps) {
  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200"
      case "PARTIAL_APPROVAL":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "MANUAL_REVIEW":
        return "bg-sky-50 text-sky-700 border-sky-200"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  const patientName = claim.extracted_data?.extracted_json?.patient_name || "Unknown Patient"
  const confidencePercent = Math.round((claim.confidence_score ?? 0) * 100)

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(claim.status)}`}>
            {claim.status.replace("_", " ")}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(claim.created_at)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User className="h-3.5 w-3.5" />
            <span>Patient</span>
          </div>
          <p className="truncate text-lg font-semibold text-slate-950">{patientName}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-slate-200 py-3">
          <div className="space-y-1">
            <span className="flex items-center text-xs text-slate-500">
              <IndianRupee className="h-3.5 w-3.5" /> Claimed
            </span>
            <span className="text-base font-semibold text-slate-950">
              Rs {claim.claimed_amount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="space-y-1">
            <span className="flex items-center text-xs text-slate-500">
              <IndianRupee className="h-3.5 w-3.5" /> Approved
            </span>
            <span className={`text-base font-semibold ${claim.status === "REJECTED" ? "text-slate-500" : "text-emerald-700"}`}>
              Rs {claim.approved_amount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-500">
              <Award className="h-3.5 w-3.5" />
              <span>AI Confidence</span>
            </span>
            <span className={`font-semibold ${claim.confidence_score >= 0.8 ? "text-blue-700" : "text-rose-700"}`}>
              {confidencePercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${claim.confidence_score >= 0.8 ? "bg-blue-700" : "bg-rose-500"}`}
              style={{ width: `${Math.max(10, Math.min(100, confidencePercent))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="max-w-[150px] truncate font-mono text-xs text-slate-500">
          ID: {claim.id.split("-")[0]}...
        </span>
        <Link
          href={`/claims/${claim.id}`}
          className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
        >
          <span>View Decision</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
