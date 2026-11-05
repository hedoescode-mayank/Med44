import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: offline fallback
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error — offline
      const cached = sessionStorage.getItem(`cache:${error.config.url}`)
      if (cached) {
        return Promise.resolve({ data: JSON.parse(cached), fromCache: true })
      }
    }
    return Promise.reject(error)
  }
)

// Cache successful GET responses
api.interceptors.response.use((response) => {
  if (response.config.method === 'get' && response.data) {
    sessionStorage.setItem(`cache:${response.config.url}`, JSON.stringify(response.data))
  }
  return response
})

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/api/auth/register', { name, email, password }),
  demoLogin: () => api.post('/api/auth/demo'),
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  sendMessage: (message: string, language: string, sessionId: string) =>
    api.post('/api/chat', { message, language, session_id: sessionId }),
  getHistory: (sessionId: string) =>
    api.get(`/api/chat/history/${sessionId}`),
}

// ─── Appointments ────────────────────────────────────────────────────────────
export const appointmentApi = {
  getAll: () => api.get('/api/appointments'),
  book: (data: {
    doctorId: string
    date: string
    time: string
    notes?: string
  }) => api.post('/api/appointments', data),
  cancel: (id: string) => api.patch(`/api/appointments/${id}/cancel`),
  getDoctors: (specialty?: string) =>
    api.get('/api/doctors', { params: { specialty } }),
}

// ─── Medications ─────────────────────────────────────────────────────────────
export const medicationApi = {
  getAll: () => api.get('/api/medications'),
  search: (query: string) => api.get('/api/medications/search', { params: { q: query } }),
  getInfo: (name: string) => api.get(`/api/medications/info/${name}`),
  addReminder: (id: string, times: string[]) =>
    api.post(`/api/medications/${id}/reminder`, { times }),
}

// ─── Profile ─────────────────────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get('/api/profile'),
  update: (data: Record<string, unknown>) => api.put('/api/profile', data),
}

export default api
