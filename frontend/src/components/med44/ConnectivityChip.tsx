import { useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useConnectivityStore } from '@/store/connectivityStore'
import { cn } from '@/lib/utils'

interface ConnectivityChipProps {
  variant?: 'topbar' | 'chat' | 'compact'
  className?: string
}

export function ConnectivityChip({ variant = 'topbar', className }: ConnectivityChipProps) {
  const { isOnline, isBackendReachable, checkConnectivity } = useConnectivityStore()

  useEffect(() => {
    checkConnectivity()
    const timer = setInterval(() => checkConnectivity(), 30000)
    return () => clearInterval(timer)
  }, [checkConnectivity])

  const connected = isOnline && isBackendReachable

  if (variant === 'chat') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
          connected
            ? 'bg-secondary text-primary-deep border-border'
            : 'bg-muted text-muted-foreground border-border',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {connected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <Wifi size={13} className="text-primary" aria-hidden="true" />
            <span>Online · AI assistant</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-muted-foreground" aria-hidden="true" />
            <WifiOff size={13} className="text-muted-foreground" aria-hidden="true" />
            <span>Offline · Built-in guidance only</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
        connected
          ? 'bg-secondary text-primary-deep border-border'
          : 'bg-muted text-muted-foreground border-border',
        className
      )}
      role="status"
      aria-live="polite"
      title={connected ? 'System connected to AI supervisor' : 'Offline: Local deterministic clinical engine active'}
    >
      <span
        className={cn('w-2 h-2 rounded-full flex-shrink-0', connected ? 'bg-primary' : 'bg-muted-foreground')}
        aria-hidden="true"
      />
      {connected ? (
        <span className="text-[11px] font-bold">Online</span>
      ) : (
        <span className="text-[11px] font-bold">Offline Mode</span>
      )}
    </div>
  )
}

export default ConnectivityChip
