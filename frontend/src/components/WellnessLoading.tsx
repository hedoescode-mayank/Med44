interface WellnessLoadingProps {
  message?: string
  variant?: 'breathing' | 'pulse' | 'skeleton'
  className?: string
}

export default function WellnessLoading({
  message = 'Healing thoughts in progress...',
  variant = 'breathing',
  className = '',
}: WellnessLoadingProps) {
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-24 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <svg viewBox="0 0 200 60" className="w-48 h-16" fill="none">
          <path
            d="M10 30 H60 L75 10 L90 50 L105 20 L120 40 L135 30 H190"
            stroke="#287B55"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
          />
        </svg>
        <p className="mt-3 text-sm font-semibold text-textSecondary">{message}</p>
      </div>
    )
  }

  // Breathing circle (default)
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Outer gentle ripple */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary/20 via-accent/20 to-primary/10 animate-breathing flex items-center justify-center">
          {/* Inner heart/core */}
          <div className="w-12 h-12 rounded-full bg-white shadow-card flex items-center justify-center border border-borderSoft">
            <span className="text-xl">🌿</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-primary">{message}</p>
      <span className="text-xs text-textMuted mt-1">Inhale calm · Exhale stress</span>
    </div>
  )
}

