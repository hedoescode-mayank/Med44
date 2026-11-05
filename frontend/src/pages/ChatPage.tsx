import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Plus,
  MessageCircle,
  Globe,
  Trash2,
  Stethoscope,
  ShieldAlert,
  Sparkles,
  Heart,
  FileText,
  Wifi,
  WifiOff,
  Cpu,
} from 'lucide-react'
import { useChatStore, type Language, type Message } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import ChatMessage from '../components/ChatMessage'
import EmergencyBanner from '../components/EmergencyBanner'
import BabyNurse from '../components/BabyNurse'
import HealthReportModal from '../components/HealthReportModal'
import api from '../services/api'
import toast from 'react-hot-toast'

const SYMPTOM_CHIPS = [
  'Headache',
  'Fever',
  'Cough',
  'Stomach pain',
  'Chest tightness',
  'Fatigue',
  'Skin Rash',
]

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'GB English', flag: '🇬🇧' },
  { code: 'hi', label: 'IN Hindi', flag: '🇮🇳' },
  { code: 'ta', label: 'IN Tamil', flag: '🇮🇳' },
]

export default function ChatPage() {
  const [input, setInput] = useState('')
  const [showReport, setShowReport] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    addMessage,
    setLanguage,
    setMode,
    setTyping,
    setEmergency,
    clearEmergency,
  } = useChatStore()

  const { user } = useAuthStore()

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  useEffect(() => {
    if (!activeSessionId && sessions.length === 0) {
      createSession()
    } else if (!activeSessionId && sessions.length > 0) {
      setActiveSession(sessions[0].id)
    }
  }, [])

  useEffect(() => {
    // block: 'nearest' ensures ONLY this container scrolls, NEVER parent windows or header
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeSession?.messages, isTyping])

  // Personalized Calming Thinking State text
  const getThinkingText = () => {
    if (language === 'hi') {
      return 'Mast raho, abhi batata hu 😊 sab accha hai — all is well 🌿'
    }
    if (language === 'ta') {
      return 'அமைதியாக இருங்கள், இதோ பதிலளிக்கிறேன் 😊 எல்லாம் நலம் 🌿'
    }
    return 'Mast raho, abhi batata hu 😊 sab accha hai — all is well 🌿'
  }

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg) return

    let currentSessionId = activeSessionId
    if (!currentSessionId) {
      currentSessionId = createSession()
    }

    sendToSession(currentSessionId, msg)
    setInput('')
  }

  const sendToSession = async (sessionId: string, text: string) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    addMessage(sessionId, userMsg)
    setTyping(true)

    // Build personalized payload including patient survey context
    const patientContext = {
      allergies: user?.allergies,
      chronic_conditions: user?.chronicConditions,
      current_medications: user?.currentMedications,
      age: user?.age,
      gender: user?.gender,
    }

    try {
      const res = await api.post('/chat', {
        message: text,
        language: language || user?.languagePref || 'en',
        history: (activeSession?.messages || []).slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        patient_context: patientContext,
      })

      const data = res.data
      const isRedFlag = data.urgency === 'RED' || (data.red_flags && data.red_flags.length > 0)
      if (isRedFlag) {
        setEmergency(true)
      } else {
        clearEmergency()
      }

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.clinical_advice || 'I have analyzed your symptoms against reviewed guidelines.',
        timestamp: new Date().toISOString(),
        isEmergency: isRedFlag,
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
      // Local fallback
      const isEmergency = /chest pain|can't breathe|stroke|bleeding/i.test(text)
      if (isEmergency) setEmergency(true)

      const fallbackMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: isEmergency
          ? '🚨 EMERGENCY DETECTED: Call 112 immediately. Chest pain or severe shortness of breath requires immediate emergency evaluation.'
          : `I have recorded your symptoms. Based on reviewed clinical guidance, stay hydrated, monitor symptoms closely, and consult a doctor if condition persists.\n\n⚠️ Med44 provides informational triage only. Not a medical diagnosis.`,
        timestamp: new Date().toISOString(),
        isEmergency,
      }
      addMessage(sessionId, fallbackMsg)
    } finally {
      setTyping(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-4 overflow-hidden font-sans select-none-safe">
      {/* Emergency Alert Banner Overlay */}
      {emergencyDetected && (
        <div className="absolute top-2 left-6 right-6 z-50">
          <EmergencyBanner
            onDismiss={clearEmergency}
            message="Emergency Red Flag Detected — Please call 112 immediately or visit the nearest emergency room."
          />
        </div>
      )}

      {/* Middle Pane: Chat Sessions Sidebar (Desktop only) */}
      <div className="w-64 xl:w-72 hidden md:flex flex-col bg-surface border border-borderSoft rounded-2xl p-4 shadow-sm h-full flex-shrink-0 justify-between overflow-hidden">
        <div className="flex flex-col min-h-0 flex-1">
          {/* New Chat Button */}
          <button
            onClick={() => createSession()}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-400 hover:opacity-95 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition flex-shrink-0"
          >
            <Plus size={16} />
            <span>+ New Chat</span>
          </button>

          {/* Mode Indicator Pill */}
          <div className="mt-3 p-2.5 rounded-xl bg-surfaceSoft border border-borderSoft flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-primary" />
              <span className="font-semibold text-textDark text-[11px]">
                {mode === 'online' ? 'Conversational AI' : 'Offline Mode (Clinical)'}
              </span>
            </div>
            <button
              onClick={() => {
                const nextMode = mode === 'online' ? 'offline' : 'online'
                setMode(nextMode)
                toast.success(`Switched to ${nextMode} mode`)
              }}
              className="text-[10px] text-primary hover:underline font-bold"
              title="Toggle intelligence mode"
            >
              Switch
            </button>
          </div>

          {/* Sessions List */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-1.5 pr-1">
            <p className="text-[10px] uppercase font-bold text-textMuted tracking-wider px-2">
              Recent Consultations
            </p>
            {sessions.map((s) => {
              const isActive = s.id === activeSessionId
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSession(s.id)}
                  className={`group p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    isActive
                      ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold shadow-sm'
                      : 'bg-white border-borderSoft text-textSecondary hover:bg-surfaceSoft'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle size={14} className={isActive ? 'text-primary' : 'text-textMuted'} />
                    <div className="min-w-0">
                      <p className="truncate text-xs">{s.title || 'Chat'}</p>
                      <p className="text-[10px] text-textMuted">
                        {s.messages.length} messages
                      </p>
                    </div>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(s.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-red-500 p-1 transition"
                      title="Delete chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Language Selector */}
        <div className="pt-3 border-t border-borderSoft flex-shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5 text-xs text-textSecondary font-semibold">
            <Globe size={13} className="text-primary" />
            <span>Language</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold text-center transition ${
                  language === lang.code
                    ? 'bg-primary text-white shadow-soft'
                    : 'bg-surfaceSoft text-textSecondary hover:bg-gray-100'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Pane: Active Chat Room (100% Fixed Frame) */}
      <div className="flex-1 h-full flex flex-col bg-surface border border-borderSoft rounded-2xl shadow-sm overflow-hidden">
        {/* Chat Top Header Bar (Fixed) */}
        <div className="p-3.5 px-5 border-b border-borderSoft flex items-center justify-between bg-surfaceSoft/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center border border-primary/20 shadow-soft">
              <BabyNurse size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-textDark">NOVA CARE AI</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Online</span>
                </span>
              </div>
              <p className="text-[11px] text-textSecondary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Offline Mode (Clinical Engine Active)</span>
              </p>
            </div>
          </div>

          {/* Right Header Action: Report Card Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReport(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-light hover:bg-primary text-primary-dark hover:text-white transition-all flex items-center gap-1.5 border border-primary/25 shadow-soft"
              title="Generate comprehensive health report card"
            >
              <FileText size={13} />
              <span className="hidden sm:inline">Report Card</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeSession?.messages && activeSession.messages.length > 0 ? (
            activeSession.messages.map((m) => <ChatMessage key={m.id} message={m} />)
          ) : (
            /* Welcome Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
              <BabyNurse size={110} subtitle="Hello! How are you feeling today?" />
              <h3 className="font-bold text-base text-textDark mt-3">
                Care is just a conversation away
              </h3>
              <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                Describe your symptoms in your own words. I will check them against reviewed clinical
                knowledge, flag red flags, and guide your next steps.
              </p>
            </div>
          )}

          {/* AI Thinking State with Zoom-in & Slide-up Animated Baby Nurse Scanner */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="flex items-end gap-3.5 my-2"
              >
                <div className="w-12 h-12 overflow-visible flex-shrink-0 flex items-center justify-center">
                  <BabyNurse size={48} isExplaining={true} badgeText="Explaining" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gradient-to-r from-primary-light/70 to-accent-light/50 border border-primary/25 text-textDark text-xs font-semibold shadow-soft flex items-center gap-2.5">
                  <Heart size={16} className="text-accent-dark animate-pulse-heart flex-shrink-0" />
                  <span>{getThinkingText()}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Fixed Area: Symptom Chips + Rounded Input Bar */}
        <div className="p-3 sm:p-4 border-t border-borderSoft bg-surface flex-shrink-0 space-y-2.5">
          {/* Quick Symptom Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {SYMPTOM_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="px-3 py-1 rounded-full bg-surfaceSoft hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-borderSoft text-xs font-medium text-textSecondary whitespace-nowrap transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Pill Shaped Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 rounded-full border border-borderSoft bg-white p-1 pl-4 shadow-sm focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary transition"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'अपने लक्षण बताएं (उदा. मुझे सिरदर्द और बुखार है)...'
                  : language === 'ta'
                  ? 'உங்கள் அறிகுறிகளை இங்கே விவரிக்கவும்...'
                  : 'Describe your symptoms...'
              }
              className="outline-none bg-transparent flex-1 text-xs sm:text-sm text-textDark placeholder-textMuted py-2"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-600 to-rose-400 hover:opacity-95 text-white flex items-center justify-center shadow-md transition disabled:opacity-40 disabled:scale-100 active:scale-95 flex-shrink-0"
              title="Send message"
            >
              <Send size={15} />
            </button>
          </form>

          {/* Safety Disclaimer Footer */}
          <p className="text-[10px] text-textMuted text-center">
            Med44 AI provides guidance only. Always consult a doctor for medical advice.
          </p>
        </div>
      </div>

      {/* Health Report Card Modal */}
      <HealthReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />
    </div>
  )
}
