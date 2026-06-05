'use client'

interface LoadingSpinnerProps {
  status?: string
}

export default function LoadingSpinner({ status = "Processing Claim..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-950">{status}</p>
        <p className="mx-auto max-w-xs text-xs text-slate-500">
          Please wait while the system extracts details and evaluates claim policies.
        </p>
      </div>
    </div>
  )
}
