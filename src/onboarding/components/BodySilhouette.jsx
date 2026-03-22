/**
 * BodySilhouette
 *
 * An SVG figure that morphs in real-time based on the user's stats.
 *
 * TODO: Replace this SVG with a custom 3D character (react-three-fiber / Spline)
 *       or a detailed illustration/Lottie animation. The props interface stays the same:
 *         - heightPct  : 0–1 (normalized within the min–max range)
 *         - weightPct  : 0–1
 *         - activityIdx: 0–4 (0 = sedentary, 4 = athlete)
 *         - gender     : 'male' | 'female' | 'other'
 */

import { motion } from 'framer-motion'

// Map weight percentage to body width scale (0.72 → 1.35)
function weightToScale(pct) {
  return 0.72 + pct * 0.63
}

// Map height percentage to body height scale (0.82 → 1.18)
function heightToScale(pct) {
  return 0.82 + pct * 0.36
}

// Activity colors: low = muted, high = vibrant accent
const ACTIVITY_COLORS = [
  '#a3a3a3', // sedentary
  '#6ee7b7', // lightly active
  '#10b981', // moderately active
  '#059669', // very active
  '#047857', // athlete
]

const ACTIVITY_LABELS = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Athlete']

export default function BodySilhouette({ heightPct = 0.5, weightPct = 0.5, activityIdx = 2, gender = 'male' }) {
  const wScale = weightToScale(weightPct)
  const hScale = heightToScale(heightPct)
  const color = ACTIVITY_COLORS[activityIdx]

  // Waist taper: wider body = less taper (pear/oval vs. V-shape)
  const waistX = 50 - 14 * (1 - weightPct * 0.4)
  const waistXR = 50 + 14 * (1 - weightPct * 0.4)

  // Hip width scales with weight
  const hipW = 16 + weightPct * 10

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* SVG figure */}
      <motion.div
        animate={{ scaleX: wScale, scaleY: hScale }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        style={{ originY: 'bottom' }}
        className="w-28 h-52 flex items-end justify-center"
      >
        {/* TODO: Replace the SVG below with a 3D model, Spline scene, or Lottie animation */}
        <svg
          viewBox="0 0 100 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-label="Body silhouette"
        >
          {/* ── Head ─────────────────────────────────────────────── */}
          <motion.circle
            cx="50" cy="22" r="14"
            fill={color}
            opacity="0.9"
            animate={{ fill: color }}
            transition={{ duration: 0.4 }}
          />

          {/* ── Neck ─────────────────────────────────────────────── */}
          <rect x="44" y="34" width="12" height="10" rx="4" fill={color} opacity="0.75" />

          {/* ── Torso ────────────────────────────────────────────── */}
          {/* Shoulders → waist → hips path */}
          <motion.path
            animate={{
              d: `M${50 - 22} 46
                  Q${50 - 24} 50 ${waistX} 90
                  Q${50 - hipW} 100 ${50 - hipW} 110
                  L${50 + hipW} 110
                  Q${50 + hipW} 100 ${waistXR} 90
                  Q${50 + 24} 50 ${50 + 22} 46 Z`,
            }}
            fill={color}
            opacity="0.85"
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />

          {/* ── Arms ─────────────────────────────────────────────── */}
          {/* Left arm */}
          <motion.path
            animate={{ d: `M${50 - 22} 50 Q${50 - 32} 72 ${50 - 28} 100` }}
            stroke={color} strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.75"
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
          {/* Right arm */}
          <motion.path
            animate={{ d: `M${50 + 22} 50 Q${50 + 32} 72 ${50 + 28} 100` }}
            stroke={color} strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.75"
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />

          {/* ── Legs ─────────────────────────────────────────────── */}
          {/* Left leg */}
          <motion.path
            animate={{ d: `M${50 - hipW * 0.5} 110 Q${50 - 16} 148 ${50 - 12} 190` }}
            stroke={color} strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.8"
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
          {/* Right leg */}
          <motion.path
            animate={{ d: `M${50 + hipW * 0.5} 110 Q${50 + 16} 148 ${50 + 12} 190` }}
            stroke={color} strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.8"
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />

          {/* ── Activity aura rings (shown for high activity) ────── */}
          {activityIdx >= 3 && (
            <>
              <motion.circle
                cx="50" cy="100"
                r="58"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                opacity={activityIdx === 4 ? 0.25 : 0.15}
                animate={{ r: [56, 60, 56] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {activityIdx === 4 && (
                <motion.circle
                  cx="50" cy="100"
                  r="70"
                  stroke={color}
                  strokeWidth="1"
                  fill="none"
                  opacity="0.1"
                  animate={{ r: [68, 74, 68] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                />
              )}
            </>
          )}
        </svg>
      </motion.div>

      {/* Activity level badge */}
      <motion.span
        animate={{ backgroundColor: color, color: '#fff' }}
        transition={{ duration: 0.3 }}
        className="text-xs font-semibold px-3 py-1 rounded-full shadow-sm"
      >
        {ACTIVITY_LABELS[activityIdx]}
      </motion.span>
    </div>
  )
}
