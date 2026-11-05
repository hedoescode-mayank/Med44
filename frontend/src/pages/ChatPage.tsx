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
  'Mild Fever (100°F)',
  'Dry Cough',
  'Stomach ache after eating',
  'Chest tightness',
  'Fatigue and weakness',
  'Dizziness on standing',
  'Skin Rash / Itching',
]

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
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
    addMessage,
    setLanguage,
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    <div className="h-[calc(100vh-140px)] flex flex-col font-sans">
      {/* Emergency Alert Banner */}
      {emergencyDetected && (
        <div className="mb-4">
          <EmergencyBanner
            onDismiss={clearEmergency}
            message="Emergency Red Flag Detected — Please call 112 immediately or visit the nearest emergency room."
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 card p-0 border border-borderSoft flex flex-col overflow-hidden bg-surface shadow-card">
        {/* Chat Header Bar */}
        <div className="p-4 px-6 border-b border-borderSoft flex items-center justify-between bg-surfaceSoft/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center border border-primary/20 shadow-soft">
              <BabyNurse size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-textDark">Med44 AI Health Nurse</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-light text-primary-dark border border-primary/20">
                  {mode === 'online' ? 'Conversational AI' : 'Deterministic Engine'}
                </span>
              </div>
              <p className="text-[11px] text-textSecondary">
                Personalized for {user?.name?.split(' ')[0] || 'Patient'} · Allergies & vitals safeguarded
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-surface p-1 rounded-lg border border-borderSoft">
            <Globe size={14} className="text-textMuted ml-1.5" />
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  language === lang.code
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-textSecondary hover:text-textDark'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Generate Report Card Button */}
          <button
            onClick={() => setShowReport(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-light hover:bg-primary text-primary-dark hover:text-white transition-all flex items-center gap-1.5 border border-primary/25 shadow-soft ml-2"
            title="Generate comprehensive health report card"
          >
            <FileText size={13} />
            <span className="hidden sm:inline">Report Card</span>
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeSession?.messages && activeSession.messages.length > 0 ? (
            activeSession.messages.map((m) => <ChatMessage key={m.id} message={m} />)
          ) : (
            /* Welcome Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
              <BabyNurse size={120} subtitle="Hello! How are you feeling?" />
              <h3 className="font-bold text-lg text-textDark mt-4">
                Care is just a conversation away
              </h3>
              <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                Describe your symptoms in your own words. I will check them against reviewed clinical
                knowledge, check for red flags, and guide your next steps.
              </p>

              {/* Symptom Quick Chips */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {SYMPTOM_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="px-3 py-1.5 rounded-full bg-surfaceSoft hover:bg-primary-light hover:text-primary-dark border border-borderSoft text-xs font-semibold text-textSecondary transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>
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
                <div className="w-14 h-14 overflow-visible flex-shrink-0 flex items-center justify-center">
                  <BabyNurse size={56} isExplaining={true} badgeText="Explaining" />
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

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-borderSoft bg-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'अपने लक्षण बताएं (उदा. मुझे 2 दिन से सिरदर्द और बुखार है)...'
                  : language === 'ta'
                  ? 'உங்கள் அறிகுறிகளை இங்கே விவரிக்கவும்...'
                  : 'Describe what you are experiencing (e.g. fever and mild cough)...'
              }
              className="input text-sm flex-1"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="button-primary px-5 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <p className="text-[11px] text-textMuted text-center mt-2">
            ⚠️ Med44 provides informational triage only. Not a medical diagnosis. In emergencies, dial 112.
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
