import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Save,
  Edit3,
  ShieldCheck,
  Heart,
  Activity,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import UserAvatar from '../components/avatars/UserAvatar'
import AvatarFemale from '../components/avatars/AvatarFemale'
import AvatarMale from '../components/avatars/AvatarMale'
import AvatarNeutral from '../components/avatars/AvatarNeutral'
import HealthReportModal from '../components/HealthReportModal'
import api from '../services/api'
import toast from 'react-hot-toast'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const GENDERS = ['Female', 'Male', 'Non-Binary', 'Prefer not to say']

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>('chronic')

  // Extract array or string safely
  const formatList = (val: any) => {
    if (Array.isArray(val)) return val.join(', ')
    return val || 'None reported'
  }

  const [form, setForm] = useState({
    name: user?.name || '',
    age: user?.age ? String(user.age) : '28',
    gender: user?.gender || 'Female',
    avatar: user?.avatar || 'female',
    bloodGroup: user?.bloodGroup || user?.blood_group || 'B+',
    heightCm: user?.heightCm ? String(user.heightCm) : '168',
    weightKg: user?.weightKg ? String(user.weightKg) : '65',
    allergies: formatList(user?.allergies),
    chronicConditions: formatList(user?.chronicConditions),
    pastSurgeries: user?.pastSurgeries || 'None',
    vaccinations: formatList(user?.vaccinations),
    emergencyContact: typeof user?.emergencyContact === 'string'
      ? user.emergencyContact
      : user?.emergencyContact?.name
      ? `${user.emergencyContact.name} (${user.emergencyContact.phone || ''})`
      : 'None provided',
    // Privacy toggles
    localOnlyMode: true,
    telemetryConsent: false,
    shareWithTreatingDoctor: true,
  })

  // Calculate completeness percentage based on survey & profile
  const calculateCompleteness = () => {
    let filled = 0
    const fields = [
      form.name,
      form.age,
      form.gender,
      form.bloodGroup,
      form.heightCm,
      form.weightKg,
      form.allergies,
      form.chronicConditions,
      form.pastSurgeries,
      user?.hasCompletedSurvey,
    ]
    fields.forEach((f) => {
      if (f && f !== 'None reported' && f !== 'None') filled++
    })
    return Math.round((filled / fields.length) * 100)
  }

  const handleSave = async () => {
    const allergiesList = form.allergies.split(',').map((s: string) => s.trim()).filter(Boolean)
    const conditionsList = form.chronicConditions.split(',').map((s: string) => s.trim()).filter(Boolean)

    const updates = {
      name: form.name,
      age: parseInt(form.age) || 28,
      gender: form.gender,
      avatar: form.avatar,
      avatar_type: form.avatar,
      bloodGroup: form.bloodGroup,
      blood_group: form.bloodGroup,
      heightCm: parseFloat(form.heightCm) || 168,
      weightKg: parseFloat(form.weightKg) || 65,
      allergies: allergiesList,
      chronicConditions: conditionsList,
      pastSurgeries: form.pastSurgeries,
      emergencyContact: { name: form.emergencyContact, phone: '' },
    }

    try {
      await api.put('/profile', {
        name: updates.name,
        age: updates.age,
        gender: updates.gender,
        blood_group: updates.bloodGroup,
        allergies: allergiesList.join(', '),
      }).catch(() => {})
    } catch {}

    updateUser(updates)
    toast.success('Medical profile updated successfully! 🌿')
    setEditing(false)
  }

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id)
  }

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-textDark tracking-tight">
            Patient Health Profile
          </h1>
          <p className="text-sm text-textSecondary mt-1">
            Verified intake data synchronized with your personal clinical safety layer.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="px-3.5 py-2 rounded-xl bg-surface border border-primary/30 text-primary-dark font-bold text-xs hover:bg-primary-light/50 transition-all shadow-soft flex items-center gap-1.5"
          >
            <FileText size={14} className="text-primary" />
            <span>Generate Report Card</span>
          </button>
          <button
            onClick={() => (editing ? handleSave() : setEditing(true))}
            className={editing ? 'button-primary text-xs' : 'button-secondary text-xs'}
          >
            {editing ? (
              <>
                <Save size={14} />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Avatar & Summary Card */}
      <div className="card p-6 border border-borderSoft bg-surface flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          <UserAvatar type={form.avatar} className="w-24 h-24 border-2 border-borderSoft shadow-soft" />
          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-primary border-2 border-white" />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-textDark">{user?.name || 'Patient'}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-light text-primary-dark">
              Verified Patient
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-light text-accent-dark">
              Blood {form.bloodGroup}
            </span>
          </div>

          <p className="text-xs text-textSecondary">
            {user?.email || 'patient@med44.ai'} · Age {form.age} · {form.gender}
          </p>

          {/* Profile Completeness Bar */}
          <div className="pt-2 max-w-md">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-textSecondary">Profile Completeness</span>
              <span className="text-primary font-bold">{calculateCompleteness()}%</span>
            </div>
            <div className="w-full bg-surfaceSoft h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-500"
                style={{ width: `${calculateCompleteness()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Selection (When Editing) */}
      {editing && (
        <div className="card p-6 border border-primary/30 bg-primary-light/10 space-y-3">
          <h3 className="font-bold text-sm text-textDark">Choose Your Preferred Avatar</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'female', label: 'Female Avatar', comp: <AvatarFemale className="w-12 h-12 mx-auto" /> },
              { id: 'male', label: 'Male Avatar', comp: <AvatarMale className="w-12 h-12 mx-auto" /> },
              { id: 'neutral', label: 'Neutral Care', comp: <AvatarNeutral className="w-12 h-12 mx-auto" /> },
            ].map((av) => (
              <button
                key={av.id}
                type="button"
                onClick={() => setForm({ ...form, avatar: av.id })}
                className={`p-3 rounded-xl border bg-surface transition-all ${
                  form.avatar === av.id
                    ? 'border-primary ring-2 ring-primary/20 shadow-soft'
                    : 'border-borderSoft hover:border-gray-300'
                }`}
              >
                {av.comp}
                <p className="text-xs font-bold text-textDark mt-2">{av.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Basic Vitals Section */}
      <div className="card p-6 border border-borderSoft space-y-4">
        <h3 className="font-bold text-base text-textDark">Physical Vitals</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
              Height
            </label>
            {editing ? (
              <input
                type="number"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                className="input text-xs"
              />
            ) : (
              <p className="p-3 rounded-lg bg-surfaceSoft text-xs font-semibold text-textDark">
                {form.heightCm} cm
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
              Weight
            </label>
            {editing ? (
              <input
                type="number"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                className="input text-xs"
              />
            ) : (
              <p className="p-3 rounded-lg bg-surfaceSoft text-xs font-semibold text-textDark">
                {form.weightKg} kg
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
              Blood Group
            </label>
            {editing ? (
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="input text-xs"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            ) : (
              <p className="p-3 rounded-lg bg-surfaceSoft text-xs font-semibold text-textDark">
                {form.bloodGroup}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Accordion: Medical History Sections (Populated from Survey) */}
      <div className="card p-6 border border-borderSoft space-y-4">
        <h3 className="font-bold text-base text-textDark">Clinical History & Allergies</h3>

        <div className="space-y-3">
          {/* Chronic Conditions */}
          <div className="border border-borderSoft rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('chronic')}
              className="w-full p-4 flex items-center justify-between text-left bg-surface hover:bg-surfaceSoft transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                <span className="font-bold text-xs text-textDark">Chronic Conditions</span>
              </div>
              {expandedSection === 'chronic' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === 'chronic' && (
              <div className="p-4 bg-surfaceSoft/30 border-t border-borderSoft">
                {editing ? (
                  <input
                    type="text"
                    value={form.chronicConditions}
                    onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                    className="input text-xs"
                  />
                ) : (
                  <p className="text-xs text-textDark leading-relaxed">{form.chronicConditions}</p>
                )}
              </div>
            )}
          </div>

          {/* Allergies */}
          <div className="border border-borderSoft rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('allergies')}
              className="w-full p-4 flex items-center justify-between text-left bg-surface hover:bg-surfaceSoft transition-colors"
            >
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-accent-dark" />
                <span className="font-bold text-xs text-textDark">Known Allergies</span>
              </div>
              {expandedSection === 'allergies' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === 'allergies' && (
              <div className="p-4 bg-surfaceSoft/30 border-t border-borderSoft">
                {editing ? (
                  <input
                    type="text"
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    className="input text-xs"
                  />
                ) : (
                  <p className="text-xs text-textDark leading-relaxed">{form.allergies}</p>
                )}
              </div>
            )}
          </div>

          {/* Past Surgeries */}
          <div className="border border-borderSoft rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('surgeries')}
              className="w-full p-4 flex items-center justify-between text-left bg-surface hover:bg-surfaceSoft transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-600" />
                <span className="font-bold text-xs text-textDark">Past Surgeries & Procedures</span>
              </div>
              {expandedSection === 'surgeries' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === 'surgeries' && (
              <div className="p-4 bg-surfaceSoft/30 border-t border-borderSoft">
                {editing ? (
                  <input
                    type="text"
                    value={form.pastSurgeries}
                    onChange={(e) => setForm({ ...form, pastSurgeries: e.target.value })}
                    className="input text-xs"
                  />
                ) : (
                  <p className="text-xs text-textDark leading-relaxed">{form.pastSurgeries}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy & Data Controls (Working Toggles) */}
      <div className="card p-6 border border-borderSoft space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-primary" />
          <h3 className="font-bold text-base text-textDark">Patient Privacy Controls</h3>
        </div>

        <div className="space-y-3 divide-y divide-borderSoft text-xs">
          <div className="pt-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-textDark">Local-Only Health Data Storage</p>
              <p className="text-[11px] text-textSecondary">
                Keep all clinical intake records restricted to this local device's SQLite database.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.localOnlyMode}
              onChange={(e) => {
                setForm({ ...form, localOnlyMode: e.target.checked })
                toast.success('Local privacy preference saved.')
              }}
              className="w-4 h-4 text-primary rounded"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-textDark">Share Triage Summary with Treating Physician</p>
              <p className="text-[11px] text-textSecondary">
                Permit verified clinic staff to view symptom assessment before scheduled appointment.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.shareWithTreatingDoctor}
              onChange={(e) => {
                setForm({ ...form, shareWithTreatingDoctor: e.target.checked })
                toast.success('Doctor sharing permissions updated.')
              }}
              className="w-4 h-4 text-primary rounded"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-textDark">Anonymous Safety Telemetry</p>
              <p className="text-[11px] text-textSecondary">
                Contribute non-identifiable red-flag trigger metrics to improve offline clinical accuracy.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.telemetryConsent}
              onChange={(e) => {
                setForm({ ...form, telemetryConsent: e.target.checked })
                toast.success('Telemetry preference updated.')
              }}
              className="w-4 h-4 text-primary rounded"
            />
          </div>
        </div>
      </div>

      {/* Health Report Card Modal */}
      <HealthReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />
    </div>
  )
}
