import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Key, Wifi, Bell, Database, Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle, Moon,
  LifeBuoy, Send, ShieldAlert, Clock, CheckCircle
} from 'lucide-react'
import { useChatStore } from '../store/chatStore'
import { supportApi } from '../services/api'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle')
  const { mode, setMode } = useChatStore()
  const [notifications, setNotifications] = useState({
    appointments: true,
    medications: true,
    healthTips: false,
    emergencyAlerts: true,
  })
  const [darkMode, setDarkMode] = useState(false)

  // PS3 Module 8: Support & Human Escalation Tickets
  const [tickets, setTickets] = useState<any[]>([])
  const [ticketType, setTicketType] = useState('INACCURATE_FACILITY_INFO')
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketDesc, setTicketDesc] = useState('')
  const [ticketSubmitting, setTicketSubmitting] = useState(false)

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      const res = await supportApi.getTickets()
      setTickets(res.data || [])
    } catch (err) {
      console.error('Failed to load support tickets:', err)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketSubject.trim() || !ticketDesc.trim()) return
    try {
      setTicketSubmitting(true)
      await supportApi.createTicket({
        ticket_type: ticketType,
        subject: ticketSubject.trim(),
        description: ticketDesc.trim(),
      })
      toast.success('Support ticket created. A care coordinator will review shortly.')
      setTicketSubject('')
      setTicketDesc('')
      await loadTickets()
    } catch (err) {
      toast.error('Failed to submit ticket')
    } finally {
      setTicketSubmitting(false)
    }
  }

  const handleSaveKey = () => {
    if (!groqKey.trim()) {
      toast.error('Please enter a valid API key')
      return
    }
    localStorage.setItem('groq_api_key', groqKey)
    setKeySaved(true)
    toast.success('Groq API key saved!')
  }

  const handleSync = async () => {
    setSyncStatus('syncing')
    await new Promise((r) => setTimeout(r, 2000))
    setSyncStatus('done')
    toast.success('Data synced successfully!')
    setTimeout(() => setSyncStatus('idle'), 3000)
  }

  const toggleNotif = (key: keyof typeof notifications) =>
    setNotifications((p) => ({ ...p, [key]: !p[key] }))

  const ToggleSwitch = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${value ? 'bg-primary' : 'bg-gray-200'}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-6' : 'left-1'}`}
      />
    </button>
  )

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-textDark">Settings</h1>
          <p className="text-textMuted mt-1">Configure your Med44 experience</p>
        </div>

        {/* Groq API Key */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-textDark mb-1 flex items-center gap-2">
            <Key size={18} className="text-primary" />
            Groq AI API Key
          </h3>
          <p className="text-sm text-textMuted mb-4">
            Add your Groq API key to enable online AI mode with faster, smarter responses.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => { setGroqKey(e.target.value); setKeySaved(false) }}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxx"
                className="input-field pr-10 font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textDark"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              onClick={handleSaveKey}
              className={`flex items-center gap-2 px-4 rounded-xl font-semibold text-sm transition-all ${
                keySaved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {keySaved ? <CheckCircle2 size={16} /> : <Key size={16} />}
              {keySaved ? 'Saved' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-textMuted mt-2 flex items-center gap-1">
            <AlertCircle size={11} />
            Key is stored locally only. Get yours at console.groq.com
          </p>
        </div>

        {/* AI Mode */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-textDark mb-1 flex items-center gap-2">
            <Wifi size={18} className="text-accent" />
            AI Mode
          </h3>
          <p className="text-sm text-textMuted mb-4">
            Switch between online AI (Groq) and local offline clinical engine.
          </p>
          <div className="flex gap-3">
            {(['online', 'offline'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  toast.success(`Switched to ${m === 'online' ? '🟢 AI Mode (Groq)' : '⚫ Offline Mode'}`)
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                  mode === m
                    ? m === 'online'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-gray-100 border-gray-400 text-gray-600'
                    : 'border-gray-200 text-textMuted hover:border-gray-300'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${m === 'online' ? 'bg-primary' : 'bg-gray-400'}`} />
                {m === 'online' ? 'AI Mode (Groq)' : 'Offline Mode'}
              </button>
            ))}
          </div>
          <p className="text-xs text-textMuted mt-3 flex items-center gap-1">
            <AlertCircle size={11} />
            Offline mode uses a local clinical decision engine — no internet required
          </p>
        </div>

        {/* Notifications */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-textDark mb-1 flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            Notifications
          </h3>
          <p className="text-sm text-textMuted mb-5">Choose what you want to be notified about.</p>
          <div className="space-y-4">
            {[
              { key: 'appointments', label: 'Appointment Reminders', desc: 'Get reminded before your appointments' },
              { key: 'medications', label: 'Medication Reminders', desc: 'Daily medication alerts at set times' },
              { key: 'healthTips', label: 'Daily Health Tips', desc: 'Personalized wellness advice each morning' },
              { key: 'emergencyAlerts', label: 'Emergency Alerts', desc: 'Critical alerts when emergency symptoms detected' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-textDark text-sm">{label}</p>
                  <p className="text-xs text-textMuted">{desc}</p>
                </div>
                <ToggleSwitch
                  value={notifications[key as keyof typeof notifications]}
                  onChange={() => toggleNotif(key as keyof typeof notifications)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-textDark mb-1 flex items-center gap-2">
            <Moon size={18} className="text-textMuted" />
            Appearance
          </h3>
          <p className="text-sm text-textMuted mb-4">Dark mode coming soon.</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-textDark text-sm">Dark Mode</p>
              <p className="text-xs text-textMuted">Switch to dark theme (beta)</p>
            </div>
            <ToggleSwitch value={darkMode} onChange={() => { setDarkMode(!darkMode); toast('Dark mode coming soon!') }} />
          </div>
        </div>

        {/* Data sync */}
        <div className="card">
          <h3 className="text-lg font-bold text-textDark mb-1 flex items-center gap-2">
            <Database size={18} className="text-primary" />
            Data Sync
          </h3>
          <p className="text-sm text-textMuted mb-5">
            Sync your offline data with the Med44 servers when connected.
          </p>
          <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-gray-100 mb-4">
            <div>
              <p className="font-semibold text-textDark text-sm">Sync Status</p>
              <p className="text-xs text-textMuted mt-0.5">
                {syncStatus === 'idle' && 'All data synced • Last sync: just now'}
                {syncStatus === 'syncing' && 'Syncing data...'}
                {syncStatus === 'done' && '✅ Sync complete!'}
              </p>
            </div>
            {syncStatus === 'syncing' ? (
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : syncStatus === 'done' ? (
              <CheckCircle2 size={20} className="text-green-500" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-primary pulse-online" />
            )}
          </div>
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>

          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs font-semibold text-red-600 mb-1">Danger Zone</p>
            <button
              onClick={() => toast.error('This would clear all local data — disabled in demo')}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear all local data →
            </button>
          </div>
        </div>

        {/* PS3 Module 8: Human Escalation & Inaccuracy Reporting */}
        <div className="card mt-6">
          <h3 className="text-lg font-bold text-textDark mb-1 flex items-center gap-2">
            <LifeBuoy size={18} className="text-primary" />
            Human Escalation & Support Tickets
          </h3>
          <p className="text-sm text-textMuted mb-5">
            Report inaccurate facility information, raise conflicting healthcare requirements, or connect with a human care coordinator.
          </p>

          <form onSubmit={handleCreateTicket} className="space-y-4 bg-background p-4 rounded-xl border border-borderSoft">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                Issue Category
              </label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                className="input-field text-sm"
              >
                <option value="INACCURATE_FACILITY_INFO">Report Inaccurate Facility Information</option>
                <option value="CONFLICTING_REQUIREMENTS">Conflicting Healthcare Requirements</option>
                <option value="BOOKING_ISSUE">Appointment or Booking Issue</option>
                <option value="GENERAL_ASSISTANCE">Request Human Care Coordinator Help</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="Brief summary of the issue..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="input-field text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                Detailed Description
              </label>
              <textarea
                rows={3}
                placeholder="Explain the discrepancy or specific assistance required..."
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                className="input-field text-sm py-2"
                required
              />
            </div>

            <button
              type="submit"
              disabled={ticketSubmitting}
              className="btn-primary text-xs w-full py-2.5 flex items-center justify-center gap-2"
            >
              <Send size={14} />
              <span>{ticketSubmitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}</span>
            </button>
          </form>

          {/* Past tickets list */}
          {tickets.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-bold text-textDark uppercase tracking-wider">
                My Support Tickets ({tickets.length})
              </h4>
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-borderSoft bg-surface text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-textDark text-sm">{t.subject}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-textSecondary">{t.description}</p>
                    {t.resolution_notes && (
                      <p className="text-[11px] text-primary bg-surfaceSoft p-2 rounded-lg font-medium">
                        Coordinator: {t.resolution_notes}
                      </p>
                    )}
                    <span className="text-[10px] text-textMuted block pt-1">
                      Filed: {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
