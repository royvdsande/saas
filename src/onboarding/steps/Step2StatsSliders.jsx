/**
 * Step 2 – Interactive Stats Sliders
 *
 * Custom-styled range sliders for age, weight, height, and activity level.
 * A central BodySilhouette SVG morphs in real-time as sliders are moved.
 *
 * On mobile: silhouette appears at top, sliders stack below.
 * On desktop: sliders flank the silhouette in a 3-column layout.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BodySilhouette from '../components/BodySilhouette.jsx'

// ── Slider config ─────────────────────────────────────────────────────────────
const SLIDERS = [
  { key: 'age',    label: 'Age',    min: 14, max: 99,  unit: 'yrs', step: 1, default: 25  },
  { key: 'weight', label: 'Weight', min: 30, max: 300, unit: 'kg',  step: 1, default: 75  },
  { key: 'height', label: 'Height', min: 120, max: 250,unit: 'cm',  step: 1, default: 178 },
]

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',         label: 'Sedentary',   emoji: '🪑', idx: 0 },
  { value: 'lightly-active',    label: 'Light',       emoji: '🚶', idx: 1 },
  { value: 'moderately-active', label: 'Moderate',    emoji: '🏃', idx: 2 },
  { value: 'very-active',       label: 'Very Active', emoji: '🏋️', idx: 3 },
  { value: 'athlete',           label: 'Athlete',     emoji: '🏆', idx: 4 },
]

const GENDER_OPTIONS = [
  { value: 'male',   label: '♂ Male'   },
  { value: 'female', label: '♀ Female' },
  { value: 'other',  label: '⚧ Other'  },
]

// ── Normalise a value to 0–1 within a range ───────────────────────────────────
function norm(val, min, max) {
  return Math.max(0, Math.min(1, (val - min) / (max - min)))
}

// ── Animated value badge ──────────────────────────────────────────────────────
function ValueBadge({ value, unit }) {
  return (
    <motion.div
      key={value}
      initial={{ scale: 1.25, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className="flex items-baseline gap-1"
    >
      <span className="text-2xl font-extrabold text-fitblack tabular-nums">{value}</span>
      <span className="text-xs text-gray-400 font-medium">{unit}</span>
    </motion.div>
  )
}

// ── Single custom slider ──────────────────────────────────────────────────────
function StatSlider({ config, value, onChange }) {
  const pct = norm(value, config.min, config.max) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {config.label}
        </span>
        <ValueBadge value={value} unit={config.unit} />
      </div>

      {/* Track + thumb */}
      <div className="relative h-2 flex items-center">
        {/* Filled portion */}
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-accent transition-all duration-75"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full relative z-10"
          aria-label={config.label}
        />
      </div>

      {/* Min / max labels */}
      <div className="flex justify-between text-[10px] text-gray-300 font-medium px-0.5">
        <span>{config.min}{config.unit}</span>
        <span>{config.max}{config.unit}</span>
      </div>
    </div>
  )
}

// ── Activity level segmented control ─────────────────────────────────────────
function ActivitySegment({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Activity Level
      </span>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {ACTIVITY_OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.94 }}
            className={[
              'flex-1 flex flex-col items-center py-2 rounded-lg text-[10px] font-semibold transition-all duration-200 outline-none',
              value === opt.value
                ? 'bg-white text-fitblack shadow-sm'
                : 'text-gray-400 hover:text-gray-600',
            ].join(' ')}
          >
            <span className="text-base leading-none mb-0.5">{opt.emoji}</span>
            <span className="leading-tight text-center hidden sm:block">{opt.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Step2StatsSliders({ data, next, back, generatePlan }) {
  const [age, setAge]           = useState(data.age ?? 25)
  const [weight, setWeight]     = useState(data.weight ?? 75)
  const [height, setHeight]     = useState(data.height ?? 178)
  const [gender, setGender]     = useState(data.gender ?? 'male')
  const [activity, setActivity] = useState(data.activityLevel ?? 'moderately-active')

  const activityIdx = ACTIVITY_OPTIONS.find((o) => o.value === activity)?.idx ?? 2

  const heightPct = norm(height, 120, 250)
  const weightPct = norm(weight, 30, 300)

  const handleGenerate = useCallback(() => {
    generatePlan({
      age,
      weight,
      height,
      gender,
      activityLevel: activity,
      goal: data.goal,
    })
  }, [age, weight, height, gender, activity, data.goal, generatePlan])

  return (
    <div className="pt-6 pb-4">
      {/* Header */}
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3"
      >
        Step 2 of 4
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-3xl font-extrabold text-fitblack mb-2 leading-tight"
      >
        Your<br />
        <span className="text-accent">stats & level</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-sm text-gray-500 mb-6"
      >
        Slide to set your details — watch your avatar come to life.
      </motion.p>

      {/* ── Gender selector ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex gap-2 mb-6"
      >
        {GENDER_OPTIONS.map((g) => (
          <button
            key={g.value}
            onClick={() => setGender(g.value)}
            className={[
              'flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-150 outline-none',
              gender === g.value
                ? 'border-accent bg-accent text-white shadow'
                : 'border-gray-200 text-gray-500 hover:border-gray-300',
            ].join(' ')}
          >
            {g.label}
          </button>
        ))}
      </motion.div>

      {/* ── Main grid: sliders + silhouette ─────────────────────── */}
      {/* Layout: [left sliders] [silhouette] [right sliders] on desktop */}
      {/*         [silhouette] then [all sliders] on mobile              */}
      <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6 md:items-center gap-6 mb-6">

        {/* Left column: Age + Height */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col gap-5 md:order-1"
        >
          <StatSlider
            config={SLIDERS[0]}
            value={age}
            onChange={setAge}
          />
          <StatSlider
            config={SLIDERS[2]}
            value={height}
            onChange={setHeight}
          />
        </motion.div>

        {/* Centre: live body silhouette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 22 }}
          className="flex justify-center md:order-2"
        >
          <BodySilhouette
            heightPct={heightPct}
            weightPct={weightPct}
            activityIdx={activityIdx}
            gender={gender}
          />
        </motion.div>

        {/* Right column: Weight */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col gap-5 md:order-3"
        >
          <StatSlider
            config={SLIDERS[1]}
            value={weight}
            onChange={setWeight}
          />

          {/* On desktop, activity segment lives in the right column */}
          <div className="hidden md:block">
            <ActivitySegment value={activity} onChange={setActivity} />
          </div>
        </motion.div>
      </div>

      {/* Activity segment — mobile only (full width below grid) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="block md:hidden mb-6"
      >
        <ActivitySegment value={activity} onChange={setActivity} />
      </motion.div>

      {/* ── Navigation buttons ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        <button
          onClick={back}
          className="px-5 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-all duration-150 outline-none"
        >
          ← Back
        </button>

        <motion.button
          onClick={handleGenerate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-3 rounded-xl bg-accent text-white text-sm font-bold shadow-lg shadow-accent/30 hover:bg-accent-dark transition-all duration-150 outline-none"
        >
          Generate my plan →
        </motion.button>
      </motion.div>

      {/* Micro-copy */}
      <p className="text-center text-[11px] text-gray-400 mt-3">
        Takes about 15 seconds · Powered by AI
      </p>
    </div>
  )
}
