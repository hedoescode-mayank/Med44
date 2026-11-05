import { useState, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

interface OfflineIndicatorProps {
  inline?: boolean
  className?: string
}

export default function OfflineIndicator({ inline = false, className = '' }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (inline) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isOnline
            ? 'bg-primary-light/60 text-primary-dark border-primary/20'
            : 'bg-accent-light text-accent-dark border-accent/30'
        } ${className}`}
      >
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-danger'}`} />
        <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
      </div>
    )
  }

  return (
    <div
      className={`fixed top-4 right-6 z-40 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-soft border ${
        isOnline
          ? 'bg-white/95 text-primary border-primary/20 backdrop-blur'
          : 'bg-accent text-white border-transparent'
      } ${className}`}
    >
      {isOnline ? (
        <>
          <Wifi size={13} className="text-primary" />
          <span>Online</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </>
      ) : (
        <>
          <WifiOff size={13} />
          <span>Offline (Deterministic)</span>
        </>
      )}
    </div>
  )
}
