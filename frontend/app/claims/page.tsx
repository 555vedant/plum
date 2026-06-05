'use client'

import { useEffect, useState } from "react"
import { Search, Inbox } from "lucide-react"
import { getClaims } from "../../lib/api"
import { Claim } from "../../types/claim"
import ClaimCard from "../../components/ClaimCard"

export default function ClaimsLogPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("ALL")

  useEffect(() => {
    getClaims()
      .then(res => {
        setClaims(res)
        setFilteredClaims(res)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = [...claims]

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => {
        const patientName = c.extracted_data?.extracted_json?.patient_name?.toLowerCase() || ""
        return patientName.includes(q) || c.id.toLowerCase().includes(q)
      })
    }

    if (activeTab !== "ALL") {
      result = result.filter(c => {
        const status = c.status.toUpperCase()
        if (activeTab === "APPROVED") return status === "APPROVED" || status === "PARTIAL_APPROVAL"
        return status === activeTab
      })
    }

    setFilteredClaims(result)
  }, [searchQuery, activeTab, claims])

  const tabs = [
    { id: "ALL", label: "All Claims" },
    { id: "APPROVED", label: "Approved" },
    { id: "REJECTED", label: "Rejected" },
    { id: "MANUAL_REVIEW", label: "Manual Review" },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          Claims Adjudication Logs
        </h2>
        <p className="text-sm text-slate-600">
          Browse the audit trail of processed claims and extraction decisions.
        </p>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative max-w-md flex-grow">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by patient name or claim ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-950 placeholder:text-slate-400 focus:border-blue-600"
          />
        </div>

        <div className="flex self-start overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 md:self-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded px-3 py-2 text-xs font-semibold ${
                activeTab === tab.id
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="mx-auto max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-950">No claims found</p>
            <p className="text-xs text-slate-500">
              Try adjusting your search criteria or upload a new medical document.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredClaims.map(claim => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      )}
    </div>
  )
}
