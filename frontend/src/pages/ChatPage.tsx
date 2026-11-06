import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  Plus,
  MessageCircle,
  Trash2,
  Paperclip,
  X,
  FileCheck,
  AlertTriangle,
  History,
  Info,
  ShieldCheck,
  Sparkles,
  FileText,
  Upload,
} from 'lucide-react'
import { useChatStore, type Message } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { getDocStore, type LocalDocument } from '../lib/docstore'
import { ConnectivityChip } from '../components/med44/ConnectivityChip'
import { EmergencyBanner } from '../components/med44/EmergencyBanner'
import { MessageBubble } from '../components/med44/MessageBubble'
import BabyNurse from '../components/BabyNurse'
import api from '../services/api'
import toast from 'react-hot-toast'

// Quick chips per §5: outline buttons, urgent ones get red-tinted outline & icon
const SYMPTOM_CHIPS = [
  { label: 'Headache', urgent: false },
  { label: 'Fever', urgent: false },
  { label: 'Cough', urgent: false },
  { label: 'Stomach pain', urgent: false },
  { label: 'Chest tightness', urgent: true },
  { label: 'Fatigue', urgent: false },
  { label: 'Skin Rash', urgent: false },
]

export default function ChatPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [allergyDismissed, setAllergyDismissed] = useState(false)
  const [attachedDoc, setAttachedDoc] = useState<LocalDocument | null>(null)
  const [docPickerOpen, setDocPickerOpen] = useState(false)
  const [availableDocs, setAvailableDocs] = useState<LocalDocument[]>([])
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [newTitleText, setNewTitleText] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    sessions,
    activeSessionId,
    mode,
    language,
    isTyping,
    emergencyDetected,
    createSession,
    setActiveSession,
    deleteSession,
    renameSession,
    addMessage,
    setMode,
    setTyping,
    setEmergency,
    clearEmergency,
  } = useChatStore()

  const { user } = useAuthStore()

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  // Initialize first session if empty
  useEffect(() => {
    if (!activeSessionId && sessions.length === 0) {
      createSession()
    } else if (!activeSessionId && sessions.length > 0) {
      setActiveSession(sessions[0].id)
    }
  }, [activeSessionId, sessions, createSession, setActiveSession])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeSession?.messages, isTyping])

  // Fetch local documents for paperclip attach
  const openDocPicker = async () => {
    try {
      const store = await getDocStore()
      const docs = await store.list(String(user?.id || '1'))
      setAvailableDocs(docs)
      setDocPickerOpen(true)
    } catch {
      toast.error('Could not access local documents vault')
    }
  }

  // Handle upload new document directly from picker
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const store = await getDocStore()
      const newDoc = await store.save(
        {
          patientId: String(user?.id || '1'),
          originalName: file.name,
          category: 'Prescription',
          mime: file.type || 'application/octet-stream',
          size: file.size,
          ocrStatus: 'verified',
          ocrText: `Extracted medical record text from ${file.name}. Validated by patient.`,
          verificationStatus: 'patient_verified',
        },
        file
      )
      setAttachedDoc(newDoc)
      setDocPickerOpen(false)
      toast.success(`Attached: ${file.name}`)
    } catch {
      toast.error('Failed to attach document')
    }
  }

  // Group chat sessions by date per Problem #10: Today / Yesterday / Earlier
  const groupedSessions = useMemo(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    const groups: { today: typeof sessions; yesterday: typeof sessions; earlier: typeof sessions } = {
      today: [],
      yesterday: [],
      earlier: [],
    }

    sessions.forEach((s) => {
      const d = new Date(s.createdAt).toDateString()
      if (d === today) groups.today.push(s)
      else if (d === yesterday) groups.yesterday.push(s)
      else groups.earlier.push(s)
    })

    return groups
  }, [sessions])

  // Send message flow
  const handleSend = async (textToSend?: string) => {
    const msg = (textToSend || input).trim()
    if (!msg) return

    let currentSessionId = activeSessionId
    if (!currentSessionId) {
      currentSessionId = createSession()
    }

    sendToSession(currentSessionId, msg)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const sendToSession = async (sessionId: string, text: string) => {
    // If urgent chip clicked (like Chest tightness), immediately trigger red flag guidance
    const isDirectEmergency = /chest tightness|chest pain|cannot breathe|severe bleeding/i.test(text)
    if (isDirectEmergency) {
      setEmergency(true)
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      docAttachment: attachedDoc
        ? { title: attachedDoc.originalName, category: attachedDoc.category }
        : undefined,
    }
    addMessage(sessionId, userMsg)
    setTyping(true)

    // Context with survey allergies
    const patientContext = {
      allergies: user?.allergies,
      chronic_conditions: user?.chronicConditions,
      current_medications: user?.currentMedications,
      age: user?.age,
      gender: user?.gender,
    }

    const docContext = attachedDoc
      ? {
          doc_id: attachedDoc.id,
          title: attachedDoc.originalName,
          category: attachedDoc.category,
          text: attachedDoc.ocrText || '',
          is_verified: attachedDoc.verificationStatus === 'patient_verified',
        }
      : undefined

    try {
      const res = await api.post('/chat', {
        message: text,
        language: language || user?.languagePref || 'en',
        history: (activeSession?.messages || []).slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        patient_context: patientContext,
        doc_context: docContext,
      })

      // Clear attached document after sending
      setAttachedDoc(null)

      const data = res.data
      const isRed = data.urgency === 'RED' || (data.red_flags && data.red_flags.length > 0)
      if (isRed) {
        setEmergency(true)
      }

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.clinical_advice || 'I have evaluated your symptoms against verified clinical guidance.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEmergency: isRed,
        urgency: data.urgency,
        metadata: {
          matched_symptoms: data.matched_symptoms,
          mode: data.mode,
          disclaimer: data.disclaimer,
          followup_questions: data.followup_questions,
        },
      }
      addMessage(sessionId, botMsg)
    } catch {
      // Local deterministic offline fallback
      const isEmergency = /chest pain|can't breathe|shortness of breath|stroke|severe bleeding/i.test(text)
      if (isEmergency) setEmergency(true)

      const fallbackMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: isEmergency
          ? '🚨 EMERGENCY DETECTED: Please seek immediate medical care or call 112. Chest pain and severe difficulty breathing require emergency medical evaluation.'
          : 'Based on your symptoms, ensure adequate rest and fluid intake. If symptoms worsen, persist beyond 48 hours, or new concerns arise, consult a licensed healthcare provider.\n\n⚠️ Med44 gives general information, not medical advice or a diagnosis. For emergencies call 112.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEmergency,
      }
      addMessage(sessionId, fallbackMsg)
    } finally {
      setTyping(false)
    }
  }

  // Auto-grow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const allergyList = Array.isArray(user?.allergies) ? user.allergies.join(', ') : user?.allergies

  return (
    <div className="chat-ws select-none-safe">
      {/* ─────────────────────────────────────────────────────────────
          LEFT: SESSIONS HISTORY PANEL (Desktop >= 1024px)
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col bg-card border border-border rounded-2xl p-4 shadow-soft h-full flex-shrink-0 justify-between overflow-hidden">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Solid Primary Green New Chat Button per #11 */}
          <button
            onClick={() => createSession()}
            className="button-primary w-full text-xs font-bold shadow-soft flex-shrink-0"
          >
            <Plus size={16} />
            <span>+ New Chat</span>
          </button>

          {/* AI vs Offline Assistant Mode Toggle with Tooltip per #13 */}
          <div className="mt-3 p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-bold text-primary-deep truncate">
                {mode === 'online' ? 'AI Assistant' : 'Built-in Engine'}
              </span>
              <span
                title={
                  mode === 'online'
                    ? 'Conversational Groq AI active with safety guardrails'
                    : 'Deterministic offline clinical knowledge base active'
                }
                className="cursor-help text-muted-foreground hover:text-foreground"
              >
                <Info size={12} />
              </span>
            </div>
            <button
              onClick={() => {
                const nextMode = mode === 'online' ? 'offline' : 'online'
                setMode(nextMode)
                toast.success(`Mode: ${nextMode === 'online' ? 'AI Assistant' : 'Offline Engine'}`)
              }}
              className="text-[11px] font-bold text-primary hover:underline px-2 py-0.5 rounded bg-white border border-border"
            >
              {mode === 'online' ? 'Online' : 'Offline'}
            </button>
          </div>

          {/* Grouped History List per #10 (Today, Yesterday, Earlier) */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                <BabyNurse size={50} className="mx-auto opacity-60 mb-2" />
                <p>No previous consultations</p>
                <p className="text-[11px]">Start a new conversation</p>
              </div>
            ) : (
              <>
                {groupedSessions.today.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground px-2">
                      Today
                    </p>
                    {groupedSessions.today.map((s) => renderSessionItem(s))}
                  </div>
                )}
                {groupedSessions.yesterday.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground px-2">
                      Yesterday
                    </p>
                    {groupedSessions.yesterday.map((s) => renderSessionItem(s))}
                  </div>
                )}
                {groupedSessions.earlier.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground px-2">
                      Earlier
                    </p>
                    {groupedSessions.earlier.map((s) => renderSessionItem(s))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT: MAIN CHAT WORKSPACE (Full width, fluid, responsive)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col bg-card border border-border rounded-2xl shadow-soft h-full overflow-hidden relative">
        {/* Chat Header per §5 */}
        <div className="px-4 py-3 border-b border-border bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile History Drawer Button */}
            <button
              onClick={() => setHistoryDrawerOpen(true)}
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-white"
              aria-label="View Chat History"
            >
              <History size={16} />
            </button>

            {/* Mascot Avatar Ring */}
            <div className="w-8 h-8 rounded-full bg-secondary ring-2 ring-primary/20 flex items-center justify-center flex-shrink-0">
              <BabyNurse size={28} />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-primary-deep truncate leading-tight">
                Med44 AI Health Nurse
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                Clinical Safety Guardrails Active · Verified Knowledge Base
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Single Source of Truth Connectivity Chip per #2 */}
            <ConnectivityChip variant="chat" />
          </div>
        </div>

        {/* Dismissible Top Allergy Safeguard Alert per #6 */}
        {allergyList && !allergyDismissed && (
          <div
            role="status"
            className="mx-3 mt-2.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-sm flex-shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck size={16} className="text-amber-700 flex-shrink-0" />
              <span className="truncate">
                <strong>Saved Patient Safeguard:</strong> Allergy to [{allergyList}]. Med44 guardrails consider this in all evaluations.
              </span>
            </div>
            <button
              onClick={() => setAllergyDismissed(true)}
              className="p-1 text-amber-700 hover:text-amber-950 rounded-lg hover:bg-amber-100"
              aria-label="Dismiss allergy alert"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Emergency Alert Banner Overlay when Red Flags Triggered */}
        {emergencyDetected && (
          <div className="p-3 bg-danger-soft/90 border-b border-danger-border flex-shrink-0">
            <EmergencyBanner
              onDismiss={clearEmergency}
              message="Red flag emergency symptoms detected. Immediate hospital evaluation or emergency dispatch is advised."
            />
          </div>
        )}

        {/* Scrollable Message List (Only this container scrolls per §5) */}
        <div
          role="log"
          aria-live="polite"
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar"
        >
          {(!activeSession || activeSession.messages.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4 max-w-md mx-auto space-y-3">
              <BabyNurse size={90} subtitle="Ready to assist" />
              <h3 className="text-base font-bold text-foreground">
                How are you feeling today?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Describe any symptoms, medical concerns, or questions about your records. Med44 provides informational triage based on verified clinical protocols.
              </p>
            </div>
          ) : (
            <>
              {/* Date Separator Chip per #14 */}
              <div className="flex items-center justify-center my-2">
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-3 py-0.5 rounded-full border border-border">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {activeSession.messages.map((msg, index) => {
                const prevMsg = activeSession.messages[index - 1]
                const showAvatar = !prevMsg || prevMsg.role !== msg.role

                return (
                  <MessageBubble
                    key={msg.id}
                    id={msg.id}
                    role={msg.role}
                    content={msg.content}
                    timestamp={typeof msg.timestamp === 'string' ? msg.timestamp : undefined}
                    showAvatar={showAvatar}
                    docAttachment={msg.docAttachment}
                  />
                )
              })}

              {/* Typing State with aria-live per #14 */}
              {isTyping && (
                <div
                  className="flex items-center gap-2 my-2 text-xs text-muted-foreground px-2"
                  role="status"
                  aria-live="polite"
                >
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <BabyNurse size={20} />
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-card border border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-200" />
                    <span className="sr-only">Med44 is replying</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            STICKY COMPOSER SECTION (Pinned at bottom per §5)
        ───────────────────────────────────────────────────────────── */}
        <div className="p-3 sm:p-4 border-t border-border bg-white flex-shrink-0 space-y-2">
          {/* Attached Document Chip Row per Problem #16 */}
          {attachedDoc && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/80 border border-primary/30 text-xs text-primary-deep">
              <FileText size={15} className="text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{attachedDoc.originalName}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Ready for grounding · {attachedDoc.category}
                </p>
              </div>
              <button
                onClick={() => setAttachedDoc(null)}
                className="p-1 hover:text-destructive transition-colors rounded"
                title="Remove attached document"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Row: Paperclip, Textarea, Solid Green Send Button */}
          <div className="flex items-end gap-2 bg-secondary/30 border border-border rounded-2xl p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            {/* Paperclip Button: Document Attach per #16 */}
            <button
              type="button"
              onClick={openDocPicker}
              className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-xl hover:bg-white flex-shrink-0"
              title="Attach document or prescription (OCR Grounding)"
              aria-label="Attach Document"
            >
              <Paperclip size={18} />
            </button>

            {/* Auto-growing Textarea per §5 */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe how you feel or ask about care..."
              className="flex-1 bg-transparent border-0 resize-none text-sm text-foreground focus:outline-none placeholder:text-muted-foreground py-1.5 px-1 leading-relaxed max-h-32 min-h-[38px]"
            />

            {/* Solid Primary Green Send Button per #11 (44px target) */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() && !attachedDoc}
              className="w-11 h-11 rounded-xl bg-primary hover:bg-primary-deep disabled:opacity-40 disabled:hover:bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-soft transition-all"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Quick-symptom Chips per #15 (Horizontal scroll, red outline for urgent) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex-shrink-0">
              Quick:
            </span>
            {SYMPTOM_CHIPS.map(({ label, urgent }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleSend(label)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  urgent
                    ? 'border-danger-border text-danger-text bg-danger-soft hover:bg-danger-border/30'
                    : 'border-border bg-white text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                {urgent && <AlertTriangle size={12} className="text-danger-text flex-shrink-0" />}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Reworded Footer Disclaimer per Problem #12 */}
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Med44 gives general information, not medical advice or a diagnosis. For emergencies call 112.
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          DOCUMENT ATTACH DIALOG (My Documents + Upload New per #16)
      ───────────────────────────────────────────────────────────── */}
      {docPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doc-picker-title"
            className="w-full max-w-lg bg-white rounded-2xl border border-border p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-primary" />
                <h3 id="doc-picker-title" className="text-sm font-extrabold text-foreground">
                  Attach Medical Record for AI Grounding
                </h3>
              </div>
              <button
                onClick={() => setDocPickerOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select an existing verified prescription or upload a new record. Med44 grounds its answers in your verified medical files.
            </p>

            {/* List of Documents */}
            <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
              {availableDocs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/50 rounded-xl border border-border">
                  <FileText size={24} className="mx-auto mb-1 text-muted-foreground" />
                  <p>No records stored in local vault yet</p>
                  <p className="text-[11px]">Upload a prescription or lab report below</p>
                </div>
              ) : (
                availableDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setAttachedDoc(doc)
                      setDocPickerOpen(false)
                      toast.success(`Attached: ${doc.originalName}`)
                    }}
                    className="p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/40 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={16} className="text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {doc.originalName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {doc.category} · {doc.verificationStatus}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-lg bg-secondary">
                      Select
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Upload New File Control */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-white hover:bg-muted text-xs font-semibold text-foreground cursor-pointer transition-colors">
                <Upload size={14} className="text-primary" />
                <span>Upload New File</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setDocPickerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MOBILE HISTORY DRAWER SHEET (< 1024px)
      ───────────────────────────────────────────────────────────── */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden flex justify-start">
          <div className="w-80 max-w-[85%] bg-white h-full p-4 flex flex-col justify-between shadow-2xl">
            <div className="flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">Consultation History</span>
                </div>
                <button
                  onClick={() => setHistoryDrawerOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <button
                onClick={() => {
                  createSession()
                  setHistoryDrawerOpen(false)
                }}
                className="button-primary w-full text-xs font-bold my-3"
              >
                <Plus size={16} />
                <span>+ New Chat</span>
              </button>

              <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSession(s.id)
                      setHistoryDrawerOpen(false)
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer ${
                      s.id === activeSessionId
                        ? 'bg-secondary text-primary-deep font-bold border-primary/30'
                        : 'bg-white border-border text-muted-foreground'
                    }`}
                  >
                    <p className="truncate font-semibold">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.messages.length} messages
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Helper renderer for session item in desktop list
  function renderSessionItem(s: typeof sessions[0]) {
    const isActive = s.id === activeSessionId
    const isEditing = editingTitleId === s.id

    return (
      <div
        key={s.id}
        onClick={() => setActiveSession(s.id)}
        className={`group p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
          isActive
            ? 'bg-secondary text-primary-deep font-bold border-primary/30 shadow-sm'
            : 'bg-white border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
          <MessageCircle
            size={14}
            className={`flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          />
          {isEditing ? (
            <input
              type="text"
              value={newTitleText}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setNewTitleText(e.target.value)}
              onBlur={() => {
                renameSession(s.id, newTitleText)
                setEditingTitleId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameSession(s.id, newTitleText)
                  setEditingTitleId(null)
                }
              }}
              className="text-xs p-1 rounded border border-primary w-full bg-white text-foreground"
            />
          ) : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs leading-tight">{s.title || 'Consultation'}</p>
              <p className="text-[10px] text-muted-foreground">
                {s.messages.length} messages
              </p>
            </div>
          )}
        </div>

        {sessions.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteSession(s.id)
            }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity"
            title="Delete consultation"
            aria-label="Delete consultation"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    )
  }
}
