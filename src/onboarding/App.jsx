import { useState, useEffect } from 'react'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { AnimatePresence, motion } from 'framer-motion'

import ProgressBar from './components/ProgressBar.jsx'
import Step1GoalDrag from './steps/Step1GoalDrag.jsx'
import Step2StatsSliders from './steps/Step2StatsSliders.jsx'
import Step3TransformationLab from './steps/Step3TransformationLab.jsx'
import Step4VictoryMoment from './steps/Step4VictoryMoment.jsx'

// ── Firebase init (same project as the rest of FitFlow) ──────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0',
  authDomain: 'account.binas.app',
  projectId: 'binas-91a32',
  storageBucket: 'binas-91a32.firebasestorage.app',
  messagingSenderId: '971498903694',
  appId: '1:971498903694:web:5ab8b630b183f5204ed1df',
}
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(firebaseApp)

// ── Initial onboarding state ──────────────────────────────────────────────────
const initialData = {
  goal: null,          // 'lose-weight' | 'build-muscle' | 'get-fitter' | 'boost-endurance'
  activityLevel: null, // resolved from Step 2 slider (1–5 → string)
  gender: 'male',      // 'male' | 'female' | 'other'
  age: 25,
  weight: 75,          // kg
  height: 178,         // cm
}

// Step progress percentages
const STEP_PROGRESS = { 1: 25, 2: 50, 3: 75, 4: 100 }

export default function App() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState(initialData)
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward

  // ── Firebase auth guard ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        window.location.replace('/auth/signup.html')
        return
      }
      setUser(firebaseUser)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  // ── Step navigation ───────────────────────────────────────────────────────
  function next(updates = {}) {
    setData((d) => ({ ...d, ...updates }))
    setDirection(1)
    setStep((s) => Math.min(s + 1, 4))
  }

  function back() {
    setDirection(-1)
    setStep((s) => Math.max(s - 1, 1))
  }

  // ── API call (Step 2 → Step 3) ────────────────────────────────────────────
  async function generatePlan(finalData) {
    next(finalData)   // advance to Step 3 (loading screen)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goal: finalData.goal ?? data.goal,
          activityLevel: finalData.activityLevel ?? data.activityLevel,
          gender: finalData.gender ?? data.gender,
          age: finalData.age ?? data.age,
          weight: finalData.weight ?? data.weight,
          height: finalData.height ?? data.height,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Request failed')
      }
      const json = await res.json()
      setPlan(json.plan)
      setDirection(1)
      setStep(4)
    } catch (err) {
      // Surface error inside Step 3
      setPlan({ error: err.message || 'Could not generate your plan.' })
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full"
        />
      </div>
    )
  }

  // ── Page slide variants ───────────────────────────────────────────────────
  const variants = {
    enter:  (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
  }

  const stepProps = { data, user, next, back, generatePlan }

  return (
    <div className="min-h-dvh flex flex-col items-center bg-white overflow-x-hidden">
      {/* ── Top progress bar ─────────────────────────────────────────── */}
      <ProgressBar progress={STEP_PROGRESS[step]} />

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <a href="/" className="flex items-center gap-2 self-start px-6 py-5 no-underline text-fitblack font-bold text-sm">
        <span className="w-[26px] h-[26px] bg-fitblack rounded-[7px] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white" />
          </svg>
        </span>
        FitFlow
      </a>

      {/* ── Step content ─────────────────────────────────────────────── */}
      <div className="w-full max-w-2xl px-6 pb-16 flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full"
          >
            {step === 1 && <Step1GoalDrag {...stepProps} />}
            {step === 2 && <Step2StatsSliders {...stepProps} />}
            {step === 3 && <Step3TransformationLab {...stepProps} plan={plan} />}
            {step === 4 && <Step4VictoryMoment {...stepProps} plan={plan} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
