import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";

const ACTIVITY_LABELS = {
  sedentary: "light activity days with recovery focus",
  "lightly-active": "moderate training days spread across the week",
  "moderately-active": "consistent training sessions with progressive overload",
  "very-active": "high-frequency training with varied intensity",
  athlete: "advanced programming with periodisation and peak performance targets",
};

const GOAL_LABELS = {
  "lose-weight": "a caloric deficit to support steady fat loss while preserving muscle",
  "build-muscle": "a caloric surplus with high protein to fuel muscle growth",
  "get-fitter": "balanced macros to support overall health and performance",
  "boost-endurance": "carb-focused fuelling to power your endurance training",
};

export default function StepFour({ plan, formData, user }) {
  // Handle error state
  if (plan?.error) {
    return (
      <div className="text-center pt-10">
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-5">{plan.error}</p>
        <button
          onClick={() => location.reload()}
          className="px-6 py-3 rounded-full bg-accent text-white font-semibold hover:bg-accent-dark transition-all"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!plan) return null;

  const totalExercises = (plan.training || []).reduce(
    (sum, d) => sum + (d.exercises?.length || 0),
    0
  );

  const activityDesc =
    ACTIVITY_LABELS[formData.activityLevel] ||
    "a structured weekly training schedule";
  const goalDesc = GOAL_LABELS[formData.goal] || "balanced nutrition";

  const handleUnlock = useCallback(async () => {
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: "price_1TDM6gLzjWXxGtsSmBBGHvnY",
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      window.location.href = "/pricing.html";
    }
  }, [user]);

  return (
    <div className="relative">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-[clamp(26px,5vw,36px)] font-extrabold tracking-[-1.2px] mb-2 leading-[1.15] bg-gradient-to-r from-accent-dark to-accent bg-clip-text text-transparent">
          Your plan is ready!
        </h1>
        <p className="text-[15px] text-gray-500 leading-relaxed">
          {plan.summary || "Your personalized plan is ready!"}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-6">
        {[
          { value: plan.dailyCalories || "—", label: "Daily calories" },
          { value: "7", label: "Days planned" },
          { value: totalExercises, label: "Exercises" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex-1 bg-gray-50 border border-gray-100 rounded-[10px] p-4 text-center"
          >
            <span className="block text-[22px] font-extrabold tracking-[-0.5px] text-accent-dark">
              {stat.value}
            </span>
            <span className="text-[12px] text-gray-500 mt-0.5">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      {plan.tips?.length > 0 && (
        <div className="flex gap-2.5 mb-7 flex-wrap">
          {plan.tips.map((tip, i) => (
            <div
              key={i}
              className="flex-1 min-w-[150px] bg-accent-50 border border-accent-light rounded-[10px] px-3.5 py-3 text-[13px] leading-relaxed text-accent-dark"
            >
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* Training Plan */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-[17px] font-bold mb-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Training Plan
        </h2>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-3 -mt-1.5">
          Based on your activity level, we&apos;ve built {activityDesc}. The
          first 2 days are shown as a preview.
        </p>
        {(plan.training || []).map((day, i) => (
          <div
            key={i}
            className={`bg-white border border-gray-200 rounded-[10px] mb-2.5 overflow-hidden ${i >= 2 ? "blur-[6px] select-none pointer-events-none" : ""}`}
          >
            <div className="px-4 py-3 text-[14px] font-bold bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span>{day.day}</span>
              {i < 2 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-light text-accent-dark">
                  Preview
                </span>
              )}
            </div>
            <div className="px-4 py-3">
              {(day.exercises || []).map((ex, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0"
                >
                  <span className="text-[14px] font-medium">{ex.name}</span>
                  <span className="text-[13px] text-gray-500">
                    {ex.sets} × {ex.reps} · {ex.rest}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Nutrition Plan */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-[17px] font-bold mb-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
          Nutrition Plan
        </h2>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-3 -mt-1.5">
          Your daily target is {plan.dailyCalories || "—"} kcal, structured
          around {goalDesc}. Each day includes breakfast, lunch, dinner, and
          snacks.
        </p>
        {(plan.nutrition || []).map((day, i) => {
          const meals = day.meals || {};
          return (
            <div
              key={i}
              className={`bg-white border border-gray-200 rounded-[10px] mb-2.5 overflow-hidden ${i >= 1 ? "blur-[6px] select-none pointer-events-none" : ""}`}
            >
              <div className="px-4 py-3 text-[14px] font-bold bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span>{day.day}</span>
                <span className="text-[12px] text-gray-500 font-medium">
                  {day.kcal || "—"} kcal
                </span>
              </div>
              <div className="px-4 py-3">
                {["breakfast", "lunch", "dinner", "snacks"].map((key) => (
                  <div key={key} className="py-1.5 border-b border-gray-50 last:border-b-0">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-gray-400 mb-0.5">
                      {key}
                    </div>
                    <div className="text-[14px] leading-relaxed">
                      {meals[key] || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paywall Overlay */}
      <div className="relative -mt-[120px] pt-20 text-center bg-gradient-to-b from-transparent via-white/70 to-white">
        <div className="flex flex-col items-center gap-3 px-6 py-8 bg-gradient-to-br from-accent-50 to-[#f0fdf4] border border-accent-light rounded-[14px]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h3 className="text-xl font-extrabold tracking-[-0.5px]">
            Unlock your complete 7-day plan
          </h3>
          <p className="text-[14px] text-gray-500 max-w-[380px] leading-relaxed">
            Get full access to all training schedules, detailed meal plans, and
            weekly updates.
          </p>
          <motion.button
            onClick={handleUnlock}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="w-full max-w-[320px] py-3.5 rounded-full bg-accent text-white text-[15px] font-bold hover:bg-accent-dark transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            Unlock full plan →
          </motion.button>
          <a
            href="/app/"
            className="text-[13px] text-gray-500 no-underline mt-1 hover:text-[#0a0a0a] transition-colors"
          >
            Continue with preview →
          </a>
        </div>
      </div>
    </div>
  );
}
