import { useMemo } from "react";
import { motion } from "framer-motion";
import RadialSlider from "./RadialSlider";
import AvatarFigure from "./AvatarFigure";

const ACTIVITY_LEVELS = [
  { id: "sedentary", emoji: "🛌", label: "Sedentary" },
  { id: "lightly-active", emoji: "🚶", label: "Lightly Active" },
  { id: "moderately-active", emoji: "🏃", label: "Moderately Active" },
  { id: "very-active", emoji: "🏋", label: "Very Active" },
  { id: "athlete", emoji: "🥇", label: "Athlete" },
];

const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

const staggerChild = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

export default function StepTwo({ formData, updateField, onGenerate, onBack }) {
  const { activityLevel, gender, age, weight, height } = formData;

  const isValid = useMemo(() => {
    return activityLevel && gender && age && weight && height;
  }, [activityLevel, gender, age, weight, height]);

  return (
    <div className="pt-5">
      <p className="text-xs font-semibold tracking-[0.06em] uppercase text-accent mb-3">
        Step 2 of 4
      </p>
      <h1 className="text-[clamp(26px,5vw,36px)] font-extrabold tracking-[-1.2px] mb-2 leading-[1.15]">
        Build your profile
      </h1>
      <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
        Adjust the dials and watch your avatar transform in real-time.
      </p>

      {/* Activity Level Pills */}
      <motion.div
        custom={0}
        variants={staggerChild}
        initial="hidden"
        animate="visible"
        className="mb-6"
      >
        <label className="block text-[13px] font-semibold text-gray-600 mb-2">
          Activity Level
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {ACTIVITY_LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => updateField("activityLevel", level.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-[13px] font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                activityLevel === level.id
                  ? "border-accent bg-accent-50 text-accent-dark"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="text-base">{level.emoji}</span>
              <span>{level.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Radial Sliders + Avatar - the main interactive area */}
      <motion.div
        custom={1}
        variants={staggerChild}
        initial="hidden"
        animate="visible"
        className="relative flex flex-col items-center mb-6"
      >
        {/* Desktop: sliders around avatar. Mobile: avatar on top, sliders below */}
        <div className="relative w-full max-w-[420px]">
          {/* Center: Avatar Figure */}
          <div className="flex justify-center py-2">
            {/* PLUG: Replace AvatarFigure with your custom 3D model viewer or Lottie animation */}
            <AvatarFigure
              age={age}
              weight={weight}
              height={height}
              gender={gender}
            />
          </div>

          {/* Sliders row */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mt-2">
            <RadialSlider
              label="Age"
              unit="years"
              min={14}
              max={99}
              value={age}
              onChange={(v) => updateField("age", v)}
              color="#8b5cf6"
              size={120}
            />
            <RadialSlider
              label="Weight"
              unit="kg"
              min={30}
              max={300}
              value={weight}
              onChange={(v) => updateField("weight", v)}
              color="#10b981"
              size={120}
            />
            <RadialSlider
              label="Height"
              unit="cm"
              min={120}
              max={250}
              value={height}
              onChange={(v) => updateField("height", v)}
              color="#f97316"
              size={120}
            />
          </div>
        </div>
      </motion.div>

      {/* Gender Selection */}
      <motion.div
        custom={2}
        variants={staggerChild}
        initial="hidden"
        animate="visible"
        className="mb-6"
      >
        <label className="block text-[13px] font-semibold text-gray-600 mb-2">
          Gender
        </label>
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              onClick={() => updateField("gender", g.id)}
              className={`flex-1 py-3 rounded-[10px] border-2 text-[14px] font-semibold transition-all duration-200 ${
                gender === g.id
                  ? "border-accent bg-accent-50 text-accent-dark"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        custom={3}
        variants={staggerChild}
        initial="hidden"
        animate="visible"
        className="flex gap-2.5 items-center"
      >
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-full border-[1.5px] border-gray-200 bg-white text-[14px] font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all duration-150"
        >
          Back
        </button>
        <motion.button
          onClick={onGenerate}
          disabled={!isValid}
          whileHover={isValid ? { scale: 1.02, y: -1 } : {}}
          whileTap={isValid ? { scale: 0.98 } : {}}
          className={`flex-1 py-3 rounded-full text-[15px] font-semibold text-white transition-all duration-200 ${
            isValid
              ? "bg-accent hover:bg-accent-dark shadow-[0_4px_14px_rgba(16,185,129,0.3)] cursor-pointer"
              : "bg-gray-300 cursor-not-allowed opacity-60"
          }`}
        >
          Generate my plan →
        </motion.button>
      </motion.div>
    </div>
  );
}
