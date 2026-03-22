import { motion } from "framer-motion";

/**
 * Visual avatar figure that morphs based on user data.
 *
 * PLUG: Replace this entire SVG with your custom 3D model,
 * Lottie animation, or complex illustration. The component
 * receives age, weight, and height as props to drive the visual.
 *
 * @param {number} age - 14-99
 * @param {number} weight - 30-300 kg
 * @param {number} height - 120-250 cm
 * @param {string|null} gender - "male", "female", "other", or null
 */
export default function AvatarFigure({ age, weight, height, gender }) {
  // Normalize values to 0-1 range for visual mapping
  const heightNorm = (height - 120) / (250 - 120); // 0 = 120cm, 1 = 250cm
  const weightNorm = (weight - 30) / (300 - 30); // 0 = 30kg, 1 = 300kg
  const ageNorm = (age - 14) / (99 - 14); // 0 = 14y, 1 = 99y

  // Visual mappings
  const figureHeight = 80 + heightNorm * 60; // 80-140px effective body
  const figureWidth = 0.7 + weightNorm * 0.6; // scaleX: 0.7 - 1.3
  const headSize = 28 - ageNorm * 4; // Younger = slightly bigger head (stylized)
  const bodyOpacity = 1 - ageNorm * 0.15; // Subtle age fade

  // Color based on gender
  const bodyColor =
    gender === "female"
      ? "#e879f9"
      : gender === "male"
        ? "#60a5fa"
        : "#10b981";

  const limbColor =
    gender === "female"
      ? "#d946ef"
      : gender === "male"
        ? "#3b82f6"
        : "#059669";

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.svg
        width="120"
        height="180"
        viewBox="0 0 120 180"
        animate={{
          scaleX: figureWidth,
          scaleY: 0.8 + heightNorm * 0.4,
          opacity: bodyOpacity,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="drop-shadow-lg"
      >
        {/* Head */}
        <motion.circle
          cx="60"
          cy="32"
          animate={{ r: headSize / 2 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          fill={bodyColor}
          opacity={0.9}
        />

        {/* Neck */}
        <rect x="56" y="44" width="8" height="10" rx="4" fill={bodyColor} opacity={0.7} />

        {/* Body / Torso */}
        <motion.path
          d="M40 54 Q40 50 48 50 L72 50 Q80 50 80 54 L82 110 Q82 118 74 118 L46 118 Q38 118 38 110 Z"
          fill={bodyColor}
          animate={{ opacity: 0.85 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        />

        {/* Left arm */}
        <motion.path
          d="M40 56 L28 85 L32 86 L42 62"
          stroke={limbColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Right arm */}
        <motion.path
          d="M80 56 L92 85 L88 86 L78 62"
          stroke={limbColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Left leg */}
        <motion.path
          d="M50 116 L46 155 L42 156"
          stroke={limbColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Right leg */}
        <motion.path
          d="M70 116 L74 155 L78 156"
          stroke={limbColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Face features - eyes */}
        <circle cx="53" cy="30" r="2" fill="white" />
        <circle cx="67" cy="30" r="2" fill="white" />

        {/* Smile */}
        <path d="M54 36 Q60 42 66 36" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </motion.svg>

      {/* Live stats readout */}
      <motion.div
        layout
        className="mt-2 text-xs font-medium text-gray-400 tracking-wide"
      >
        {age}y · {weight}kg · {height}cm
      </motion.div>
    </div>
  );
}
