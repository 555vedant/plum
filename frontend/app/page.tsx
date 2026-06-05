'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  PlusCircle, FileText, CheckCircle, XCircle, Clock,
  Activity, TrendingDown, BarChart2,
  AlertTriangle, ShieldCheck, ArrowRight, TestTube2, Loader2,
} from "lucide-react"
import { getClaims, runTestCases, TestCaseRunResult } from "../lib/api"
import { Claim } from "../types/claim"

export default function DashboardHome() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [runningTests, setRunningTests] = useState(false)
  const [testRun, setTestRun] = useState<TestCaseRunResult | null>(null)
  const [testRunError, setTestRunError] = useState("")

  useEffect(() => {
    getClaims()
      .then(res => { setClaims(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleRunTestCases = async () => {
    setRunningTests(true)
    setTestRunError("")
    try {
      const result = await runTestCases()
      setTestRun(result)
      setClaims(await getClaims())
    } catch (error) {
      setTestRunError(error instanceof Error ? error.message : "Failed to run test cases.")
    } finally {
      setRunningTests(false)
    }
  }

  const total = claims.length
  const approved = claims.filter(c => c.status === "APPROVED").length
  const partial = claims.filter(c => c.status === "PARTIAL_APPROVAL").length
  const rejected = claims.filter(c => c.status === "REJECTED").length
  const manual = claims.filter(c => c.status === "MANUAL_REVIEW").length

  const totalBilled = claims.reduce((s, c) => s + (c.claimed_amount ?? 0), 0)
  const totalDisbursed = claims.reduce((s, c) => s + (c.approved_amount ?? 0), 0)
  const totalSaved = totalBilled - totalDisbursed
  const savingsRate = totalBilled > 0 ? ((totalSaved / totalBilled) * 100) : 0
  const avgConfidence = total > 0
    ? claims.reduce((s, c) => s + (c.confidence_score ?? 0), 0) / total
    : 0
  const autoDecisionRate = total > 0 ? (((approved + partial + rejected) / total) * 100) : 0

  const steps = [
    { num: "01", name: "Upload Files", desc: "Prescription and bills are submitted" },
    { num: "02", name: "Extract Data", desc: "Medical and billing fields are structured" },
    { num: "03", name: "Apply Rules", desc: "Policy limits and exclusions are checked" },
    { num: "04", name: "Record Decision", desc: "The claim is approved, rejected, or queued" },
  ]

  const statusBars = [
    { label: "Approved", count: approved, color: "bg-emerald-500", textColor: "text-emerald-700" },
    { label: "Partial", count: partial, color: "bg-amber-500", textColor: "text-amber-700" },
    { label: "Rejected", count: rejected, color: "bg-rose-500", textColor: "text-rose-700" },
    { label: "Manual Review", count: manual, color: "bg-sky-500", textColor: "text-sky-700" },
  ]

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
         
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Claims Adjudication Dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Review claim volume, decision quality, financial exposure, and automated rule outcomes from one clean operational view.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Upload Claim</span>
          </Link>
          <Link
            href="/claims"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            <span>Claim Logs</span>
          </Link>
          <button
            type="button"
            onClick={handleRunTestCases}
            disabled={runningTests}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningTests ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
            ) : (
              <TestTube2 className="h-4 w-4 text-blue-700" />
            )}
            <span>{runningTests ? "Running" : "Run Tests"}</span>
          </button>
        </div>
      </section>

      {(testRun || testRunError) && (
        <div className={`rounded-md border px-4 py-3 ${
          testRunError
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-blue-200 bg-blue-50 text-blue-900"
        }`}>
          <p className="text-sm font-semibold">
            {testRunError || `Ran ${testRun?.total ?? 0} test cases. ${testRun?.matched ?? 0} matched expected decisions.`}
          </p>
          {testRun && (
            <p className="mt-1 text-xs text-blue-800">
              Saved generated decisions to the claim log and refreshed dashboard metrics.
            </p>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Core Operations
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-md border border-slate-200 bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Total Claims"
              value={total}
              note={`Rs ${totalBilled.toLocaleString("en-IN")} billed`}
              icon={<FileText className="h-4 w-4 text-blue-700" />}
            />
            <MetricCard
              label="Approved"
              value={approved + partial}
              note={`Rs ${totalDisbursed.toLocaleString("en-IN")} disbursed`}
              valueClass="text-emerald-700"
              icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
            />
            <MetricCard
              label="Rejected"
              value={rejected}
              note="Policy violations"
              valueClass="text-rose-700"
              icon={<XCircle className="h-4 w-4 text-rose-600" />}
            />
            <MetricCard
              label="Manual Review"
              value={manual}
              note="Pending officer audit"
              valueClass="text-sky-700"
              icon={<Clock className="h-4 w-4 text-sky-600" />}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Evaluation Metrics
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-md border border-slate-200 bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Panel title="Financial Overview" icon={<TrendingDown className="h-4 w-4 text-blue-700" />}>
              <div className="space-y-3">
                <AmountRow label="Total Billed" value={totalBilled} />
                <AmountRow label="Total Disbursed" value={totalDisbursed} valueClass="text-emerald-700" />
                <div className="border-t border-slate-200 pt-3">
                  <AmountRow label="Amount Saved" value={totalSaved} valueClass="text-amber-700" />
                </div>
                <Progress label="Savings Rate" value={savingsRate} color="bg-amber-500" suffix="%" />
              </div>
            </Panel>

            <Panel title="Claim Distribution" icon={<BarChart2 className="h-4 w-4 text-blue-700" />}>
              {total === 0 ? (
                <p className="py-5 text-center text-sm text-slate-500">No claims yet</p>
              ) : (
                <div className="space-y-3">
                  {statusBars.map(bar => {
                    const pct = total > 0 ? Math.round((bar.count / total) * 100) : 0
                    return (
                      <div key={bar.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className={`font-semibold ${bar.textColor}`}>{bar.label}</span>
                          <span className="text-slate-500">{bar.count} / {pct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${bar.color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            <Panel title="Audit Quality" icon={<ShieldCheck className="h-4 w-4 text-blue-700" />}>
              <div className="space-y-4">
                <Progress
                  label="Avg AI Confidence"
                  value={avgConfidence * 100}
                  color={avgConfidence >= 0.8 ? "bg-emerald-500" : "bg-rose-500"}
                  suffix="%"
                />
                <Progress
                  label="Auto-Decision Rate"
                  value={autoDecisionRate}
                  color="bg-blue-600"
                  suffix="%"
                />
                <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-700" />
                  <p className="text-xs font-medium text-sky-800">
                    {manual} claim{manual !== 1 ? "s" : ""} pending officer review.
                  </p>
                </div>
                {manual > 0 && (
                  <Link
                    href="/claims"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    <span>View Manual Review Queue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </Panel>
          </div>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-1">
          <h3 className="text-base font-semibold text-slate-950">Claim Adjudication Pipeline</h3>
          <p className="text-sm text-slate-500">
            A simple view of how each claim moves from submission to decision.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.num} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <span className="font-mono text-xs font-semibold text-blue-700">{step.num}</span>
              <h4 className="mt-2 text-sm font-semibold text-slate-950">{step.name}</h4>
              <p className="mt-1 text-xs leading-5 text-slate-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  note,
  icon,
  valueClass = "text-slate-950",
}: {
  label: string
  value: number
  note: string
  icon: React.ReactNode
  valueClass?: string
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold">{label}</span>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{note}</p>
    </div>
  )
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {icon}
      </div>
      {children}
    </div>
  )
}

function AmountRow({
  label,
  value,
  valueClass = "text-slate-950",
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`font-mono text-sm font-semibold ${valueClass}`}>
        Rs {value.toLocaleString("en-IN")}
      </span>
    </div>
  )
}

function Progress({
  label,
  value,
  color,
  suffix,
}: {
  label: string
  value: number
  color: string
  suffix: string
}) {
  const width = Math.max(0, Math.min(100, value))

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
