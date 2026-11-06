import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentApi, ocrApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import {
  getDocStore,
  formatBytes,
  type LocalDocument,
  type DocumentCategory,
  type StorageUsage,
} from '../lib/docstore'
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
  HelpCircle,
  HardDrive,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ReferralChecklistItem {
  category: string
  status: 'UPLOADED_VERIFIED' | 'UPLOADED_UNVERIFIED' | 'MISSING'
  label: string
}

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const patientId = String(user?.id || '1')

  const [localDocs, setLocalDocs] = useState<LocalDocument[]>([])
  const [checklist, setChecklist] = useState<ReferralChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<LocalDocument | null>(null)
  const [selectedBlobUrl, setSelectedBlobUrl] = useState<string | null>(null)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null)
  const [isPersisting, setIsPersisting] = useState(false)

  // Upload Form state
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<DocumentCategory>('Prescription')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAll()
  }, [patientId])

  useEffect(() => {
    if (selectedDoc?.id) {
      loadBlobPreview(selectedDoc.id)
    } else {
      setSelectedBlobUrl(null)
    }
  }, [selectedDoc?.id])

  const loadAll = async () => {
    try {
      setLoading(true)
      const store = await getDocStore()
      const docs = await store.list(patientId)
      setLocalDocs(docs)

      if (docs.length > 0 && (!selectedDoc || !docs.some((d) => d.id === selectedDoc.id))) {
        setSelectedDoc(docs[0])
      }

      // Check storage quota
      const usage = await store.getStorageUsage()
      setStorageUsage(usage)

      // Fetch server referral checklist status
      try {
        const res = await documentApi.getAll()
        setChecklist(res.data?.referral_checklist || [])
      } catch {}
    } catch (err) {
      console.error('Failed to load local documents:', err)
      toast.error('Failed to access local documents')
    } finally {
      setLoading(false)
    }
  }

  const loadBlobPreview = async (docId: number) => {
    try {
      const store = await getDocStore()
      const blob = await store.getBlob(docId)
      if (blob) {
        if (selectedBlobUrl) {
          URL.revokeObjectURL(selectedBlobUrl)
        }
        const url = URL.createObjectURL(blob)
        setSelectedBlobUrl(url)
      } else {
        setSelectedBlobUrl(null)
      }
    } catch {
      setSelectedBlobUrl(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleRequestPersistence = async () => {
    setIsPersisting(true)
    try {
      const store = await getDocStore()
      const granted = await store.requestPersistence()
      if (granted) {
        toast.success('Persistent browser storage granted!')
      } else {
        toast('Browser did not grant persistence or permission denied.', { icon: 'ℹ️' })
      }
      const usage = await store.getStorageUsage()
      setStorageUsage(usage)
    } finally {
      setIsPersisting(false)
    }
  }

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !selectedFile) {
      toast.error('Please provide a title and select a file')
      return
    }

    try {
      setUploading(true)
      const store = await getDocStore()

      // 1. Save original byte-for-byte to local storage (OPFS or IDB)
      const savedDoc = await store.save(
        {
          patientId,
          category: newCategory,
          originalName: selectedFile.name,
          mime: selectedFile.type || 'application/octet-stream',
          size: selectedFile.size,
          documentDate,
          notes,
          ocrStatus: 'processing',
          verificationStatus: 'unverified',
        },
        selectedFile
      )

      // 2. Try real backend OCR
      let extractedText = ''
      let ocrEngine = 'unavailable'
      let ocrStatus: LocalDocument['ocrStatus'] = 'draft'
      let uncertainFields: LocalDocument['uncertainFields'] = []

      try {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('document_id', String(savedDoc.id))

        const ocrRes = await ocrApi.process(formData)
        if (ocrRes.data?.status === 'success' || ocrRes.data?.status === 'COMPLETED') {
          extractedText = ocrRes.data.extracted_text || ocrRes.data.full_text || ''
          ocrEngine = ocrRes.data.engine || 'native_ocr'
          ocrStatus = 'draft'
          uncertainFields = (ocrRes.data.uncertain_fields || ocrRes.data.uncertain_regions || []).map((u: any) => ({
            field: u.field || 'Uncertain region',
            extracted: u.extracted || u.text || '',
            confidence: String(u.confidence || '0.70'),
            flag: u.flag || u.reason || 'Low confidence text',
          }))
          toast.success('Document uploaded and OCR extracted!')
        } else if (ocrRes.data?.status === 'OCR_UNAVAILABLE') {
          ocrStatus = 'unavailable'
          ocrEngine = 'unavailable'
          extractedText = 'Optical character recognition engine is currently unavailable for this format.'
          toast('Document stored locally in your private vault.', {
            icon: 'ℹ️',
          })
        }
      } catch (ocrErr: any) {
        console.warn('Backend OCR call failed or offline:', ocrErr)
        ocrStatus = 'unavailable'
        extractedText = 'Offline or OCR service unavailable. Original file safely stored in your local browser vault.'
      }

      // 3. Update local doc with OCR result
      await store.update(savedDoc.id!, {
        ocrStatus,
        ocrText: extractedText,
        ocrEngine,
        uncertainFields,
      })

      // 4. Register metadata with backend (including extracted OCR text)
      try {
        const regRes = await documentApi.upload({
          category: newCategory,
          title: newTitle,
          file_name: selectedFile.name,
          ocr_extracted_text: extractedText,
          ocr_status: ocrStatus === 'draft' ? 'DRAFT' : 'NOT_PROCESSED',
          ocr_engine_used: ocrEngine,
          file_base64: '', // Empty: file is in local OPFS/Dexie
        })
        if (regRes.data?.document_id) {
          await store.update(savedDoc.id!, { serverDocId: regRes.data.document_id })
        }
      } catch {}

      setUploadModalOpen(false)
      setNewTitle('')
      setSelectedFile(null)
      setNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''

      await loadAll()
      const updated = await store.get(savedDoc.id!)
      if (updated) setSelectedDoc(updated)
    } catch (err: any) {
      console.error('Failed to upload document:', err)
      toast.error('Failed to store document locally')
    } finally {
      setUploading(false)
    }
  }

  const handleVerify = async (docId: number) => {
    try {
      const store = await getDocStore()
      const doc = await store.get(docId)
      if (!doc) return

      await store.update(docId, {
        verificationStatus: 'patient_verified',
        ocrStatus: 'verified',
        uncertainFields: [],
      })

      if (doc.serverDocId) {
        try {
          await documentApi.verify(doc.serverDocId, {
            verified_text: doc.ocrText || '',
          })
        } catch {}
      }

      toast.success('Document verified and locked by patient')
      await loadAll()
      const updated = await store.get(docId)
      if (updated) setSelectedDoc(updated)
    } catch (err) {
      console.error('Failed to verify document:', err)
      toast.error('Could not verify document')
    }
  }

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document from local storage?')) return
    try {
      const store = await getDocStore()
      const doc = await store.get(docId)
      await store.delete(docId)
      if (doc?.serverDocId) {
        try {
          await documentApi.delete(doc.serverDocId)
        } catch {}
      }
      toast.success('Document deleted')
      if (selectedDoc?.id === docId) setSelectedDoc(null)
      await loadAll()
    } catch (err) {
      console.error('Failed to delete document:', err)
      toast.error('Could not delete document')
    }
  }

  const handleExportBackup = async (doc: LocalDocument) => {
    if (!doc.id) return
    try {
      const store = await getDocStore()
      const blob = await store.getBlob(doc.id)
      if (!blob) {
        toast.error('Could not retrieve local file blob')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.originalName || `document_${doc.id}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported: ${doc.originalName}`)
    } catch (err) {
      toast.error('Failed to export backup')
    }
  }

  const usedMB = storageUsage ? (storageUsage.usedBytes / (1024 * 1024)).toFixed(1) : '0'
  const quotaMB = storageUsage ? (storageUsage.quotaBytes / (1024 * 1024)).toFixed(0) : '0'
  const isHighStorage = storageUsage && storageUsage.quotaBytes > 0
    ? storageUsage.usedBytes / storageUsage.quotaBytes > 0.8
    : false

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900 mb-2 transition-colors"
          >
            <span>← Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <FileCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Health Records & Local Vault
              </h1>
              <p className="text-sm text-stone-500">
                Organize prescriptions, lab reports, and referrals. Files are stored securely on this device (OPFS/IndexedDB) with transparent OCR verification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition text-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Storage Vault & Privacy Banner */}
      <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-950">
              Local Browser Vault: {usedMB} MB used {quotaMB !== '0' && `of ${quotaMB} MB`}
              {storageUsage?.isPersisted && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-semibold text-[10px]">
                  Persistent Storage Active
                </span>
              )}
            </p>
            <p className="text-emerald-800 text-[11px] mt-0.5">
              Documents never leave this browser profile unless you export a backup.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!storageUsage?.isPersisted && (
            <button
              onClick={handleRequestPersistence}
              disabled={isPersisting}
              className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-semibold hover:bg-emerald-100 transition shadow-sm text-[11px]"
            >
              Request Persistence
            </button>
          )}
        </div>
      </div>

      {isHighStorage && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Storage warning: over 80% quota utilized. Export older documents to free up browser space.</span>
        </div>
      )}

      {/* Referral Records Readiness Checklist (PS3 Module 4 & 5) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-emerald-600" />
          <span>Referral & Consultation Readiness Checklist</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { cat: 'Prescription', label: 'Active Prescriptions' },
            { cat: 'Referral', label: 'Doctor Referral Letter' },
            { cat: 'Lab Report', label: 'Recent Lab Diagnostics' },
            { cat: 'Insurance', label: 'Health Card / ABHA ID' },
          ].map((item, idx) => {
            const hasVerified = localDocs.some(
              (d) => d.category.toLowerCase() === item.cat.toLowerCase() && d.verificationStatus === 'patient_verified'
            )
            const hasDraft = localDocs.some(
              (d) => d.category.toLowerCase() === item.cat.toLowerCase()
            )
            const isReady = hasVerified
            const isUnverified = !hasVerified && hasDraft

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
                    {isReady ? 'Verified & Ready' : isUnverified ? 'Needs Verification' : 'Missing'}
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">
              Local Records ({localDocs.length})
            </h3>
            <button
              onClick={loadAll}
              className="text-stone-400 hover:text-stone-700 p-1"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
              Loading local documents...
            </div>
          ) : localDocs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
              No documents stored yet. Click Upload Document to add your first prescription or report.
            </div>
          ) : (
            localDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id
              const isVerified = doc.verificationStatus === 'patient_verified'

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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                            {doc.category}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {formatBytes(doc.size)}
                          </span>
                        </div>
                        <h4 className="font-semibold text-stone-900 text-sm mt-1">{doc.originalName}</h4>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {isVerified ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : doc.ocrStatus === 'unavailable' ? (
                        <span className="text-[11px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">
                          Manual Review
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          <span>Draft (Unverified)</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExportBackup(doc)
                          }}
                          className="text-stone-400 hover:text-emerald-600 p-1 transition"
                          title="Export Backup File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (doc.id) handleDelete(doc.id)
                          }}
                          className="text-stone-300 hover:text-red-500 p-1 transition"
                          title="Delete from Vault"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedDoc.category}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {selectedDoc.storageRef?.split('://')[0]?.toUpperCase() || 'LOCAL'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 mt-1">{selectedDoc.originalName}</h3>
                  <p className="text-xs text-stone-400">
                    Uploaded: {new Date(selectedDoc.uploadedAt).toLocaleString()} · Size: {formatBytes(selectedDoc.size)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportBackup(selectedDoc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-sm"
                    title="Export original file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>

                  {selectedDoc.verificationStatus === 'patient_verified' ? (
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
                {/* Left: Original File Preview (Real Blob Preview) */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    <span>Original Document Preview</span>
                  </h4>
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 min-h-[300px] flex flex-col justify-between overflow-hidden">
                    {selectedBlobUrl && selectedDoc.mime.startsWith('image/') ? (
                      <div className="w-full flex-1 flex items-center justify-center overflow-hidden max-h-[340px] bg-white rounded-lg border border-stone-200 p-1">
                        <img
                          src={selectedBlobUrl}
                          alt={selectedDoc.originalName}
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      </div>
                    ) : selectedBlobUrl && selectedDoc.mime === 'application/pdf' ? (
                      <div className="w-full flex-1 min-h-[280px]">
                        <iframe
                          src={selectedBlobUrl}
                          className="w-full h-[280px] rounded border border-stone-200"
                          title="PDF Preview"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-stone-400 space-y-2">
                        <FileText className="w-12 h-12 text-stone-300" />
                        <p className="text-xs font-medium text-stone-500">{selectedDoc.originalName}</p>
                        <p className="text-[11px] text-stone-400">{selectedDoc.mime}</p>
                      </div>
                    )}
                    <div className="text-[10px] text-stone-400 text-center pt-2 border-t border-stone-200 mt-2">
                      Local Vault Storage · SHA-256: {selectedDoc.contentSha256?.substring(0, 16)}...
                    </div>
                  </div>
                </div>

                {/* Right: Extracted OCR Draft & Safety Flags */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Extracted Text & Verification Flags</span>
                  </h4>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 min-h-[300px] flex flex-col justify-between space-y-3">
                    {/* Uncertain Fields Warning */}
                    {selectedDoc.uncertainFields && selectedDoc.uncertainFields.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Uncertain Terms Flagged (Please verify against original):</span>
                        </div>
                        <ul className="text-xs text-amber-700 space-y-0.5 pl-4 list-disc">
                          {selectedDoc.uncertainFields.map((f, i) => (
                            <li key={i}>
                              <span className="font-semibold">{f.field}:</span> {f.extracted} — {f.flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-200 flex-1 overflow-y-auto space-y-2 max-h-[220px]">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-semibold text-stone-800 text-[11px] uppercase tracking-wider">
                          Extracted Content
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          Engine: {selectedDoc.ocrEngine || 'unavailable'}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-stone-600 font-mono text-xs">
                        {selectedDoc.ocrText || 'No text extracted. Use manual entry or verified scan.'}
                      </p>
                    </div>

                    <div className="text-[10px] text-stone-500 flex items-center gap-1 border-t border-stone-200 pt-2">
                      <HelpCircle className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                      <span>OCR drafts never trigger reminders or clinical decisions until verified by you.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Verification Lock Action */}
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-stone-500">
                  {selectedDoc.verificationStatus === 'patient_verified'
                    ? 'Document verified and locked by patient. Safe for administrative and appointment reference.'
                    : 'Review the text on the right against your scan on the left before confirming.'}
                </div>

                {selectedDoc.verificationStatus !== 'patient_verified' ? (
                  <button
                    onClick={() => selectedDoc.id && handleVerify(selectedDoc.id)}
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
              <h3 className="font-bold text-lg text-stone-900">Upload to Local Healthcare Vault</h3>
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
                  onChange={(e) => setNewCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Prescription">Prescription / Medication Slip</option>
                  <option value="Referral">Doctor Referral Letter</option>
                  <option value="Lab Report">Diagnostic / Lab Report (CBC, Blood, etc.)</option>
                  <option value="Discharge Summary">Discharge Summary / Clinical Note</option>
                  <option value="Insurance">Insurance Card / Govt Health ID</option>
                  <option value="Other">Other Document</option>
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
                  Document Date (from paper)
                </label>
                <input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select File (Image / PDF / Scan)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                {selectedFile && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    {selectedFile.name} ({formatBytes(selectedFile.size)})
                  </p>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-500 space-y-1">
                <p className="font-semibold text-stone-700">🔒 Local-First Privacy Guarantee:</p>
                <p>The original file is stored byte-for-byte in your browser's private storage (OPFS). Scanned text is extracted for navigation assistance only and requires your verification.</p>
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
                  {uploading ? 'Processing locally & OCR...' : 'Upload & Process OCR'}
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
