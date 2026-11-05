import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  Calendar,
  Pill,
  TrendingUp,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ClipboardCheck,
  Clock,
  Heart,
  FileText,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useAppointmentStore } from '../store/appointmentStore'
import { useMedicationStore } from '../store/medicationStore'
import UserAvatar from '../components/avatars/UserAvatar'
import BabyNurse from '../components/BabyNurse'
import HealthReportModal from '../components/HealthReportModal'
import api from '../services/api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } },
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { appointments, fetchAppointments } = useAppointmentStore()
  const { medications, fetchPrescriptions } = useMedicationStore()
  const navigate = useNavigate()
  const [conversationsCount, setConversationsCount] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)

  useEffect(() => {
    fetchAppointments().catch(() => {})
    fetchPrescriptions().catch(() => {})
    api
      .get('/chat/conversations')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setConversationsCount(res.data.length)
        }
      })
      .catch(() => {})
  }, [fetchAppointments, fetchPrescriptions])

  const upcoming = appointments.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'PENDING' || a.status === 'confirmed' || a.status === 'pending'
  )
  const completedConsultations = appointments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'completed'
  ).length

  const activeMedsCount = medications.filter((m) => m.is_active !== false).length

  // Health Score from survey or calculated
  const healthScore = user?.healthScore ?? user?.health_score ?? null

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const stats = [
    {
      label: 'Consultations',
      value: completedConsultations,
      sub: completedConsultations === 0 ? 'No past sessions' : `${completedConsultations} completed`,
      icon: Stethoscope,
      bg: 'bg-primary-light',
      text: 'text-primary-dark',
    },
    {
      label: 'Upcoming Care',
      value: upcoming.length,
      sub: upcoming.length === 0 ? 'No slots booked' : `${upcoming.length} active`,
      icon: Calendar,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: 'Medications',
      value: activeMedsCount,
      sub: activeMedsCount === 0 ? 'No active meds' : `${activeMedsCount} tracked`,
      icon: Pill,
      bg: 'bg-accent-light',
      text: 'text-accent-dark',
    },
    {
      label: 'Health Score',
      value: healthScore !== null ? `${healthScore}%` : '—',
      sub: healthScore !== null ? 'Survey calculated' : 'Survey required',
      icon: TrendingUp,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 space-y-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Welcome Hero Banner */}
        <motion.div
          variants={item}
          className="card bg-gradient-to-r from-primary-light/60 via-white to-accent-light/40 border border-borderSoft flex flex-col md:flex-row items-center justify-between gap-6 p-6 lg:p-8"
        >
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-borderSoft text-xs font-semibold text-primary shadow-soft">
              <Sparkles size={13} className="text-primary" />
              <span>Personalized Healthcare Space</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-textDark tracking-tight">
              {greeting()}, {user?.name?.split(' ')[0] || 'Patient'} 👋
            </h1>
            <p className="text-sm text-textSecondary max-w-xl leading-relaxed">
              Your symptoms and records are continuously protected by deterministic clinical safety
              rules. All AI responses adhere to verified clinical protocols.
            </p>
            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                onClick={() => navigate('/chat')}
                className="button-primary text-sm shadow-soft"
              >
                <MessageCircle size={16} />
                <span>Ask AI Health Nurse</span>
              </button>
              <button
                onClick={() => navigate('/appointments')}
                className="button-secondary text-sm"
              >
                <Calendar size={16} />
                <span>Find Doctors</span>
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="px-4 py-2 rounded-xl bg-white/90 border border-primary/30 text-primary-dark font-bold text-sm hover:bg-primary-light/50 transition-all shadow-soft flex items-center gap-2"
              >
                <FileText size={16} className="text-primary" />
                <span>Generate Report Card</span>
              </button>
            </div>
          </div>

          <div className="flex-shrink-0">
            <BabyNurse size={130} subtitle="Ready to assist" />
          </div>
        </motion.div>

        {/* Real Dynamic Stats Grid (No hardcoded 12, 2, 3, 92%) */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, sub, icon: Icon, bg, text }) => (
            <div
              key={label}
              className="card p-5 border border-borderSoft hover:border-primary/30 transition-all shadow-soft"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-textMuted">
                  {label}
                </span>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={text} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-textDark tracking-tight">{value}</p>
              <p className="text-[11px] text-textSecondary font-medium mt-1">{sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Health Score Calculation Transparency Card */}
        {healthScore !== null ? (
          <motion.div
            variants={item}
            className="card p-6 border border-borderSoft bg-surface flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Heart size={16} className="text-accent-dark" />
                <h3 className="font-bold text-base text-textDark">
                  Health Score Breakdown: {healthScore}%
                </h3>
              </div>
              <p className="text-xs text-textSecondary max-w-xl">
                Calculated transparently from your verified intake survey: BMI ratio, optimal sleep
                patterns, physical activity schedule, allergy safeguards, and non-smoking habits.
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="button-secondary text-xs px-4 py-2"
            >
              <ClipboardCheck size={14} />
              Review Survey Data
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={item}
            className="card p-6 border border-accent/30 bg-accent-light/30 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div>
              <h3 className="font-bold text-sm text-textDark">Survey Incomplete</h3>
              <p className="text-xs text-textSecondary mt-0.5">
                Complete your patient onboarding survey to generate your personalized health baseline.
              </p>
            </div>
            <button
              onClick={() => navigate('/survey')}
              className="button-primary text-xs whitespace-nowrap"
            >
              Complete Survey Now
            </button>
          </motion.div>
        )}

        {/* Two-Column Layout: Upcoming Appointments & Care Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upcoming Consultations or Clean Empty State */}
          <motion.div variants={item} className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-textDark">Upcoming Appointments</h3>
              <button
                onClick={() => navigate('/appointments')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all ({upcoming.length})
              </button>
            </div>

            {upcoming.length > 0 ? (
              <div className="space-y-3">
                {upcoming.slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    className="card p-4 border border-borderSoft flex items-center justify-between gap-4 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary-dark">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-textDark">{app.doctor_name}</h4>
                        <p className="text-xs text-textSecondary">
                          {app.specialty} · {app.slot_time}
                        </p>
                        <p className="text-[11px] text-textMuted mt-0.5">
                          Date: {app.appointment_date}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-light text-primary-dark uppercase">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Clean Empty State */
              <div className="card p-8 border border-borderSoft text-center bg-surface space-y-3">
                <div className="w-12 h-12 rounded-full bg-surfaceSoft mx-auto flex items-center justify-center text-textMuted">
                  <Calendar size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-textDark">No appointments scheduled</h4>
                  <p className="text-xs text-textSecondary mt-1 max-w-sm mx-auto">
                    When you need to see a doctor or specialist, you can browse available slots in the
                    Appointments tab anytime.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/appointments')}
                  className="button-secondary text-xs mt-2"
                >
                  Schedule When Needed
                </button>
              </div>
            )}
          </motion.div>

          {/* Right Column: Active Care Shortcuts */}
          <motion.div variants={item} className="lg:col-span-5 space-y-4">
            <h3 className="font-bold text-base text-textDark">Quick Healthcare Tools</h3>

            <div className="space-y-3">
              <div
                onClick={() => navigate('/chat')}
                className="card p-4 border border-borderSoft hover:border-primary/40 cursor-pointer transition-all flex items-center justify-between group shadow-soft"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary-light text-primary-dark flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-textDark group-hover:text-primary transition-colors">
                      Multilingual Triage
                    </h4>
                    <p className="text-xs text-textSecondary">
                      Chat in English, Hindi, or Tamil safely
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-textMuted group-hover:translate-x-1 transition-transform" />
              </div>

              <div
                onClick={() => navigate('/medications')}
                className="card p-4 border border-borderSoft hover:border-accent/40 cursor-pointer transition-all flex items-center justify-between group shadow-soft"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent-light text-accent-dark flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Pill size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-textDark group-hover:text-accent-dark transition-colors">
                      Medication References
                    </h4>
                    <p className="text-xs text-textSecondary">
                      Verify drug interactions & safety notes
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-textMuted group-hover:translate-x-1 transition-transform" />
              </div>

              <div
                onClick={() => navigate('/profile')}
                className="card p-4 border border-borderSoft hover:border-emerald-300 cursor-pointer transition-all flex items-center justify-between group shadow-soft"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-textDark group-hover:text-emerald-700 transition-colors">
                      Medical Profile & Privacy
                    </h4>
                    <p className="text-xs text-textSecondary">
                      Update allergies, vitals & data controls
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-textMuted group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Patient Health Report Card Modal */}
      <HealthReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  )
}
