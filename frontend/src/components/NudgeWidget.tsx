/**
 * NudgeWidget — Duolingo-inspired daily medicine + health check-in widget.
 * Wired to nudgeStore for streak/XP tracking.
 * Shows different question types based on user profile.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Zap, CheckCircle2, X, ChevronRight } from 'lucide-react'
import { useNudgeStore, playDuolingoChime } from '../store/nudgeStore'
import { useAuthStore } from '../store/authStore'
import { useMedicationStore } from '../store/medicationStore'

type NudgeQuestion = {
  id: string
  emoji: string
  question: string
  options: string[]
  type: 'medicine' | 'lifestyle' | 'symptom' | 'followup'
}

function buildQuestions(userName: string, medCount: number): NudgeQuestion[] {
  const firstName = userName?.split(' ')[0] || 'there'
  const qs: NudgeQuestion[] = [
    {
      id: 'med_today',
      emoji: '💊',
      question: `Hey ${firstName}! Did you take your medicines today?`,
      options: ['✅ Yes, all taken', '⏰ Not yet', '❌ Missed today'],
      type: 'medicine',
    },
    {
      id: 'water_intake',
      emoji: '💧',
      question: 'How much water have you had today?',
      options: ['🥤 2+ litres (great!)', '🥛 1 litre (okay)', '😬 Barely any'],
      type: 'lifestyle',
    },
    {
      id: 'sleep_quality',
      emoji: '😴',
      question: 'How did you sleep last night?',
      options: ['😊 7-8 hrs (great)', '😐 5-6 hrs (okay)', '😩 Less than 5 hrs'],
      type: 'lifestyle',
    },
    {
      id: 'energy_level',
      emoji: '⚡',
      question: 'How is your energy level today?',
      options: ['🚀 Feeling great!', '😐 Average', '😞 Low energy'],
      type: 'symptom',
    },
    ...(medCount > 0
      ? [
          {
            id: 'med_streak',
            emoji: '🔥',
            question: `You have ${medCount} active medication${medCount > 1 ? 's' : ''}. Keep the streak going!`,
            options: ['✅ Taken today!', '⏰ Will take now', '📅 Remind me later'],
            type: 'medicine' as const,
          },
        ]
      : []),
    {
      id: 'followup_check',
      emoji: '📋',
      question: 'Any follow-up appointments coming up this week?',
      options: ['📆 Yes, I\'m prepared', '🔍 Let me check', '❌ No upcoming'],
      type: 'followup',
    },
  ]
  return qs
}

export default function NudgeWidget() {
  const { user } = useAuthStore()
  const { medications } = useMedicationStore()
  const {
    medicineStreak,
    healthXP,
    todayMedTaken,
    answeredChecks,
    takeMedicine,
    recordAnswer,
    resetStreakIfBroken,
  } = useNudgeStore()

  const [dismissed, setDismissed] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [showXP, setShowXP] = useState(false)
  const [gainedXP, setGainedXP] = useState(0)

  useEffect(() => {
    resetStreakIfBroken()
  }, [resetStreakIfBroken])

  const activeMeds = medications.filter((m) => m.is_active !== false)
  const questions = buildQuestions(user?.name || 'there', activeMeds.length)

  // Pick today's question based on day-of-week rotation
  const dayIdx = new Date().getDay() % questions.length
  const todayQ = questions[dayIdx]

  // Check if already answered today
  const todayKey = new Date().toISOString().split('T')[0]
  const alreadyAnswered = answeredChecks[`${todayKey}_${todayQ.id}`]

  const handleAnswer = (option: string) => {
    const isMedQuestion = todayQ.type === 'medicine'
    if (isMedQuestion && (option.startsWith('✅'))) {
      const { isNew } = takeMedicine()
      if (isNew) {
        playDuolingoChime()
        setGainedXP(25)
      } else {
        setGainedXP(10)
      }
    } else {
      recordAnswer(todayQ.id, option)
      setGainedXP(10)
    }
    setAnswered(true)
    setShowXP(true)
    setTimeout(() => setShowXP(false), 2500)
  }

  if (dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card border border-borderSoft bg-gradient-to-r from-primary-light/40 via-white to-accent-light/30 relative overflow-hidden"
    >
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 text-textMuted hover:text-textDark hover:bg-surfaceSoft rounded-lg transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="p-5">
        {/* Streak + XP Bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 border border-orange-200">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-700">{medicineStreak} day streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-light border border-primary/20">
            <Zap size={14} className="text-primary-dark" />
            <span className="text-xs font-bold text-primary-dark">{healthXP} XP</span>
          </div>

          {/* XP gain flash */}
          <AnimatePresence>
            {showXP && (
              <motion.span
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                className="text-xs font-bold text-primary-dark"
              >
                +{gainedXP} XP!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Question or Completion State */}
        <AnimatePresence mode="wait">
          {alreadyAnswered || answered ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3"
            >
              <CheckCircle2 size={22} className="text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-textDark">Daily check-in complete! 🎉</p>
                <p className="text-xs text-textSecondary">
                  {todayMedTaken
                    ? 'Medicines logged. Keep up the great streak!'
                    : 'Thanks for checking in. See you tomorrow!'}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="question" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-sm font-semibold text-textDark mb-3">
                <span className="mr-2 text-base">{todayQ.emoji}</span>
                {todayQ.question}
              </p>
              <div className="flex flex-wrap gap-2">
                {todayQ.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-borderSoft text-xs font-semibold text-textDark hover:border-primary/50 hover:bg-primary-light/50 transition-all flex items-center gap-1.5 shadow-soft"
                  >
                    {opt}
                    <ChevronRight size={11} className="text-textMuted" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

