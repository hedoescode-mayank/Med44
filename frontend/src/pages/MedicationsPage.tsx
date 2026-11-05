import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Pill, Info, AlertTriangle, Plus } from 'lucide-react'
import { useMedicationStore } from '../store/medicationStore'
import MedicineCard from '../components/MedicineCard'
import toast from 'react-hot-toast'

const MEDICINE_DB: Record<string, { name: string; usage: string; sideEffects: string[]; category: string }> = {
  paracetamol: {
    name: 'Paracetamol (Acetaminophen)',
    usage: 'Pain relief and fever reduction. Commonly used for headaches, toothaches, colds, and flu.',
    sideEffects: ['Liver damage (overdose)', 'Nausea', 'Allergic reaction (rare)'],
    category: 'Analgesic / Antipyretic',
  },
  ibuprofen: {
    name: 'Ibuprofen',
    usage: 'Anti-inflammatory, pain relief. Used for arthritis, muscle pain, menstrual cramps, fever.',
    sideEffects: ['Stomach upset', 'Dizziness', 'Kidney effects', 'Increased blood pressure'],
    category: 'NSAID',
  },
  amoxicillin: {
    name: 'Amoxicillin',
    usage: 'Antibiotic for bacterial infections — ear, throat, urinary tract, skin.',
    sideEffects: ['Diarrhea', 'Rash', 'Nausea', 'Allergic reaction'],
    category: 'Antibiotic',
  },
  omeprazole: {
    name: 'Omeprazole',
    usage: 'Proton pump inhibitor for acid reflux, GERD, stomach ulcers.',
    sideEffects: ['Headache', 'Diarrhea', 'Bone fracture risk (long-term)', 'Magnesium deficiency'],
    category: 'PPI',
  },
}

export default function MedicationsPage() {
  const navigate = useNavigate()
  const { medications, toggleReminder } = useMedicationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | number | null>(null)
  const [dbSearch, setDbSearch] = useState('')
  const [dbResult, setDbResult] = useState<typeof MEDICINE_DB[string] | null>(null)
  const [dbSearched, setDbSearched] = useState(false)

  const filtered = medications.filter(
    (m) =>
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.genericName || m.generic_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDbSearch = () => {
    const key = dbSearch.toLowerCase().trim()
    const result = Object.entries(MEDICINE_DB).find(([k]) => key.includes(k))
    setDbResult(result ? result[1] : null)
    setDbSearched(true)
  }

  const hasInteractions = medications.some((m) => m.interactions && m.interactions.length > 0)

  return (
    <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-textSecondary hover:text-textDark mb-1 transition-colors"
            >
              <span>← Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-textDark">Medications</h1>
            <p className="text-textMuted mt-1">Manage your prescriptions and reminders</p>
          </div>
          <button
            onClick={() => toast('Add Medication — Coming Soon')}
            className="flex items-center gap-2 btn-primary text-sm py-2.5"
          >
            <Plus size={16} />
            Add Med
          </button>
        </div>

        {/* Drug interaction warning */}
        {hasInteractions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-700">Drug Interaction Warning</p>
              <p className="text-sm text-red-500 mt-0.5">
                Some of your medications may have interactions. Please consult your physician before combining medications.
              </p>
            </div>
          </motion.div>
        )}

        {/* Clinician review notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
          <Info size={18} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-600">
            <strong>Clinician Review Notice:</strong> All medication information is for reference only. 
            Please verify with your prescribing physician before making any changes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Prescriptions list */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                  type="text"
                  placeholder="Search medications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-textMuted">
                  <Pill size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No medications found</p>
                </div>
              ) : (
                filtered.map((med) => (
                  <MedicineCard
                    key={med.id}
                    medication={med}
                    onToggleReminder={toggleReminder}
                    expanded={expandedId === med.id}
                    onClick={() => setExpandedId(expandedId === med.id ? null : med.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Medicine search */}
          <div className="space-y-4">
            <div className="card border border-gray-100 sticky top-6">
              <h3 className="font-bold text-textDark mb-4 flex items-center gap-2">
                <Search size={16} className="text-primary" />
                Medicine Lookup
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Paracetamol"
                  value={dbSearch}
                  onChange={(e) => setDbSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDbSearch()}
                  className="input-field flex-1 text-sm py-2.5"
                />
                <button
                  onClick={handleDbSearch}
                  className="bg-primary text-white px-3 rounded-xl hover:bg-primary-dark transition-colors flex-shrink-0"
                >
                  <Search size={16} />
                </button>
              </div>

              {dbSearched && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  {dbResult ? (
                    <div className="p-4 bg-background rounded-xl border border-gray-100">
                      <div className="flex items-start gap-2 mb-3">
                        <Pill size={18} className="text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-textDark text-sm">{dbResult.name}</h4>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                            {dbResult.category}
                          </span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">Uses</p>
                        <p className="text-sm text-textDark">{dbResult.usage}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">Side Effects</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dbResult.sideEffects.map((se, i) => (
                            <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              {se}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-textMuted flex items-center gap-1">
                          <Info size={11} />
                          Consult your doctor before taking any medication
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-background rounded-xl border border-gray-100 text-center">
                      <AlertTriangle size={24} className="mx-auto text-amber-400 mb-2" />
                      <p className="text-sm text-textMuted">Medicine not found in local database.</p>
                      <p className="text-xs text-textMuted mt-1">Try: Paracetamol, Ibuprofen, Amoxicillin, Omeprazole</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Quick lookups */}
              {!dbSearched && (
                <div className="mt-4">
                  <p className="text-xs text-textMuted font-medium mb-2">Quick Lookup:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Omeprazole'].map((med) => (
                      <button
                        key={med}
                        onClick={() => { setDbSearch(med); setDbResult(MEDICINE_DB[med.toLowerCase()]); setDbSearched(true) }}
                        className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors font-medium"
                      >
                        {med}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reminder summary */}
            <div className="card border border-gray-100">
              <h3 className="font-bold text-textDark mb-3 text-sm">Today's Reminders</h3>
              {medications.filter((m) => m.hasReminder).length === 0 ? (
                <p className="text-sm text-textMuted">No reminders set</p>
              ) : (
                <div className="space-y-2">
                  {medications
                    .filter((m) => m.hasReminder)
                    .flatMap((m) =>
                      (m.reminderTimes || []).map((t) => ({
                        name: m.name,
                        dosage: m.dosage,
                        time: t,
                      }))
                    )
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((r, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-background rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-textDark truncate">{r.name}</p>
                          <p className="text-xs text-textMuted">{r.dosage}</p>
                        </div>
                        <span className="text-xs font-bold text-primary">{r.time}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
