import { create } from 'zustand'
import api from '../services/api'

interface ConnectivityState {
  isOnline: boolean
  isBackendReachable: boolean
  lastChecked: number
  checkConnectivity: () => Promise<boolean>
}

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isBackendReachable: true,
  lastChecked: Date.now(),

  checkConnectivity: async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ isOnline: false, isBackendReachable: false, lastChecked: Date.now() })
      return false
    }

    try {
      const res = await api.get('/health', { timeout: 3500 })
      const ok = res.status === 200
      set({ isOnline: true, isBackendReachable: ok, lastChecked: Date.now() })
      return ok
    } catch {
      // Offline fallback: backend is unreachable
      set({ isOnline: true, isBackendReachable: false, lastChecked: Date.now() })
      return false
    }
  },
}))

// Auto-bind browser online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useConnectivityStore.getState().checkConnectivity()
  })
  window.addEventListener('offline', () => {
    useConnectivityStore.setState({ isOnline: false, isBackendReachable: false, lastChecked: Date.now() })
  })
}

