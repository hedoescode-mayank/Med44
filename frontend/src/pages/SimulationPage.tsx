import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Heart,
  Droplets,
  AlertTriangle,
  Play,
  Mail,
  UserCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Trash2,
  Plus,
} from 'lucide-react'
import { wearableApi } from '../services/api'
import toast from 'react-hot-toast'

interface VitalReadings {
  HEART_RATE?: { value: number; unit: string; source: string; recorded_at: string }
  SPO2?: { value: number; unit: string; source: string; recorded_at: string }
  BLOOD_PRESSURE_SYS?: { value: number; unit: string; source: string; recorded_at: string }
  BLOOD_PRESSURE_DIA?: { value: number; unit: string; source: string; recorded_at: string }
  GLUCOSE?: { value: number; unit: string; source: string; recorded_at: string }
}

interface DoctorLink {
  id: number
  doctor_id: number
  name: string
  email: string
  specialty?: string
  hospital_name?: string
  status: string
  can_receive_alerts: boolean
  linked_at?: string
}

interface NotificationItem {
  id: number
  recipient_email: string
  recipient_role: string
  notification_type: string
  subject: string
  body_snippet?: string
  status: string
  sent_at: string
}

export default function SimulationPage() {
  const navigate = useNavigate()
  const [readings, setReadings] = useState<VitalReadings>({})
  const [activeScenario, setActiveScenario] = useState<string>('NORMAL_REST')
  const [simulating, setSimulating] = useState(false)
  const [triggeredAlerts, setTriggeredAlerts] = useState<any[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [doctors, setDoctors] = useState<DoctorLink[]>([])

  // Doctor link form
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [docName, setDocName] = useState('Dr. Ananya Sharma')
  const [docEmail, setDocEmail] = useState('doctor.sharma@healthclinic.in')
  const [docSpecialty, setDocSpecialty] = useState('Cardiology')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [obsRes, docsRes, notifRes] = await Promise.all([
        wearableApi.getObservations(15),
        wearableApi.getDoctors(),
        wearableApi.getNotifications(),
      ])
      setReadings(obsRes.data?.latest || {})
      setDoctors(docsRes.data || [])
      setNotifications(notifRes.data || [])
    } catch (e) {
      console.warn('Simulation data load note:', e)
    }
  }

  const runScenario = async (scenario: string) => {
    try {
      setSimulating(true)
      setActiveScenario(scenario)
      const res = await wearableApi.simulate(scenario)
      if (res.data?.status === 'success') {
        const ingestRes = res.data.ingest_result
        const alerts = ingestRes?.alerts_triggered || []
        setTriggeredAlerts(alerts)

        if (alerts.length > 0) {
          toast.error(`Alert Triggered: ${alerts[0].type}!`, { duration: 4000 })
        } else {
          toast.success(`Scenario Applied: ${scenario.replace('_', ' ')}`)
        }
        await loadData()
      }
    } catch {
      toast.error('Simulation step failed')
    } finally {
      setSimulating(false)
    }
  }

  const handleLinkDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docName || !docEmail) return
    try {
      await wearableApi.linkDoctor({
        doctor_name: docName,
        doctor_email: docEmail,
        specialty: docSpecialty,
        hospital_name: 'Metro Care Multispeciality',
        can_receive_alerts: true,
      })
      toast.success(`Linked ${docName} for alert escalations`)
      setShowDoctorModal(false)
      await loadData()
    } catch {
      toast.error('Could not link doctor')
    }
  }

  const handleRevokeDoctor = async (id: number) => {
    if (!confirm('Revoke this doctor link? They will no longer receive emergency health alerts.')) return
    try {
      await wearableApi.revokeDoctor(id)
      toast.success('Doctor link revoked')
      await loadData()
    } catch {
      toast.error('Failed to revoke link')
    }
  }

  const hr = readings.HEART_RATE?.value ?? 74
  const spo2 = readings.SPO2?.value ?? 98.5
  const bpSys = readings.BLOOD_PRESSURE_SYS?.value ?? 118
  const bpDia = readings.BLOOD_PRESSURE_DIA?.value ?? 78

  const hrStatus = hr > 125 ? 'CRITICAL' : hr > 100 ? 'WARNING' : 'NORMAL'
  const spo2Status = spo2 < 90 ? 'CRITICAL' : spo2 < 94 ? 'WARNING' : 'NORMAL'
  const bpStatus = bpSys >= 180 ? 'CRITICAL' : bpSys >= 140 ? 'WARNING' : 'NORMAL'

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900 mb-2 transition-colors"
          >
            <span>← Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Activity className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                  Wearable Telemetry & Escalation Lab
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  SIMULATED SENSOR
                </span>
              </div>
              <p className="text-sm text-stone-500">
                Test physiological sensor thresholds, alert rules, doctor escalation notifications, and consent checks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDoctorModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-sm"
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Link Physician</span>
          </button>
        </div>
      </div>

      {/* Scenario Trigger Controls */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Simulate Physiological Scenarios (Instant Trigger)</span>
          </h3>
          <span className="text-[11px] text-stone-400">Deterministic rule verification</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {[
            {
              id: 'NORMAL_REST',
              label: 'Normal Resting',
              desc: '74 bpm · 98.5% SpO2 · 118/78',
              color: 'hover:border-emerald-500 hover:bg-emerald-50/50',
              activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold',
            },
            {
              id: 'MILD_EXERTION',
              label: 'Mild Exertion',
              desc: '105 bpm · 97% SpO2 · 128/82',
              color: 'hover:border-blue-500 hover:bg-blue-50/50',
              activeColor: 'border-blue-500 bg-blue-50 text-blue-950 font-bold',
            },
            {
              id: 'TACHYCARDIA',
              label: '⚡ Tachycardia Spike',
              desc: '136 bpm (>125 threshold)',
              color: 'hover:border-rose-500 hover:bg-rose-50/50',
              activeColor: 'border-rose-500 bg-rose-50 text-rose-950 font-bold',
            },
            {
              id: 'HYPOXEMIA',
              label: '🫁 Hypoxemia Drop',
              desc: '89.5% SpO2 (<92 threshold)',
              color: 'hover:border-amber-500 hover:bg-amber-50/50',
              activeColor: 'border-amber-500 bg-amber-50 text-amber-950 font-bold',
            },
            {
              id: 'HYPERTENSIVE_CRISIS',
              label: '🚨 BP Crisis',
              desc: '186/114 mmHg (≥180 threshold)',
              color: 'hover:border-red-600 hover:bg-red-50/50',
              activeColor: 'border-red-600 bg-red-50 text-red-950 font-bold',
            },
          ].map((s) => {
            const isSelected = activeScenario === s.id
            return (
              <button
                key={s.id}
                onClick={() => runScenario(s.id)}
                disabled={simulating}
                className={`p-3 rounded-xl border text-left transition text-xs space-y-1 ${
                  isSelected ? s.activeColor : `bg-white border-stone-200 text-stone-700 ${s.color}`
                }`}
              >
                <p className="font-semibold">{s.label}</p>
                <p className="text-[10px] text-stone-400 leading-tight">{s.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Live Vitals Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div className={`card p-5 border rounded-2xl transition shadow-sm ${
          hrStatus === 'CRITICAL'
            ? 'bg-rose-50/70 border-rose-300'
            : hrStatus === 'WARNING'
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Heart Rate</span>
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-stone-900 tracking-tight">{hr.toFixed(0)}</span>
            <span className="text-xs text-stone-400 font-semibold">bpm</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hrStatus === 'CRITICAL'
                ? 'bg-rose-200 text-rose-800'
                : hrStatus === 'WARNING'
                ? 'bg-amber-200 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {hrStatus}
            </span>
            <span className="text-[10px] text-stone-400">Target: 60–100</span>
          </div>
        </div>

        {/* SpO2 */}
        <div className={`card p-5 border rounded-2xl transition shadow-sm ${
          spo2Status === 'CRITICAL'
            ? 'bg-rose-50/70 border-rose-300'
            : spo2Status === 'WARNING'
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Blood Oxygen (SpO2)</span>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-stone-900 tracking-tight">{spo2.toFixed(1)}</span>
            <span className="text-xs text-stone-400 font-semibold">%</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              spo2Status === 'CRITICAL'
                ? 'bg-rose-200 text-rose-800'
                : spo2Status === 'WARNING'
                ? 'bg-amber-200 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {spo2Status}
            </span>
            <span className="text-[10px] text-stone-400">Target: ≥ 95%</span>
          </div>
        </div>

        {/* Blood Pressure */}
        <div className={`card p-5 border rounded-2xl transition shadow-sm ${
          bpStatus === 'CRITICAL'
            ? 'bg-rose-50/70 border-rose-300'
            : bpStatus === 'WARNING'
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Blood Pressure</span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-stone-900 tracking-tight">
              {bpSys.toFixed(0)}/{bpDia.toFixed(0)}
            </span>
            <span className="text-xs text-stone-400 font-semibold">mmHg</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              bpStatus === 'CRITICAL'
                ? 'bg-rose-200 text-rose-800'
                : bpStatus === 'WARNING'
                ? 'bg-amber-200 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {bpStatus}
            </span>
            <span className="text-[10px] text-stone-400">Target: &lt; 120/80</span>
          </div>
        </div>

        {/* Blood Glucose */}
        <div className="card p-5 border border-stone-200 bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Fasting Glucose</span>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-stone-900 tracking-tight">
              {(readings.GLUCOSE?.value ?? 95).toFixed(0)}
            </span>
            <span className="text-xs text-stone-400 font-semibold">mg/dL</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              NORMAL
            </span>
            <span className="text-[10px] text-stone-400">Target: 70–99</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Triggered Alerts & Linked Physicians */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Active Escalations & Notification Logs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Deterministic Vital Alert Evaluations</span>
              </h3>
              <span className="text-xs text-stone-400">Evaluated on Ingest</span>
            </div>

            {triggeredAlerts.length > 0 ? (
              <div className="space-y-2">
                {triggeredAlerts.map((a, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-800 uppercase tracking-wide">
                        ⚠️ {a.type} [{a.severity}]
                      </span>
                      <span className="text-[10px] bg-rose-200 text-rose-900 font-bold px-1.5 py-0.5 rounded">
                        Action Required
                      </span>
                    </div>
                    <p className="text-rose-900">{a.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>All observed vital parameters are within safe physiological limits.</span>
              </div>
            )}
          </div>

          {/* Outbox Notification Logs */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>Alert Outbox & Doctor Email Dispatches ({notifications.length})</span>
              </h3>
              <span className="text-[10px] text-stone-400">TEST Mode: Simulated Dispatch</span>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-400">
                No alert dispatches yet. Trigger an anomaly scenario above to test automated escalation.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900 truncate max-w-[260px]">
                        To: {n.recipient_email}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {n.status}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] font-medium">{n.subject}</p>
                    <p className="text-stone-400 text-[10px]">{n.sent_at}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Linked Physicians & Consent Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Linked Care Team ({doctors.length})</span>
              </h3>
              <button
                onClick={() => setShowDoctorModal(true)}
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Plus size={12} />
                <span>Add Doctor</span>
              </button>
            </div>

            {doctors.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-400">
                No treating doctors linked. Add a physician email to receive escalation reports.
              </div>
            ) : (
              <div className="space-y-2">
                {doctors.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-start justify-between gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-stone-900">{d.name}</h4>
                      <p className="text-[11px] text-stone-500">{d.specialty} · {d.hospital_name}</p>
                      <p className="text-[11px] text-stone-400 font-mono mt-0.5">{d.email}</p>
                    </div>
                    <button
                      onClick={() => handleRevokeDoctor(d.id)}
                      className="text-stone-300 hover:text-red-500 p-1"
                      title="Revoke Link"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
              <p className="font-semibold">Patient Consent Status:</p>
              <p>✓ Remote Sensor Ingestion: Permitted</p>
              <p>✓ Critical Alert Email: Granted (Active)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Link Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-stone-900">Link Treating Physician</h3>
            <form onSubmit={handleLinkDoctor} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Doctor Email</label>
                <input
                  type="email"
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Specialty</label>
                <input
                  type="text"
                  value={docSpecialty}
                  onChange={(e) => setDocSpecialty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
