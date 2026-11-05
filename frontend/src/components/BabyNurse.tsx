import { motion } from 'framer-motion'

interface BabyNurseProps {
  className?: string
  size?: number
  isScanning?: boolean
  isExplaining?: boolean
  transparent?: boolean
  subtitle?: string
  badgeText?: string
}

export default function BabyNurse({
  className = '',
  size = 180,
  isScanning = false,
  isExplaining = false,
  transparent = true,
  subtitle,
  badgeText,
}: BabyNurseProps) {
  // Use the verified animated SVG from public folder
  const svgSrc = transparent
    ? '/med44_baby_nurse_scan_animated_transparent.svg'
    : '/med44_baby_nurse_scan_animated.svg'

  const activeExplaining = isExplaining || isScanning

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Container with zoom-in and slide-up animation when explaining or answering */}
      <motion.div
        initial={false}
        animate={
          activeExplaining
            ? {
                scale: [1, 1.08, 1.03, 1.08, 1],
                y: [0, -9, -3, -9, 0],
                rotate: [0, -1.2, 1.2, -0.8, 0],
              }
            : {
                scale: 1,
                y: 0,
                rotate: 0,
              }
        }
        transition={{
          duration: 3,
          repeat: activeExplaining ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Soft background pulse halo when actively explaining */}
        {activeExplaining && (
          <motion.div
            initial={{ opacity: 0.3, scale: 0.9 }}
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.95, 1.15, 0.95] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-light via-accent-light to-transparent blur-md -z-10"
          />
        )}

        {/* Animated SVG mascot */}
        <img
          src={svgSrc}
          alt="Med44 Baby Nurse Scanner"
          className="w-full h-full object-contain filter drop-shadow-sm pointer-events-none select-none"
          loading="eager"
        />

        {/* Speaking indicator tag */}
        {activeExplaining && badgeText && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute -bottom-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white shadow-soft"
          >
            {badgeText}
          </motion.span>
        )}
      </motion.div>

      {/* Subtitle / Status prompt below */}
      {subtitle && (
        <div className="mt-3 text-center">
          <p className="text-xs font-semibold text-textSecondary">{subtitle}</p>
        </div>
      )}
    </div>
  )
}
