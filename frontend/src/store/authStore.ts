import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string | number
  name: string
  email: string
  role?: 'patient' | 'doctor' | 'admin'
  avatar?: 'female' | 'male' | 'neutral' | string
  avatar_type?: string
  bloodGroup?: string
  blood_group?: string
  age?: number
  gender?: string
  allergies?: string[] | string
  hasCompletedSurvey?: boolean
  has_completed_survey?: boolean
  healthScore?: number | null
  health_score?: number | null
  heightCm?: number
  weightKg?: number
  chronicConditions?: string[] | string
  pastSurgeries?: string
  familyHistory?: string[] | string
  vaccinations?: string[] | string
  currentMedications?: string[] | string
  lifestyle?: {
    sleepHours?: string
    diet?: string
    exercise?: string
    smokingAlcohol?: string
    stress?: string
  }
  emergencyContact?: {
    name?: string
    phone?: string
  }
  languagePref?: string
  language_pref?: string
}

interface AuthState {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  completeSurvey: (surveyData: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => {
        // Normalize fields
        const normalizedUser: User = {
          ...user,
          avatar: user.avatar || user.avatar_type || 'female',
          hasCompletedSurvey: Boolean(user.hasCompletedSurvey || user.has_completed_survey),
          healthScore: user.healthScore ?? user.health_score ?? null,
        }
        set({ user: normalizedUser, token })
      },
      logout: () => set({ user: null, token: null }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      completeSurvey: (surveyData) =>
        set((state) => {
          if (!state.user) return state
          return {
            user: {
              ...state.user,
              ...surveyData,
              hasCompletedSurvey: true,
              has_completed_survey: true,
            },
          }
        }),
    }),
    {
      name: 'med44-auth',
    }
  )
)
