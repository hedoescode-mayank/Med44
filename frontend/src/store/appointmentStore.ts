import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export interface Doctor {
  id: string | number
  name: string
  specialty: string
  rating: number
  reviewCount?: number
  avatar?: string
  availableSlots?: string[]
  available_slots?: string[]
  experience?: number
  fee?: number
  hospital?: string
  location?: string
}

export interface Appointment {
  id: string | number
  doctorId?: string | number
  doctor_name: string
  doctorName?: string
  specialty?: string
  appointment_date: string
  date?: string
  slot_time: string
  time?: string
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'confirmed' | 'pending' | 'cancelled' | 'completed'
  notes?: string
  queue_token?: string
  facility_id?: number
  facility_name?: string
  is_synced?: boolean
  isOfflineQueued?: boolean
}

interface AppointmentState {
  appointments: Appointment[]
  offlineQueue: Appointment[]
  fetchAppointments: () => Promise<void>
  addAppointment: (appt: Appointment) => void
  updateStatus: (id: string | number, status: Appointment['status']) => void
  cancelAppointment: (id: string | number) => void
  queueOffline: (appt: Appointment) => void
  syncOfflineQueue: () => Promise<void>
}

export const useAppointmentStore = create<AppointmentState>()(
  persist(
    (set, get) => ({
      // Real data starts EMPTY - no fake hardcoded records!
      appointments: [],
      offlineQueue: [],

      fetchAppointments: async () => {
        try {
          const res = await api.get('/appointments')
          if (Array.isArray(res.data)) {
            set({ appointments: res.data })
          }
        } catch {
          // If offline, existing persisted appointments remain
        }
      },

      addAppointment: (appt) =>
        set((state) => ({ appointments: [appt, ...state.appointments] })),

      updateStatus: (id, status) =>
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        })),

      cancelAppointment: async (id) => {
        try {
          await api.delete(`/appointments/${id}`).catch(() => {})
        } catch {}
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, status: 'CANCELLED' } : a
          ),
        }))
      },

      queueOffline: (appt) =>
        set((state) => ({
          offlineQueue: [...state.offlineQueue, appt],
          appointments: [appt, ...state.appointments],
        })),

      syncOfflineQueue: async () => {
        const { offlineQueue } = get()
        if (offlineQueue.length === 0) return

        try {
          await api.post('/appointments/sync', offlineQueue)
          set({ offlineQueue: [] })
          get().fetchAppointments()
        } catch {}
      },
    }),
    {
      name: 'med44-appointments-v2',
    }
  )
)
