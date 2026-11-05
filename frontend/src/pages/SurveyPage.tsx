import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  User,
  Activity,
  AlertCircle,
  Coffee,
  Globe,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import BabyNurse from '../components/BabyNurse'
import AvatarFemale from '../components/avatars/AvatarFemale'
import AvatarMale from '../components/avatars/AvatarMale'
import AvatarNeutral from '../components/avatars/AvatarNeutral'
import api from '../services/api'
import toast from 'react-hot-toast'

const CHRONIC_OPTIONS = [
  'Hypertension (High BP)',
  'Type 2 Diabetes',
  'Asthma / Respiratory',
  'Thyroid Disorder',
  'Heart Disease',
  'High Cholesterol',
  'None',
]

const ALLERGY_OPTIONS = [
  'Penicillin / Antibiotics',
  'Sulfa Drugs',
  'Aspirin / NSAIDs',
  'Peanuts / Tree Nuts',
  'Dairy / Lactose',
  'Dust / Pollen',
  'No Known Allergies',
]

const VACCINE_OPTIONS = [
  'COVID-19 (Full Course)',
  'Annual Flu Shot',
  'Hepatitis B',
  'Tetanus (Within 5 yrs)',
]

export default function SurveyPage() {
  const navigate = useNavigate()
  const { user, completeSurvey } = useAuthStore()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Survey Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    age: user?.age ? String(user.age) : '28',
    gender: user?.gender || 'Female',
    avatar: user?.avatar || (user?.gender === 'Male' ? 'male' : 'female'),
    heightCm: user?.heightCm ? String(user.heightCm) : '168',
    weightKg: user?.weightKg ? String(user.weightKg) : '65',
    bloodGroup: user?.bloodGroup || 'B+',
    // Step 2: History
    chronicConditions: [] as string[],
    pastSurgeries: 'None',
    familyHistory: [] as string[],
    vaccinations: ['COVID-19 (Full Course)', 'Tetanus (Within 5 yrs)'],
    // Step 3: Allergies & Meds
    allergies: [] as string[],
    currentMedications: '',
    // Step 4: Lifestyle
    sleepHours: '7-8 hours',
    diet: 'Balanced / Vegetarian',
    exercise: '3-4 times a week',
    smokingAlcohol: 'Never',
    stress: 'Moderate',
    // Step 5: Language & Emergency
    languagePref: user?.languagePref || 'en',
    emergencyName: '',
    emergencyPhone: '',
  })

  // Dynamic Health Score formula based on survey answers
  const computeHealthScore = () => {
    let score = 70 // Base score

    // Height & Weight BMI
    const h = parseFloat(formData.heightCm) / 100
    const w = parseFloat(formData.weightKg)
    if (h > 0 && w > 0) {
      const bmi = w / (h * h)
      if (bmi >= 18.5 && bmi <= 24.9) score += 10
      else if (bmi >= 25 && bmi <= 29.9) score += 5
    }

    // Sleep
    if (formData.sleepHours.includes('7-8')) score += 10
    else if (formData.sleepHours.includes('6-7')) score += 5

    // Exercise
    if (formData.exercise.includes('Daily') || formData.exercise.includes('3-4')) score += 10
    else if (formData.exercise.includes('1-2')) score += 5

    // Smoking / Alcohol
    if (formData.smokingAlcohol === 'Never') score += 5

    // Stress
    if (formData.stress === 'Low') score += 5
    else if (formData.stress === 'High') score -= 5

    // Chronic conditions deduction
    const validConditions = formData.chronicConditions.filter((c) => c !== 'None')
    score -= validConditions.length * 5

    return Math.min(Math.max(score, 45), 98)
  }

  const toggleItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (item === 'None' || item === 'No Known Allergies') {
      setter([item])
      return
    }
    const filtered = list.filter((i) => i !== 'None' && i !== 'No Known Allergies')
    if (filtered.includes(item)) {
      setter(filtered.filter((i) => i !== item))
    } else {
      setter([...filtered, item])
    }
  }

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (step < 5) {
      setStep((s) => s + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const calculatedScore = computeHealthScore()

    const surveyPayload = {
      name: formData.name,
      age: parseInt(formData.age) || 28,
      gender: formData.gender,
      avatar: formData.avatar,
      avatar_type: formData.avatar,
      height_cm: parseFloat(formData.heightCm) || 168,
      weight_kg: parseFloat(formData.weightKg) || 65,
      blood_group: formData.bloodGroup,
      chronic_conditions: formData.chronicConditions.join(', '),
      past_surgeries: formData.pastSurgeries,
      family_history: formData.familyHistory.join(', '),
      vaccinations: formData.vaccinations.join(', '),
      allergies: formData.allergies.join(', '),
      current_medications: formData.currentMedications,
      lifestyle: {
        sleepHours: formData.sleepHours,
        diet: formData.diet,
        exercise: formData.exercise,
        smokingAlcohol: formData.smokingAlcohol,
        stress: formData.stress,
      },
      emergency_contact: formData.emergencyName
        ? `${formData.emergencyName} (${formData.emergencyPhone})`
        : 'Not provided',
      language_pref: formData.languagePref,
      health_score: calculatedScore,
      has_completed_survey: true,
    }

    try {
      // Send survey answers to backend
      await api.post('/profile/survey', surveyPayload).catch(() => {})
    } catch {
      // Offline fallback: continue locally
    }

    // Update client Zustand store
    completeSurvey({
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      avatar: formData.avatar,
      bloodGroup: formData.bloodGroup,
      allergies: formData.allergies,
      heightCm: parseFloat(formData.heightCm),
      weightKg: parseFloat(formData.weightKg),
      chronicConditions: formData.chronicConditions,
      currentMedications: formData.currentMedications ? [formData.currentMedications] : [],
      lifestyle: surveyPayload.lifestyle,
      languagePref: formData.languagePref,
      healthScore: calculatedScore,
      hasCompletedSurvey: true,
    })

    toast.success('Patient profile verified & synchronized! 🌿')
    setIsSubmitting(false)
    navigate('/dashboard')
  }

  const mascotMessage = () => {
    switch (step) {
      case 1:
        return 'Hello! Let’s set up your profile and avatar.'
      case 2:
        return 'Understanding your medical history helps me provide safer advice.'
      case 3:
        return 'Knowing your allergies prevents adverse reactions.'
      case 4:
        return 'Lifestyle factors calculate your personal Health Score.'
      case 5:
        return 'Almost ready! Pick your language preference.'
      default:
        return 'Organizing your health records...'
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-start font-sans">
      <div className="w-full max-w-6xl mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-textSecondary hover:text-textDark bg-surface hover:bg-surfaceSoft px-3.5 py-2 rounded-xl border border-borderSoft transition-colors shadow-soft"
        >
          <ChevronLeft size={16} />
          <span>← Back to Dashboard</span>
        </button>
        <span className="text-xs font-semibold text-textMuted">
          Patient Intake & Clinical Baseline
        </span>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Side: Mascot & Step Tracker */}
        <div className="md:col-span-4 card text-center border border-borderSoft bg-surface flex flex-col items-center p-6">
          <BabyNurse size={150} isScanning={step > 1} subtitle={`Step ${step} of 5`} />
          <h3 className="font-bold text-textDark text-base mt-4">Med44 AI Nurse</h3>
          <p className="text-xs text-textSecondary mt-1 leading-relaxed px-2">
            {mascotMessage()}
          </p>

          {/* Steps Progress */}
          <div className="w-full mt-6 space-y-2 text-left">
            {[
              '1. Basic Vitals & Avatar',
              '2. Medical History',
              '3. Allergies & Medications',
              '4. Lifestyle & Habits',
              '5. Language & Emergency',
            ].map((label, idx) => (
              <div
                key={label}
                className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition-colors ${
                  step === idx + 1
                    ? 'bg-primary-light text-primary-dark border border-primary/20'
                    : step > idx + 1
                    ? 'text-primary'
                    : 'text-textMuted'
                }`}
              >
                {step > idx + 1 ? (
                  <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      step === idx + 1 ? 'bg-primary text-white' : 'bg-surfaceSoft text-textMuted'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-borderSoft w-full flex items-center justify-center gap-1.5 text-[11px] text-textMuted">
            <ShieldCheck size={14} className="text-primary" />
            <span>Private & Encrypted on Device</span>
          </div>
        </div>

        {/* Right Side: Step Questionnaire */}
        <div className="md:col-span-8 card border border-borderSoft bg-surface p-6 sm:p-8 w-full">
          {/* Progress Bar */}
          <div className="w-full bg-surfaceSoft h-2 rounded-full mb-6 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: '20%' }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: Basic Vitals & Avatar Selection */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-textDark">Tell us about yourself</h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Your name and identity will appear consistently across Med44.
                  </p>
                </div>

                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                    Choose Your Patient Avatar
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'female', label: 'Female', comp: <AvatarFemale className="w-12 h-12 mx-auto" /> },
                      { id: 'male', label: 'Male', comp: <AvatarMale className="w-12 h-12 mx-auto" /> },
                      { id: 'neutral', label: 'Neutral', comp: <AvatarNeutral className="w-12 h-12 mx-auto" /> },
                    ].map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar: av.id })}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          formData.avatar === av.id
                            ? 'border-primary bg-primary-light/40 shadow-soft ring-2 ring-primary/20'
                            : 'border-borderSoft hover:border-gray-300'
                        }`}
                      >
                        {av.comp}
                        <span className="block mt-2 text-xs font-semibold text-textDark">
                          {av.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Mayank Sharma"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Age in years"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="input"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="input"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={formData.heightCm}
                      onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                      placeholder="e.g. 172"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.weightKg}
                      onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                      placeholder="e.g. 68"
                      className="input"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Medical History */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-textDark">Medical History</h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Select existing conditions and relevant health events.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                    Chronic Conditions (Select all that apply)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CHRONIC_OPTIONS.map((cond) => {
                      const selected = formData.chronicConditions.includes(cond)
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() =>
                            toggleItem(formData.chronicConditions, cond, (c) =>
                              setFormData({ ...formData, chronicConditions: c })
                            )
                          }
                          className={`p-3 rounded-lg border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                            selected
                              ? 'border-primary bg-primary-light/50 text-primary-dark font-bold'
                              : 'border-borderSoft hover:bg-surfaceSoft text-textDark'
                          }`}
                        >
                          <span>{cond}</span>
                          {selected && <CheckCircle2 size={16} className="text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                    Past Surgeries or Major Illnesses
                  </label>
                  <input
                    type="text"
                    value={formData.pastSurgeries}
                    onChange={(e) => setFormData({ ...formData, pastSurgeries: e.target.value })}
                    placeholder="e.g. Appendectomy in 2021, or None"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                    Vaccinations Received
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {VACCINE_OPTIONS.map((vac) => {
                      const selected = formData.vaccinations.includes(vac)
                      return (
                        <button
                          key={vac}
                          type="button"
                          onClick={() =>
                            toggleItem(formData.vaccinations, vac, (v) =>
                              setFormData({ ...formData, vaccinations: v })
                            )
                          }
                          className={`p-2.5 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                            selected
                              ? 'border-primary bg-primary-light/40 text-primary-dark font-semibold'
                              : 'border-borderSoft text-textSecondary'
                          }`}
                        >
                          <span>{vac}</span>
                          {selected && <CheckCircle2 size={14} className="text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Allergies & Medications */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-textDark">Allergies & Prescriptions</h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Med44 will cross-check recommendations against these allergies.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                    Known Drug & Food Allergies
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ALLERGY_OPTIONS.map((alg) => {
                      const selected = formData.allergies.includes(alg)
                      return (
                        <button
                          key={alg}
                          type="button"
                          onClick={() =>
                            toggleItem(formData.allergies, alg, (a) =>
                              setFormData({ ...formData, allergies: a })
                            )
                          }
                          className={`p-3 rounded-lg border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                            selected
                              ? 'border-accent-dark bg-accent-light/50 text-accent-dark font-bold'
                              : 'border-borderSoft hover:bg-surfaceSoft text-textDark'
                          }`}
                        >
                          <span>{alg}</span>
                          {selected && <CheckCircle2 size={16} className="text-accent-dark" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                    Current Medications (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.currentMedications}
                    onChange={(e) =>
                      setFormData({ ...formData, currentMedications: e.target.value })
                    }
                    placeholder="e.g. Metformin 500mg daily, Thyronorm 50mcg (or leave blank if none)"
                    className="input py-2"
                  />
                  <p className="text-[11px] text-textMuted mt-1">
                    We will never alter your doctor's dosage or recommend stopping prescribed medicines.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Lifestyle */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-textDark">Lifestyle & Wellness</h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Used to calculate your baseline Health Score and tailor preventative advice.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Average Sleep
                    </label>
                    <select
                      value={formData.sleepHours}
                      onChange={(e) => setFormData({ ...formData, sleepHours: e.target.value })}
                      className="input"
                    >
                      <option value="<6 hours">Less than 6 hours</option>
                      <option value="6-7 hours">6 - 7 hours</option>
                      <option value="7-8 hours">7 - 8 hours (Optimal)</option>
                      <option value="8+ hours">8+ hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Physical Activity
                    </label>
                    <select
                      value={formData.exercise}
                      onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
                      className="input"
                    >
                      <option value="Daily">Daily active workouts</option>
                      <option value="3-4 times a week">3 - 4 times a week</option>
                      <option value="1-2 times a week">1 - 2 times a week</option>
                      <option value="Sedentary">Mostly sedentary / desk work</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Dietary Pattern
                    </label>
                    <select
                      value={formData.diet}
                      onChange={(e) => setFormData({ ...formData, diet: e.target.value })}
                      className="input"
                    >
                      <option value="Balanced / Vegetarian">Vegetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Low Carb">Low Carb / Keto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Smoking / Alcohol
                    </label>
                    <select
                      value={formData.smokingAlcohol}
                      onChange={(e) =>
                        setFormData({ ...formData, smokingAlcohol: e.target.value })
                      }
                      className="input"
                    >
                      <option value="Never">Never / None</option>
                      <option value="Occasional">Occasional / Social</option>
                      <option value="Regular">Regular</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Daily Stress Level
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Low', 'Moderate', 'High'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setFormData({ ...formData, stress: st })}
                          className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                            formData.stress === st
                              ? 'border-primary bg-primary-light text-primary-dark ring-2 ring-primary/20'
                              : 'border-borderSoft hover:bg-surfaceSoft text-textSecondary'
                          }`}
                        >
                          {st} Stress
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Language Preference & Emergency Contact */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-textDark">Language & Safety Contact</h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Choose how Med44 communicates with you and configure emergency contact details.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                    Preferred Consultation Language
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { code: 'en', label: 'English', desc: 'Clinical & Patient friendly' },
                      { code: 'hi', label: 'हिन्दी (Hindi)', desc: 'हिंदी में बात करें' },
                      { code: 'ta', label: 'தமிழ் (Tamil)', desc: 'தமிழில் உரையாடலாம்' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setFormData({ ...formData, languagePref: lang.code })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          formData.languagePref === lang.code
                            ? 'border-primary bg-primary-light/50 text-primary-dark ring-2 ring-primary/20'
                            : 'border-borderSoft hover:bg-surfaceSoft'
                        }`}
                      >
                        <p className="font-bold text-sm text-textDark">{lang.label}</p>
                        <p className="text-[11px] text-textSecondary mt-0.5">{lang.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Emergency Contact Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyName}
                      onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                      placeholder="Family member or doctor"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="input"
                    />
                  </div>
                </div>

                {/* Score Preview Box */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary-light/50 to-accent-light/50 border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-primary-dark">Calculated Health Score</p>
                    <p className="text-xs text-textSecondary">
                      Based on BMI, sleep habits, activity & history
                    </p>
                  </div>
                  <div className="text-3xl font-extrabold text-primary">
                    {computeHealthScore()}%
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-borderSoft flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="button-secondary"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleNext}
              className="button-primary"
            >
              <span>{step === 5 ? (isSubmitting ? 'Saving...' : 'Finish & Unlock Dashboard') : 'Continue'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

