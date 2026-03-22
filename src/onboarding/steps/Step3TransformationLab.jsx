/**
 * Step 3 – The Transformation Lab (Loading Screen)
 *
 * "Labour illusion" loader showing staggered AI processing steps.
 * This is a stub — full implementation in the next phase.
 *
 * Features planned:
 *  - Staggered animation of processing steps ("Mixing ingredients…",
 *    "Calculating muscle fibres…", etc.)
 *  - Circular progress arc with glow effect
 *  - Skeleton placeholders for the incoming plan
 */

import { useEffect } from 'react'
import { motion } from 'framer-motion'

const LOADING_STEPS = [
  { emoji: '🧬', text: 'Analysing your profile...' },
  { emoji: '🔥', text: 'Calculating calorie targets...' },
  { emoji: '💪', text: 'Building your training schedule...' },
  { emoji: '🥗', text: 'Designing your nutrition plan...' },
  { emoji: '✨', text: 'Adding personalised tips...' },
]

export default function Step3TransformationLab({ plan }) {
  // If plan has an error, show it
  if (plan?.error) {
    return (
      <div className="pt-16 flex flex-col items-center text-center gap-4">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-xl font-bold text-fitblack">Something went wrong</h2>
        <p className="text-sm text-gray-500">{plan.error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="pt-10 flex flex-col items-center text-center gap-8">
      {/* Spinning ring */}
      <div className="relative w-24 h-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-accent/20 border-t-accent"
        />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🧪</div>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-fitblack mb-2">Transformation Lab</h2>
        <p className="text-sm text-gray-500">Our AI is cooking up your personalised plan…</p>
      </div>

      {/* Staggered processing steps */}
      <div className="flex flex-col gap-3 w-full max-w-xs text-left">
        {LOADING_STEPS.map((s, i) => (
          <motion.div
            key={s.text}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.55, duration: 0.4 }}
            className="flex items-center gap-3 text-sm text-gray-600"
          >
            <span className="text-lg">{s.emoji}</span>
            <span>{s.text}</span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.55 + 0.3 }}
              className="ml-auto text-accent font-bold text-xs"
            >
              ✓
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Skeleton placeholders */}
      <div className="w-full max-w-xs flex flex-col gap-2 mt-2">
        {[80, 60, 75, 45].map((w, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
            className="h-3 rounded-full bg-gray-200"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  )
}
