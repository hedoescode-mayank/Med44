import { PhoneCall, AlertOctagon, X, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmergencyBannerProps {
  message?: string
  symptomTrigger?: string
  doctorPhone?: string
  onDismiss?: () => void
  className?: string
}

export function EmergencyBanner({
  message = 'Critical or red-flag symptoms detected. Immediate emergency medical evaluation required.',
  symptomTrigger,
  doctorPhone,
  onDismiss,
  className,
}: EmergencyBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'w-full p-4 rounded-2xl bg-danger-soft border border-danger-border text-danger-text shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-destructive text-white flex-shrink-0 mt-0.5">
            <AlertOctagon size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-danger-text tracking-tight uppercase">
                Emergency Alert Protocol
              </h3>
              {symptomTrigger && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-danger-text border border-danger-border">
                  Flagged: {symptomTrigger}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium mt-1 text-danger-text leading-snug">
              {message}
            </p>
            <p className="text-[11px] text-danger-text/80 mt-1">
              Med44 gives general information, not medical advice or a diagnosis.
            </p>

            {/* Actions: Max one solid red button (Call 112) */}
            <div className="flex flex-wrap items-center gap-2.5 mt-3">
              <a
                href="tel:112"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-extrabold text-xs shadow-soft transition-all"
              >
                <PhoneCall size={15} aria-hidden="true" />
                <span>Call 112 Immediately</span>
              </a>

              {doctorPhone && (
                <a
                  href={`tel:${doctorPhone}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-muted text-foreground border border-border font-bold text-xs transition-colors"
                >
                  <UserCheck size={14} className="text-primary" aria-hidden="true" />
                  <span>Call My Doctor</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-danger-text/70 hover:text-danger-text hover:bg-danger-border/40 transition-colors"
            aria-label="Dismiss emergency notice"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

export default EmergencyBanner
