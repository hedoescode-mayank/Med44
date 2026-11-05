import React, { useState, useEffect } from 'react'
import { documentApi } from '../services/api'
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  FileCheck,
  ShieldCheck,
  X,
  Sparkles,
  Lock,
  Unlock,
  CheckSquare,
  HelpCircle
} from 'lucide-react'

interface DocumentItem {
  id: number
  category: string
  title: string
  file_name: string
  file_url?: string
  ocr_extracted_text?: string
  ocr_status: string // DRAFT, VERIFIED, FAILED
  uncertain_fields: string[]
  verified_by_patient: boolean
  created_at: string
}

interface ReferralChecklistItem {
  category: string
  status: 'UPLOADED_VERIFIED' | 'UPLOADED_UNVERIFIED' | 'MISSING'
  label: string
}

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [checklist, setChecklist] = useState<ReferralChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Upload Form state
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('PRESCRIPTION')
  const [fileName, setFileName] = useState('')
  const [fileBase64, setFileBase64] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const res = await documentApi.getAll()
      setDocuments(res.data?.documents || [])
      setChecklist(res.data?.referral_checklist || [])
      if (res.data?.documents?.length > 0 && !selectedDoc) {
        setSelectedDoc(res.data.documents[0])
      }
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
    const reader = new FileReader()
    reader.onload = () => {
      setFileBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !fileName) return
    try {
      setUploading(true)
      await documentApi.upload({
        category: newCategory,
        title: newTitle,
        file_name: fileName,
        file_base64: fileBase64 || 'data:text/plain;base64,U2FtcGxl',
      })
      setUploadModalOpen(false)
      setNewTitle('')
      setFileName('')
      setFileBase64('')
      await loadDocuments()
    } catch (err) {
      console.error('Failed to upload document:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleVerify = async (docId: number) => {
    try {
      await documentApi.verify(docId)
      await loadDocuments()
      if (selectedDoc?.id === docId) {
        setSelectedDoc((prev) =>
          prev ? { ...prev, verified_by_patient: true, ocr_status: 'VERIFIED' } : null
        )
      }
    } catch (err) {
      console.error('Failed to verify document:', err)
    }
  }

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await documentApi.delete(docId)
      if (selectedDoc?.id === docId) setSelectedDoc(null)
      await loadDocuments()
    } catch (err) {
      console.error('Failed to delete document:', err)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <FileCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Health Records & OCR Verification
              </h1>
              <p className="text-sm text-stone-500">
                Organize referral letters, lab reports, and prescriptions with transparent OCR inspection and safety locks.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition text-sm"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Referral Records Readiness Checklist (PS3 Module 4 & 5) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-emerald-600" />
          <span>Referral & Consultation Readiness Checklist</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {checklist.map((item, idx) => {
            const isReady = item.status === 'UPLOADED_VERIFIED'
            const isUnverified = item.status === 'UPLOADED_UNVERIFIED'
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isReady
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : isUnverified
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                {isReady ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : isUnverified ? (
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-xs font-semibold">{item.label}</p>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1 ${
                      isReady
                        ? 'bg-emerald-200/70 text-emerald-800'
                        : isUnverified
                        ? 'bg-amber-200/70 text-amber-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {isReady ? 'Verified & Ready' : isUnverified ? 'Needs OCR Review' : 'Missing'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Grid: Document List (Left 5 cols) & OCR Side-by-Side Reviewer (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Document List */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">
            Uploaded Records ({documents.length})
          </h3>
          {documents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
              No documents uploaded yet. Click Upload to add your first prescription or referral.
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 rounded-xl border transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-stone-100 text-stone-600 mt-0.5">
                        <FileText className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          {doc.category}
                        </span>
                        <h4 className="font-semibold text-stone-900 text-sm mt-1">{doc.title}</h4>
                        <p className="text-xs text-stone-400 mt-0.5">{doc.file_name}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {doc.verified_by_patient ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          <span>Draft (Unverified)</span>
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(doc.id)
                        }}
                        className="text-stone-300 hover:text-red-500 p-1 transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* OCR Side-by-Side Reviewer & Verification Lock (7 cols) */}
        <div className="lg:col-span-7">
          {selectedDoc ? (
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {selectedDoc.category}
                  </span>
                  <h3 className="text-lg font-bold text-stone-900 mt-1">{selectedDoc.title}</h3>
                  <p className="text-xs text-stone-400">File: {selectedDoc.file_name}</p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedDoc.verified_by_patient ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                      <Lock className="w-4 h-4" />
                      <span>Verified & Locked</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                      <Unlock className="w-4 h-4" />
                      <span>Pending Patient Review</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-Side View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Original Simulated Image/Scan */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    <span>Original Document Scan</span>
                  </h4>
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 min-h-[260px] flex flex-col justify-between">
                    <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
                      <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
                        <span>CLINICAL RECORD SCAN</span>
                        <span>CONFIDENTIAL</span>
                      </div>
                      <div className="h-2 bg-stone-200 rounded w-3/4 animate-pulse"></div>
                      <div className="h-2 bg-stone-200 rounded w-1/2"></div>
                      <div className="h-2 bg-stone-200 rounded w-5/6"></div>
                    </div>
                    <div className="p-3 bg-white/70 border border-stone-200 rounded-lg text-xs font-mono text-stone-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {selectedDoc.ocr_extracted_text || 'No preview available.'}
                    </div>
                    <div className="text-[10px] text-stone-400 text-center pt-2">
                      Simulated OCR high-fidelity optical rendering
                    </div>
                  </div>
                </div>

                {/* Right: Extracted OCR Draft & Uncertain Fields */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Extracted OCR Data & Safety Flags</span>
                  </h4>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 min-h-[260px] flex flex-col justify-between space-y-3">
                    {/* Uncertain Fields Warning */}
                    {selectedDoc.uncertain_fields && selectedDoc.uncertain_fields.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Uncertain Terms Flagged (Review Needed):</span>
                        </div>
                        <ul className="text-xs text-amber-700 space-y-0.5 pl-4 list-disc">
                          {selectedDoc.uncertain_fields.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-200 flex-1 overflow-y-auto space-y-2">
                      <p className="font-semibold text-stone-800 border-b pb-1 text-[11px] uppercase tracking-wider">
                        Extracted Content Summary
                      </p>
                      <p className="leading-relaxed whitespace-pre-line text-stone-600">
                        {selectedDoc.ocr_extracted_text || 'No text extracted.'}
                      </p>
                    </div>

                    <div className="text-[10px] text-stone-500 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                      <span>OCR drafts never trigger medication reminders until explicitly verified.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Verification Lock Action */}
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-stone-500">
                  {selectedDoc.verified_by_patient
                    ? 'Document verified and locked by patient. Safe for medication scheduling.'
                    : 'Review the extracted draft above against your paper slip before confirming.'}
                </div>

                {!selectedDoc.verified_by_patient ? (
                  <button
                    onClick={() => handleVerify(selectedDoc.id)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition text-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Verify & Confirm Document</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-medium text-xs flex items-center justify-center gap-2 cursor-default"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verified by Patient</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
              Select a document on the left to inspect side-by-side OCR extraction.
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-lg text-stone-900">Upload Healthcare Document</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Document Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="PRESCRIPTION">Prescription / Medication Slip</option>
                  <option value="REFERRAL">Doctor Referral Letter</option>
                  <option value="LAB_REPORT">Diagnostic / Lab Report (CBC, Blood, etc.)</option>
                  <option value="DISCHARGE_SUMMARY">Discharge Summary / Clinical Note</option>
                  <option value="INSURANCE">Insurance Card / Govt Health ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Gupta Prescription - Nov 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select File (Image / PDF / Scan)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                {fileName && <p className="text-xs text-emerald-600 mt-1 font-medium">{fileName}</p>}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-500">
                Uploaded documents undergo automated draft OCR extraction. Uncertain fields will be flagged for your explicit review before any reminders or clinical data are stored.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition disabled:opacity-50"
                >
                  {uploading ? 'Processing OCR...' : 'Upload & Process OCR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentsPage
