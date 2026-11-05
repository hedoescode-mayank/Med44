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
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date | string
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
      mode: 'offline',
      language: 'en',
      isTyping: false,
      emergencyDetected: false,

      createSession: () => {
        const id = `session-${Date.now()}`
        const session: ChatSession = {
          id,
          title: `Chat ${new Date().toLocaleDateString()}`,
          messages: [],
          createdAt: new Date(),
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

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, message] }
              : s
          ),
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
        sessions: state.sessions.slice(0, 20),
        language: state.language,
        mode: state.mode,
      }),
    }
  )
)
