import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Phone } from 'lucide-react'

interface EmergencyBannerProps {
  onDismiss: () => void
  message?: string
}

export default function EmergencyBanner({ onDismiss, message }: EmergencyBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-6 py-3 shadow-xl"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-red-700 rounded-full animate-pulse">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="font-bold text-lg">⚠️ Emergency Detected!</p>
              <p className="text-red-100 text-sm">
                Symptoms suggest a medical emergency. Please call emergency services immediately.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="tel:112"
              className="flex items-center gap-2 bg-white text-red-600 font-bold px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
            >
              <Phone size={16} />
              Call 112
            </a>
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-red-700 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
