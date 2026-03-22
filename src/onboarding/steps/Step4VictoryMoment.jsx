/**
 * Step 4 – Victory Moment / Paywall
 *
 * "Level Complete" screen displaying the AI-generated plan as power-up trophies.
 * This is a stub — full implementation in the next phase.
 *
 * Features planned:
 *  - Confetti burst animation on mount
 *  - Stat cards displayed as "Power-up Trophies" with hover glow effects
 *  - Pulsing "Unlock my Superpower Plan" CTA (paywall)
 *  - Visually de-emphasised "Continue with preview" link
 *  - Blurred plan preview cards beneath the paywall overlay
 */

import { motion } from 'framer-motion'

export default function Step4VictoryMoment({ plan, user }) {
  const handleUnlock = async () => {
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // Uses the default Pro plan price — swap priceId as needed
        body: JSON.stringify({ priceId: null }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      window.location.href = '/pricing'
    }
  }

  return (
    <div className="pt-10 flex flex-col items-center text-center gap-6">
      {/* Trophy emoji burst */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
        className="text-7xl"
      >
        🏆
      </motion.div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-extrabold text-fitblack mb-1"
        >
          Your plan is ready!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-gray-500"
        >
          {plan?.summary ?? 'Your personalised 7-day fitness plan is ready.'}
        </motion.p>
      </div>

      {/* Stat trophy cards */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[
          { label: 'Daily kcal', value: plan?.dailyCalories ?? '—', emoji: '🔥' },
          { label: 'Days',        value: '7',                         emoji: '📅' },
          { label: 'Exercises',   value: (plan?.training ?? []).reduce((s, d) => s + (d.exercises?.length ?? 0), 0) || '—', emoji: '💪' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-accent-50 border border-accent/20 cursor-default"
          >
            <span className="text-2xl">{stat.emoji}</span>
            <span className="text-lg font-extrabold text-fitblack">{stat.value}</span>
            <span className="text-[10px] text-gray-500 font-medium">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Paywall CTA */}
      <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
        <motion.button
          onClick={handleUnlock}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(16,185,129,0.5)',
              '0 0 0 12px rgba(16,185,129,0)',
              '0 0 0 0 rgba(16,185,129,0)',
            ],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-xl bg-accent text-white font-extrabold text-base shadow-xl shadow-accent/30 hover:bg-accent-dark transition-colors"
        >
          ⚡ Unlock my Superpower Plan
        </motion.button>

        {/* De-emphasised skip link */}
        <a
          href="/app/"
          className="text-xs text-gray-400 hover:text-gray-500 transition-colors underline underline-offset-2"
        >
          Continue with preview
        </a>
      </div>
    </div>
  )
}
