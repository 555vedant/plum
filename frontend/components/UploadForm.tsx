'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Trash2, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react"
import { uploadDocument, processClaim, ProcessDocumentItem } from "../lib/api"
import LoadingSpinner from "./LoadingSpinner"

interface SelectedFile {
  file: File
  documentType: string
  uploading: boolean
  uploaded: boolean
  error: boolean
  storageUrl?: string
  tempId?: string
}

export default function UploadForm() {
  const router = useRouter()
  const [filesList, setFilesList] = useState<SelectedFile[]>([])
  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")
  const [globalError, setGlobalError] = useState<string | null>(null)

  const docTypes = ["Prescription", "Medical Bill", "Pharmacy Bill", "Diagnostic Report"]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles: SelectedFile[] = Array.from(e.target.files).map(file => ({
      file,
      documentType: "Medical Bill",
      uploading: false,
      uploaded: false,
      error: false,
    }))
    setFilesList(prev => [...prev, ...newFiles])
    setGlobalError(null)
  }

  const handleTypeChange = (idx: number, type: string) => {
    setFilesList(prev => {
      const updated = [...prev]
      updated[idx].documentType = type
      return updated
    })
  }

  const handleRemoveFile = (idx: number) => {
    setFilesList(prev => prev.filter((_, i) => i !== idx))
  }

  const uploadAllFiles = async (): Promise<ProcessDocumentItem[] | null> => {
    const uploadedDocs: ProcessDocumentItem[] = []
    const currentFiles = [...filesList]

    for (let i = 0; i < currentFiles.length; i++) {
      const item = currentFiles[i]
      if (item.uploaded && item.storageUrl && item.tempId) {
        uploadedDocs.push({
          id: item.tempId,
          document_type: item.documentType,
          storage_url: item.storageUrl,
        })
        continue
      }

      setFilesList(prev => {
        const updated = [...prev]
        updated[i].uploading = true
        updated[i].error = false
        return updated
      })

      try {
        const res = await uploadDocument(item.file)
        setFilesList(prev => {
          const updated = [...prev]
          updated[i].uploading = false
          updated[i].uploaded = true
          updated[i].storageUrl = res.storage_url
          updated[i].tempId = res.id
          return updated
        })
        uploadedDocs.push({
          id: res.id,
          document_type: item.documentType,
          storage_url: res.storage_url,
        })
      } catch (err: any) {
        setFilesList(prev => {
          const updated = [...prev]
          updated[i].uploading = false
          updated[i].error = true
          return updated
        })
        setGlobalError(`Failed uploading ${item.file.name}: ${err.message}`)
        return null
      }
    }

    return uploadedDocs
  }

  const handleProcessClaim = async () => {
    if (filesList.length === 0) {
      setGlobalError("Please select at least one document.")
      return
    }

    setGlobalError(null)
    setProcessing(true)

    try {
      setProcessingStatus("Uploading documents to storage...")
      const documents = await uploadAllFiles()
      if (!documents) {
        setProcessing(false)
        return
      }

      setProcessingStatus("Reading documents...")
      await new Promise(r => setTimeout(r, 1000))
      setProcessingStatus("Evaluating insurance policy rules...")

      const claim = await processClaim(documents)
      setProcessingStatus("Claim processed successfully. Redirecting...")
      await new Promise(r => setTimeout(r, 800))
      router.push(`/claims/${claim.id}`)
    } catch (err: any) {
      setGlobalError(err.message || "An unexpected error occurred during processing.")
      setProcessing(false)
    }
  }

  if (processing) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <LoadingSpinner status={processingStatus} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          File Claim Documents
        </h2>
        <p className="text-sm text-slate-600">
          Upload prescriptions, laboratory reports, or medical bills to trigger automated policy adjudication.
        </p>
      </div>

      {globalError && (
        <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="text-sm font-medium">{globalError}</div>
        </div>
      )}

      <div className="relative rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm transition hover:border-blue-400">
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <Upload className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-950">Select or drag files here</p>
            <p className="text-xs text-slate-500">Supports PDF, JPG, PNG, WEBP. Max 5MB per file.</p>
          </div>
        </div>
      </div>

      {filesList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Attached Documents ({filesList.length})
            </h3>
            <button
              onClick={() => setFilesList([])}
              className="text-xs font-semibold text-slate-500 hover:text-rose-700"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {filesList.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="max-w-[300px] truncate text-sm font-semibold text-slate-950">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(item.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-slate-500 sm:inline">Type:</span>
                    <select
                      value={item.documentType}
                      onChange={(e) => handleTypeChange(idx, e.target.value)}
                      disabled={item.uploaded || item.uploading}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-blue-600 disabled:opacity-50"
                    >
                      {docTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.uploading && (
                      <span className="text-xs font-medium text-blue-700">Uploading...</span>
                    )}
                    {item.uploaded && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Ready</span>
                      </span>
                    )}
                    {item.error && (
                      <span className="text-xs font-semibold text-rose-700">Error</span>
                    )}

                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleProcessClaim}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            <span>Process Claim Decision</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
