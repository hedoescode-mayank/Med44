import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export interface Medication {
  id: string | number
  name: string
  generic_name?: string
  genericName?: string
  dosage: string
  frequency: string
  duration?: string
  prescriber?: string
  prescribedBy?: string
  start_date?: string
  startDate?: string
  is_active?: boolean
  side_effects?: string
  warnings?: string[]
  interactions?: string[]
  category?: string
  instructions?: string
  hasReminder?: boolean
  reminderTimes?: string[]
}

interface MedicationState {
  medications: Medication[]
  reminders: { medicationId: string | number; time: string }[]
  fetchPrescriptions: () => Promise<void>
  addMedication: (med: Medication) => Promise<void>
  removeMedication: (id: string | number) => Promise<void>
  toggleReminder: (id: string | number) => void
  addReminder: (medicationId: string | number, time: string) => void
}

export const useMedicationStore = create<MedicationState>()(
  persist(
    (set, get) => ({
      // Real data starts EMPTY - no fake hardcoded medications!
      medications: [],
      reminders: [],

      fetchPrescriptions: async () => {
        try {
          const res = await api.get('/medications/user/prescriptions')
          if (Array.isArray(res.data)) {
            set({ medications: res.data })
          }
        } catch {}
      },

      addMedication: async (med) => {
        try {
          const res = await api.post('/medications/user/prescriptions', {
            medication_name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            prescriber: med.prescriber || med.prescribedBy || 'Treating Physician',
          })
          if (res.data) {
            set((state) => ({ medications: [res.data, ...state.medications] }))
            return
          }
        } catch {}
        set((state) => ({ medications: [med, ...state.medications] }))
      },

      removeMedication: async (id) => {
        try {
          await api.delete(`/medications/user/prescriptions/${id}`).catch(() => {})
        } catch {}
        set((state) => ({
          medications: state.medications.filter((m) => m.id !== id),
          reminders: state.reminders.filter((r) => r.medicationId !== id),
        }))
      },

      toggleReminder: (id) =>
        set((state) => ({
          medications: state.medications.map((m) =>
            m.id === id ? { ...m, hasReminder: !m.hasReminder } : m
          ),
        })),

      addReminder: (medicationId, time) =>
        set((state) => ({
          reminders: [...state.reminders, { medicationId, time }],
          medications: state.medications.map((m) =>
            m.id === medicationId ? { ...m, hasReminder: true } : m
          ),
        })),
    }),
    {
      name: 'med44-medications-v2',
    }
  )
)
