/**
 * Step 1 – Gamified Goal Selection
 *
 * Desktop: user drags the central avatar to one of 4 goal zones.
 * Mobile:  tap-to-select fallback (drag is unreliable on touch).
 *
 * Framer Motion handles drag physics; bounding-box collision detects
 * which zone is currently "hit" during the drag.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

// ── Goal zone definitions ─────────────────────────────────────────────────────
const GOALS = [
  {
    value: 'lose-weight',
    label: 'Lose Weight',
    desc: 'Burn fat & get lean',
    gradient: 'from-orange-400 to-red-500',
    glow: 'rgba(249,115,22,0.45)',
    ring: 'ring-orange-400',
    bg: 'bg-orange-50',
    // SVG: flame
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M12 2c0 0-5 4.5-5 9.5a5 5 0 0 0 10 0C17 6.5 12 2 12 2z" />
        <path d="M12 12c0 0-2 2-2 3.5a2 2 0 0 0 4 0C14 14 12 12 12 12z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    value: 'build-muscle',
    label: 'Build Muscle',
    desc: 'Gain strength & size',
    gradient: 'from-blue-500 to-purple-600',
    glow: 'rgba(139,92,246,0.45)',
    ring: 'ring-purple-500',
    bg: 'bg-purple-50',
    // SVG: dumbbell
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <rect x="2" y="10" width="4" height="4" rx="1" />
        <rect x="18" y="10" width="4" height="4" rx="1" />
        <rect x="5" y="8" width="3" height="8" rx="1" />
        <rect x="16" y="8" width="3" height="8" rx="1" />
        <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    value: 'get-fitter',
    label: 'Get Fitter',
    desc: 'Improve overall health',
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'rgba(16,185,129,0.45)',
    ring: 'ring-emerald-400',
    bg: 'bg-emerald-50',
    // SVG: heartbeat
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    value: 'boost-endurance',
    label: 'Boost Endurance',
    desc: 'Last longer, go further',
    gradient: 'from-yellow-400 to-orange-400',
    glow: 'rgba(251,191,36,0.5)',
    ring: 'ring-yellow-400',
    bg: 'bg-yellow-50',
    // SVG: lightning bolt
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
]

// ── Collision detection helper ────────────────────────────────────────────────
function getHitZone(avatarEl, zoneRefs) {
  if (!avatarEl) return null
  const aRect = avatarEl.getBoundingClientRect()
  const aCx = aRect.left + aRect.width / 2
  const aCy = aRect.top + aRect.height / 2

  for (let i = 0; i < zoneRefs.length; i++) {
    const el = zoneRefs[i]?.current
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (aCx >= r.left && aCx <= r.right && aCy >= r.top && aCy <= r.bottom) {
      return i
    }
  }
  return null
}

// ── Avatar SVG ────────────────────────────────────────────────────────────────
// TODO: Replace this SVG with your own custom 3D model or animated illustration.
// Recommended: use a <Canvas> (react-three-fiber) or a Lottie animation here.
function AvatarIcon({ hitGoal }) {
  const goal = hitGoal !== null ? GOALS[hitGoal] : null
  return (
    <div className="relative flex items-center justify-center w-[72px] h-[72px]">
      {/* Outer glow ring — pulses when hovering a zone */}
      <motion.div
        animate={goal ? {
          boxShadow: [`0 0 0 0px ${goal.glow}`, `0 0 0 18px ${goal.glow.replace('0.45', '0')}`, `0 0 0 0px ${goal.glow}`],
        } : {
          boxShadow: '0 0 0 0px rgba(16,185,129,0)',
        }}
        transition={{ duration: 0.8, repeat: goal ? Infinity : 0, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full"
      />
      {/* Avatar body */}
      <motion.div
        animate={goal ? { scale: 1.08 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="w-[72px] h-[72px] rounded-full bg-fitblack flex items-center justify-center shadow-xl relative z-10"
      >
        {/* TODO: Swap this SVG silhouette for a 3D character or illustration */}
        <svg viewBox="0 0 36 36" fill="none" className="w-9 h-9 text-white">
          {/* Head */}
          <circle cx="18" cy="9" r="5" fill="currentColor" opacity="0.9" />
          {/* Body */}
          <path d="M10 28c0-5.5 3.6-9 8-9s8 3.5 8 9" fill="currentColor" opacity="0.8" />
          {/* Arms */}
          <line x1="10" y1="21" x2="5" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          <line x1="26" y1="21" x2="31" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      </motion.div>
    </div>
  )
}

// ── Goal Zone Card ─────────────────────────────────────────────────────────────
function GoalZone({ goal, index, zoneRef, isHit, isSelected, onTap, isMobile }) {
  return (
    <motion.button
      ref={zoneRef}
      onClick={() => onTap(index)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 280, damping: 24 }}
      whileHover={isMobile ? { scale: 1.03 } : {}}
      whileTap={{ scale: 0.97 }}
      className={[
        'relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 cursor-pointer',
        'transition-all duration-200 select-none outline-none',
        isHit || isSelected
          ? `border-transparent ring-4 ${goal.ring} ${goal.bg} shadow-lg`
          : 'border-gray-200 bg-gray-50 hover:border-gray-300',
      ].join(' ')}
    >
      {/* Glow overlay on hit */}
      {(isHit || isSelected) && (
        <motion.div
          layoutId={`glow-${goal.value}`}
          className="absolute inset-0 rounded-2xl opacity-20"
          style={{ background: `radial-gradient(circle at center, ${goal.glow} 0%, transparent 70%)` }}
        />
      )}

      {/* Icon */}
      <motion.div
        animate={isHit ? { scale: [1, 1.25, 1.1], rotate: [0, -8, 8, 0] } : isSelected ? { scale: 1.1 } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className={[
          'w-14 h-14 rounded-xl flex items-center justify-center',
          `bg-gradient-to-br ${goal.gradient} text-white shadow-md`,
        ].join(' ')}
      >
        {goal.icon}
      </motion.div>

      {/* Text */}
      <div className="text-center">
        <p className="font-bold text-sm text-fitblack leading-tight">{goal.label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{goal.desc}</p>
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow"
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Step1GoalDrag({ data, next }) {
  const [hitZone, setHitZone] = useState(null)       // index of zone avatar is over
  const [selected, setSelected] = useState(null)     // confirmed selection index
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const avatarRef = useRef(null)
  const zoneRefs = GOALS.map(() => useRef(null))     // eslint-disable-line react-hooks/rules-of-hooks

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Detect touch/mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches)
  }, [])

  // Continuously check collision while dragging
  const checkCollision = useCallback(() => {
    const idx = getHitZone(avatarRef.current, zoneRefs)
    setHitZone(idx)
  }, [zoneRefs])

  function handleDragStart() {
    setIsDragging(true)
    setSelected(null)
  }

  function handleDrag() {
    checkCollision()
  }

  async function handleDragEnd() {
    setIsDragging(false)
    const hit = getHitZone(avatarRef.current, zoneRefs)

    if (hit !== null) {
      // Snap avatar back to center with spring
      setSelected(hit)
      await animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
      await animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 })
      // Brief pause so user sees the selected state, then advance
      setTimeout(() => {
        next({ goal: GOALS[hit].value })
      }, 600)
    } else {
      // No hit — spring back to center
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 })
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 25 })
      setHitZone(null)
    }
  }

  // Mobile: tap a zone card directly
  function handleTap(index) {
    setSelected(index)
    setTimeout(() => {
      next({ goal: GOALS[index].value })
    }, 400)
  }

  return (
    <div className="pt-6 pb-4">
      {/* Header */}
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3"
      >
        Step 1 of 4
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-3xl font-extrabold text-fitblack mb-2 leading-tight"
      >
        What&apos;s your<br />
        <span className="text-accent">fitness goal?</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-sm text-gray-500 mb-8"
      >
        {isMobile
          ? 'Tap your goal below to get started.'
          : 'Drag your avatar into a goal zone — or tap to select.'}
      </motion.p>

      {/* ── Desktop layout: avatar + surrounding zones ── */}
      {!isMobile ? (
        <div className="relative flex items-center justify-center min-h-[380px]">
          {/* Goal zones grid */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-4 pointer-events-auto">
            {GOALS.map((goal, i) => (
              <GoalZone
                key={goal.value}
                goal={goal}
                index={i}
                zoneRef={zoneRefs[i]}
                isHit={hitZone === i}
                isSelected={selected === i}
                onTap={handleTap}
                isMobile={false}
              />
            ))}
          </div>

          {/* Draggable avatar — sits on top */}
          <motion.div
            ref={avatarRef}
            drag
            dragMomentum={false}
            style={{ x, y }}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="drag-avatar relative z-20"
            whileDrag={{ scale: 1.12 }}
          >
            <AvatarIcon hitGoal={isDragging ? hitZone : (selected ?? null)} />
          </motion.div>

          {/* Drag hint label */}
          {!isDragging && selected === null && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="absolute bottom-0 left-0 right-0 text-center text-xs text-gray-400 font-medium pb-1"
            >
              ↑ drag me into a zone ↑
            </motion.p>
          )}
        </div>
      ) : (
        // ── Mobile layout: simple 2×2 tap grid ──
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((goal, i) => (
            <GoalZone
              key={goal.value}
              goal={goal}
              index={i}
              zoneRef={zoneRefs[i]}
              isHit={false}
              isSelected={selected === i}
              onTap={handleTap}
              isMobile={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
