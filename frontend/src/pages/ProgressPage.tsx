import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { progressApi } from '../services/api'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  ShieldAlert,
  Send,
  HelpCircle,
  FileCheck2,
  Stethoscope
} from 'lucide-react'

interface JournalEntry {
  id: number
  entry_date: string
  severity_scale: number
  symptoms_reported: string[]
  perceived_change: string
  daily_notes?: string
  care_plan_tasks_completed: number
  care_plan_tasks_total: number
  clinician_review_status: string
  escalation_triggered: boolean
}

interface ProgressSummary {
  care_plan_completion_rate: number
  patient_reported_symptom_trend: string
  clinician_review_status: string
  follow_up_status: string
  disclaimer: string
  recent_journals: JournalEntry[]
}

const COMMON_SYMPTOMS = [
  'Headache',
  'Fever',
  'Toothache / Jaw Pain',
  'Cough',
  'Fatigue',
  'Sore Throat',
  'Nausea',
  'Shortness of Breath',
  'Chest Discomfort',
  'Swelling'
]

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Journal form state
  const [severity, setSeverity] = useState<number>(3)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Fever'])
  const [perceivedChange, setPerceivedChange] = useState<string>('Stable')
  const [dailyNotes, setDailyNotes] = useState<string>('')
  const [tasksCompleted, setTasksCompleted] = useState<number>(2)
  const [tasksTotal, setTasksTotal] = useState<number>(3)
  const [escalationNotice, setEscalationNotice] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await progressApi.getSummary()
      setSummary(res.data)
    } catch (err) {
      console.error('Failed to load progress summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym))
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym])
    }
  }

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await progressApi.logSymptom({
        severity_scale: severity,
        symptoms_reported: selectedSymptoms,
        perceived_change: perceivedChange,
        daily_notes: dailyNotes,
        care_plan_tasks_completed: tasksCompleted,
        care_plan_tasks_total: tasksTotal,
      })

      if (res.data?.escalation_triggered) {
        setEscalationNotice(res.data?.escalation_guidance || 'Worsening symptoms logged.')
      } else {
        setEscalationNotice(null)
      }

      setDailyNotes('')
      await loadData()
    } catch (err) {
      console.error('Failed to log symptom entry:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getSeverityColor = (sev: number) => {
    if (sev <= 3) return 'text-emerald-700 bg-emerald-100'
    if (sev <= 6) return 'text-amber-700 bg-amber-100'
    if (sev <= 8) return 'text-orange-700 bg-orange-100'
    return 'text-rose-700 bg-rose-100'
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900 mb-2 transition-colors"
          >
            <span>← Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Activity className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Recovery Tracker & Daily Symptom Journal
              </h1>
              <p className="text-sm text-stone-500">
                Log daily symptoms and care tasks. Grounded clinical indicators with safety escalation protocols.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Escalation Alert Notice if triggered */}
      {escalationNotice && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-sm flex items-start gap-3.5 text-rose-950">
          <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-base text-rose-900">
              Clinical Alert: Symptom Worsening Detected
            </h4>
            <p className="text-sm text-rose-800 leading-relaxed">
              {escalationNotice}
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <a
                href="tel:112"
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
              >
                Emergency Services: 112
              </a>
              <a
                href="/appointments"
                className="px-3.5 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 font-semibold text-xs transition"
              >
                Book Urgent In-Person Visit
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PS3 Module 12: Distinct Clinical Indicators (NO Fake Cure %) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Care-plan task completion */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Care-Plan Tasks</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {summary?.care_plan_completion_rate || 0}%
          </div>
          <p className="text-xs text-stone-500">
            Routine treatment steps & prescribed check-in actions completed
          </p>
        </div>

        {/* Metric 2: Symptom Trend */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Symptom Trend</span>
            {summary?.patient_reported_symptom_trend === 'Improving' ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : summary?.patient_reported_symptom_trend === 'Worsening' ? (
              <TrendingDown className="w-4 h-4 text-rose-600" />
            ) : (
              <Minus className="w-4 h-4 text-stone-400" />
            )}
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {summary?.patient_reported_symptom_trend || 'Stable'}
          </div>
          <p className="text-xs text-stone-500">
            Patient-reported direction over the last 3 logged journal check-ins
          </p>
        </div>

        {/* Metric 3: Clinician Review Status */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Clinician Review</span>
            <Stethoscope className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {summary?.clinician_review_status?.replace('_', ' ') || 'Pending'}
          </div>
          <p className="text-xs text-stone-500">
            Provider oversight state for logged clinical milestones
          </p>
        </div>

        {/* Metric 4: Follow-up Appointment Status */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Follow-Up Schedule</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {summary?.follow_up_status || 'Scheduled'}
          </div>
          <p className="text-xs text-stone-500">
            Status of upcoming in-person clinician evaluation
          </p>
        </div>
      </div>

      {/* Main Grid: Daily Journal Form (Left 5 cols) & History Log (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Log Today's Entry Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span>Today's Check-in Journal</span>
          </h3>

          <form onSubmit={handleSubmitJournal} className="space-y-4">
            {/* Severity scale slider (1 to 10) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">Severity Level (1-10)</span>
                <span className={`px-2 py-0.5 rounded font-bold text-xs ${getSeverityColor(severity)}`}>
                  Score: {severity}/10 ({severity <= 3 ? 'Mild' : severity <= 6 ? 'Moderate' : severity <= 8 ? 'Severe' : 'Emergency'})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={severity}
                onChange={(e) => setSeverity(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>1 (Minimal)</span>
                <span>5 (Noticeable)</span>
                <span>10 (Emergency)</span>
              </div>
            </div>

            {/* Perceived change */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                How do you feel compared to yesterday?
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Improving', 'Stable', 'Worsening', 'Significantly Worsened'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPerceivedChange(opt)}
                    className={`p-2.5 rounded-xl border font-medium transition text-left ${
                      perceivedChange === opt
                        ? opt.includes('Worsen')
                          ? 'bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-400'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms Reported */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Symptoms Experienced Today
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SYMPTOMS.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym)
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymptom(sym)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        isChecked
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {sym}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Care plan tasks completed */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Care Tasks Done
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={tasksCompleted}
                  onChange={(e) => setTasksCompleted(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Total Planned Tasks
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tasksTotal}
                  onChange={(e) => setTasksTotal(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Daily Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Notes for Doctor / Follow-up
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Took medication after meals, rested for 8 hours..."
                value={dailyNotes}
                onChange={(e) => setDailyNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Save Daily Check-in'}</span>
            </button>
          </form>
        </div>

        {/* Right: Past Journal History Log (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider flex items-center justify-between">
            <span>Journal History ({summary?.recent_journals?.length || 0})</span>
            <span className="text-[11px] font-normal text-stone-400">Strictly no fabricated cure data</span>
          </h3>

          {!summary?.recent_journals || summary.recent_journals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
              No entries logged yet. Record your first check-in on the left.
            </div>
          ) : (
            summary.recent_journals.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${getSeverityColor(entry.severity_scale)}`}>
                      Severity {entry.severity_scale}/10
                    </span>
                    <span className="text-xs font-semibold text-stone-800">
                      Perceived: {entry.perceived_change}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-stone-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(entry.entry_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Symptoms chips */}
                <div className="flex flex-wrap gap-1">
                  {entry.symptoms_reported?.map((sym, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium"
                    >
                      {sym}
                    </span>
                  ))}
                </div>

                {/* Notes and Task Metrics */}
                {entry.daily_notes && (
                  <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                    "{entry.daily_notes}"
                  </p>
                )}

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tasks Completed: {entry.care_plan_tasks_completed} / {entry.care_plan_tasks_total}</span>
                  </div>
                  <span className="font-semibold text-stone-600">
                    Review: {entry.clinician_review_status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressPage

