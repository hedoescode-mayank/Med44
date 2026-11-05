import { motion } from 'framer-motion'
import { Bell, BellOff, AlertTriangle, Info, Pill } from 'lucide-react'
import type { Medication } from '../store/medicationStore'

interface MedicineCardProps {
  medication: Medication
  onToggleReminder: (id: string) => void
  expanded?: boolean
  onClick?: () => void
}

export default function MedicineCard({
  medication,
  onToggleReminder,
  expanded = false,
  onClick,
}: MedicineCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="card border border-gray-100 cursor-pointer transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center flex-shrink-0">
          <Pill size={22} className="text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-textDark">{medication.name}</h3>
              <p className="text-textMuted text-sm">{medication.genericName}</p>
            </div>
            <span className="badge bg-primary/10 text-primary flex-shrink-0">
              {medication.category}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <p className="text-xs text-textMuted">Dosage</p>
              <p className="text-sm font-semibold text-textDark">{medication.dosage}</p>
            </div>
            <div>
              <p className="text-xs text-textMuted">Frequency</p>
              <p className="text-sm font-semibold text-textDark">{medication.frequency}</p>
            </div>
            <div>
              <p className="text-xs text-textMuted">Duration</p>
              <p className="text-sm font-semibold text-textDark">{medication.duration}</p>
            </div>
          </div>

          {/* Warnings */}
          {(medication.warnings || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(medication.warnings || []).map((w, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"
                >
                  <AlertTriangle size={10} />
                  {w}
                </span>
              ))}
            </div>
          )}

          {/* Drug interactions */}
          {medication.interactions && medication.interactions.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                <AlertTriangle size={11} /> Drug Interactions:
              </p>
              <p className="text-xs text-red-500 mt-0.5">{medication.interactions.join(', ')}</p>
            </div>
          )}

          {/* Instructions */}
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
            >
              <p className="text-xs text-blue-600 font-semibold flex items-center gap-1 mb-1">
                <Info size={11} /> Instructions
              </p>
              <p className="text-xs text-blue-500">{medication.instructions}</p>
              <p className="text-xs text-blue-400 mt-1">
                Prescribed by: {medication.prescribedBy}
              </p>
            </motion.div>
          )}

          {/* Clinician notice */}
          <div className="mt-2 text-xs text-textMuted flex items-center gap-1">
            <Info size={11} />
            Always consult your clinician before changing dosage
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs text-textMuted">Started: {medication.startDate}</div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleReminder(String(medication.id))
          }}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
            medication.hasReminder
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'bg-gray-100 text-textMuted hover:bg-gray-200'
          }`}
        >
          {medication.hasReminder ? (
            <>
              <Bell size={13} className="fill-current" /> Reminder On
            </>
          ) : (
            <>
              <BellOff size={13} /> Add Reminder
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
