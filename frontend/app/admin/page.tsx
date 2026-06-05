'use client'

import { useEffect, useState } from "react"
import { Shield, Plus, X, Save, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { getPolicies, updatePolicies, PolicyConfig } from "../../lib/api"
import LoadingSpinner from "../../components/LoadingSpinner"

const DEFAULTS: PolicyConfig = {
  max_claim_amount: 5000,
  high_value_manual_review_threshold: 25000,
  min_claim_amount: 100,
  min_confidence_threshold: 0.8,
  late_submission_days: 30,
  doctor_reg_pattern: "^[A-Z]{1,5}[0-9]{4,10}$",
  required_document_types: ["Prescription"],
  non_covered_keywords: [],
  covered_keywords: [],
}

export default function AdminPolicyPage() {
  const [policies, setPolicies] = useState<PolicyConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [newNonCovered, setNewNonCovered] = useState("")
  const [newCovered, setNewCovered] = useState("")
  const [newRequiredDoc, setNewRequiredDoc] = useState("")

  useEffect(() => {
    getPolicies()
      .then(res => { setPolicies(res); setLoading(false) })
      .catch(() => { setErrorMsg("Could not load policies from backend."); setLoading(false) })
  }, [])

  const set = <K extends keyof PolicyConfig>(key: K, val: PolicyConfig[K]) =>
    setPolicies(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const res = await updatePolicies(policies)
      setSuccessMsg(res.message)
      setTimeout(() => setSuccessMsg(null), 3500)
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  const addKeyword = (
    listKey: "non_covered_keywords" | "covered_keywords" | "required_document_types",
    val: string,
    clear: () => void
  ) => {
    const trimmed = val.trim().toLowerCase()
    if (!trimmed) return
    if (!(policies[listKey] as string[]).includes(trimmed)) {
      set(listKey, [...(policies[listKey] as string[]), trimmed])
    }
    clear()
  }

  const removeKeyword = (
    listKey: "non_covered_keywords" | "covered_keywords" | "required_document_types",
    kw: string
  ) => set(listKey, (policies[listKey] as string[]).filter(k => k !== kw))

  if (loading) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-lg border border-slate-200 bg-white p-10 shadow-sm">
        <LoadingSpinner status="Loading Policy Engine Config..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-950">
          <Shield className="h-8 w-8 text-blue-700" />
          Insurance Adjudication Policy Rules
        </h2>
        <p className="max-w-2xl text-sm text-slate-600">
          Configure claim thresholds, date windows, registration checks, and diagnosis coverage lists.
        </p>
      </div>

      {successMsg && (
        <AlertBox tone="success" icon={<CheckCircle2 className="h-5 w-5" />} text={successMsg} />
      )}
      {errorMsg && (
        <AlertBox tone="error" icon={<AlertCircle className="h-5 w-5" />} text={errorMsg} />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Section title="Financial Limits">
            <NumField
              label="Auto-Approval Ceiling (Rs)"
              hint="Claims above this are rejected automatically."
              value={policies.max_claim_amount}
              onChange={v => set("max_claim_amount", v)}
            />
            <NumField
              label="High-Value Manual Review Threshold (Rs)"
              hint="Claims above this are escalated for officer review."
              value={policies.high_value_manual_review_threshold}
              onChange={v => set("high_value_manual_review_threshold", v)}
            />
            <NumField
              label="Minimum Claimable Amount (Rs)"
              hint="Claims below this floor are rejected."
              value={policies.min_claim_amount}
              onChange={v => set("min_claim_amount", v)}
            />
          </Section>

          <Section title="Confidence & Submission Rules">
            <NumField
              label="Min AI Confidence Score (0.0 to 1.0)"
              hint="Below this score, claims move to manual review."
              value={policies.min_confidence_threshold}
              onChange={v => set("min_confidence_threshold", v)}
              step={0.05}
              min={0.1}
              max={1}
            />
            <NumField
              label="Late Submission Window (days)"
              hint="Claims submitted after this window are rejected."
              value={policies.late_submission_days}
              onChange={v => set("late_submission_days", Math.round(v))}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Doctor Registration Regex Pattern
              </label>
              <input
                type="text"
                value={policies.doctor_reg_pattern}
                onChange={e => set("doctor_reg_pattern", e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-mono text-xs text-slate-950 focus:border-blue-600"
              />
              <HelpText text="Registration numbers that do not match this regex are rejected." />
            </div>
          </Section>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 py-3.5 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Rules..." : "Save All Policy Rules"}
          </button>
        </div>

        <div className="space-y-6">
          <KeywordBlock
            title="Required Document Types"
            hint="At least one of each must be uploaded."
            keywords={policies.required_document_types}
            input={newRequiredDoc}
            onInputChange={setNewRequiredDoc}
            onAdd={() => addKeyword("required_document_types", newRequiredDoc, () => setNewRequiredDoc(""))}
            onRemove={kw => removeKeyword("required_document_types", kw)}
            pillColor="bg-blue-50 text-blue-700 border-blue-200"
            placeholder="e.g. Prescription"
          />
          <KeywordBlock
            title="Policy Exclusions"
            hint="Diagnoses containing these keywords are rejected or partially approved."
            keywords={policies.non_covered_keywords}
            input={newNonCovered}
            onInputChange={setNewNonCovered}
            onAdd={() => addKeyword("non_covered_keywords", newNonCovered, () => setNewNonCovered(""))}
            onRemove={kw => removeKeyword("non_covered_keywords", kw)}
            pillColor="bg-rose-50 text-rose-700 border-rose-200"
            placeholder="e.g. teeth whitening"
          />
          <KeywordBlock
            title="Standard Coverage Keywords"
            hint="Used to detect covered procedures when mixed with exclusions."
            keywords={policies.covered_keywords}
            input={newCovered}
            onInputChange={setNewCovered}
            onAdd={() => addKeyword("covered_keywords", newCovered, () => setNewCovered(""))}
            onRemove={kw => removeKeyword("covered_keywords", kw)}
            pillColor="bg-emerald-50 text-emerald-700 border-emerald-200"
            placeholder="e.g. root canal"
          />
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="border-b border-slate-200 pb-3 text-sm font-semibold text-slate-950">{title}</h3>
      {children}
    </div>
  )
}

function NumField({
  label, hint, value, onChange, step = 1, min, max,
}: {
  label: string
  hint: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 focus:border-blue-600"
      />
      <HelpText text={hint} />
    </div>
  )
}

function HelpText({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-1 text-[11px] text-slate-500">
      <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
      {text}
    </p>
  )
}

function KeywordBlock({
  title, hint, keywords, input, onInputChange, onAdd, onRemove, pillColor, placeholder,
}: {
  title: string
  hint: string
  keywords: string[]
  input: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (kw: string) => void
  pillColor: string
  placeholder: string
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onAdd()}
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 placeholder:text-slate-400 focus:border-blue-600"
        />
        <button
          onClick={onAdd}
          className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
        {keywords.length === 0
          ? <span className="text-xs italic text-slate-400">No items added yet.</span>
          : keywords.map(kw => (
            <span key={kw} className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${pillColor}`}>
              {kw}
              <button onClick={() => onRemove(kw)} className="ml-0.5 hover:text-slate-950">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        }
      </div>
    </div>
  )
}

function AlertBox({ tone, icon, text }: { tone: "success" | "error"; icon: React.ReactNode; text: string }) {
  const cls = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-800"

  return (
    <div className={`flex items-center gap-2 rounded-md border p-4 ${cls}`}>
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}
