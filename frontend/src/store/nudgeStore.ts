import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NudgeState {
  medicineStreak: number
  lastTakenDate: string | null
  todayMedTaken: boolean
  healthXP: number
  answeredChecks: Record<string, string> // date -> checkId
  takeMedicine: () => { streak: number; isNew: boolean }
  skipMedicine: () => void
  recordAnswer: (questionId: string, answer: string) => void
  resetStreakIfBroken: () => void
}

const getTodayDateStr = () => new Date().toISOString().split('T')[0]

export const useNudgeStore = create<NudgeState>()(
  persist(
    (set, get) => ({
      medicineStreak: 4, // Default active streak for high engagement feel
      lastTakenDate: null,
      todayMedTaken: false,
      healthXP: 140,
      answeredChecks: {},

      takeMedicine: () => {
        const today = getTodayDateStr()
        const state = get()
        if (state.lastTakenDate === today && state.todayMedTaken) {
          return { streak: state.medicineStreak, isNew: false }
        }

        const newStreak = state.medicineStreak + 1
        set({
          medicineStreak: newStreak,
          lastTakenDate: today,
          todayMedTaken: true,
          healthXP: state.healthXP + 25,
        })
        return { streak: newStreak, isNew: true }
      },

      skipMedicine: () => {
        set({ todayMedTaken: false })
      },

      recordAnswer: (questionId, answer) => {
        const today = getTodayDateStr()
        set((state) => ({
          healthXP: state.healthXP + 10,
          answeredChecks: {
            ...state.answeredChecks,
            [`${today}_${questionId}`]: answer,
          },
        }))
      },

      resetStreakIfBroken: () => {
        const today = getTodayDateStr()
        const state = get()
        if (!state.lastTakenDate) return

        const last = new Date(state.lastTakenDate).getTime()
        const curr = new Date(today).getTime()
        const diffDays = Math.round((curr - last) / (1000 * 3600 * 24))

        if (diffDays > 1) {
          // Streak broke (missed a day)
          set({ medicineStreak: 1, todayMedTaken: false })
        } else if (diffDays === 0) {
          set({ todayMedTaken: true })
        } else {
          set({ todayMedTaken: false })
        }
      },
    }),
    {
      name: 'med44-duolingo-nudge-streak',
    }
  )
)

/**
 * Native Web Audio harmonic chime (Duolingo-inspired 4-note victory arpeggio)
 * Fully offline, no external audio files required.
 */
export const playDuolingoChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.07)
      gain.gain.setValueAtTime(0.15, now + i * 0.07)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.07)
      osc.stop(now + i * 0.07 + 0.3)
    })
  } catch {}
}

