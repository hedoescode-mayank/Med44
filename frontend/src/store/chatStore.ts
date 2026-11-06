import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'en' | 'hi' | 'ta'
export type ChatMode = 'online' | 'offline'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date | string
  isEmergency?: boolean
  language?: Language
  urgency?: string
  metadata?: any
  docAttachment?: { title: string; category?: string }
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
}

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  mode: ChatMode
  language: Language
  isTyping: boolean
  emergencyDetected: boolean
  createSession: () => string
  setActiveSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, newTitle: string) => void
  addMessage: (sessionId: string, message: Message) => void
  setMode: (mode: ChatMode) => void
  setLanguage: (lang: Language) => void
  setTyping: (typing: boolean) => void
  setEmergency: (val: boolean) => void
  clearEmergency: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      mode: 'online', // Default to online conversational assistant if available
      language: 'en',
      isTyping: false,
      emergencyDetected: false,

      createSession: () => {
        const id = `session-${Date.now()}`
        const session: ChatSession = {
          id,
          title: 'New Health Consultation',
          messages: [],
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: id,
        }))
        return id
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      deleteSession: (id) =>
        set((state) => {
          const filtered = state.sessions.filter((s) => s.id !== id)
          return {
            sessions: filtered,
            activeSessionId:
              state.activeSessionId === id
                ? filtered[0]?.id || null
                : state.activeSessionId,
          }
        }),

      renameSession: (id, newTitle) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, title: newTitle.trim() || s.title } : s
          ),
        })),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s

            // Auto-title from first user message (Problem #10)
            let updatedTitle = s.title
            const isFirstUserMsg =
              message.role === 'user' &&
              s.messages.filter((m) => m.role === 'user').length === 0

            if (isFirstUserMsg) {
              const snippet = message.content.replace(/\n/g, ' ').trim()
              updatedTitle = snippet.length > 40 ? `${snippet.slice(0, 37)}...` : snippet
            }

            return {
              ...s,
              title: updatedTitle,
              messages: [...s.messages, message],
            }
          }),
        })),

      setMode: (mode) => set({ mode }),
      setLanguage: (language) => set({ language }),
      setTyping: (isTyping) => set({ isTyping }),
      setEmergency: (emergencyDetected) => set({ emergencyDetected }),
      clearEmergency: () => set({ emergencyDetected: false }),
    }),
    {
      name: 'med44-chat',
      partialize: (state) => ({
        sessions: state.sessions.slice(0, 25),
        activeSessionId: state.activeSessionId,
        mode: state.mode,
      }),
    }
  )
)
