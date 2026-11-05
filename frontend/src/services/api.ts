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

// ─── Facilities & Providers (PS3 Module 1) ──────────────────────────────────
export const facilityApi = {
  getAll: (params?: {
    q?: string
    facility_type?: string
    service?: string
    language?: string
    accessibility?: string
    lat?: number
    lon?: number
  }) => api.get('/api/facilities', { params }),
  getById: (id: number) => api.get(`/api/facilities/${id}`),
}

// ─── Documents & Referrals (PS3 Module 4, 5, 11) ─────────────────────────────
export const documentApi = {
  getAll: () => api.get('/api/documents'),
  upload: (data: {
    category: string
    title: string
    file_name: string
    file_base64: string
  }) => api.post('/api/documents/upload', data),
  verify: (id: number, verifiedData?: Record<string, unknown>) =>
    api.put(`/api/documents/${id}/verify`, { verified_data: verifiedData || {} }),
  delete: (id: number) => api.delete(`/api/documents/${id}`),
}

// ─── Interactive Care Journey (PS3 Module 6, 9, 10, 13) ──────────────────────
export const journeyApi = {
  getTemplates: () => api.get('/api/journey/templates'),
  getTemplate: (id: string) => api.get(`/api/journey/templates/${id}`),
  getMyProgress: () => api.get('/api/journey/my-progress'),
  selectTemplate: (templateId: string) =>
    api.post('/api/journey/select-template', { template_id: templateId }),
  toggleNode: (nodeId: string) =>
    api.post('/api/journey/toggle-node', { node_id: nodeId }),
  toggleChecklist: (checklistItem: string) =>
    api.post('/api/journey/toggle-checklist', { checklist_item: checklistItem }),
  selectBranch: (nodeId: string, branchChoice: string) =>
    api.post('/api/journey/select-branch', { node_id: nodeId, branch_choice: branchChoice }),
}

// ─── Recovery & Symptom Tracker (PS3 Module 12) ──────────────────────────────
export const progressApi = {
  getJournal: () => api.get('/api/progress/journal'),
  logSymptom: (data: {
    severity_scale: number
    symptoms_reported: string[]
    perceived_change: string
    daily_notes?: string
    care_plan_tasks_completed?: number
    care_plan_tasks_total?: number
  }) => api.post('/api/progress/journal', data),
  getSummary: () => api.get('/api/progress/summary'),
}

// ─── Human Escalation & Support Tickets (PS3 Module 8) ───────────────────────
export const supportApi = {
  getTickets: () => api.get('/api/support/tickets'),
  createTicket: (data: {
    ticket_type: string
    subject: string
    description: string
    facility_id?: number
  }) => api.post('/api/support/tickets', data),
  getTicket: (id: number) => api.get(`/api/support/tickets/${id}`),
}

export default api
