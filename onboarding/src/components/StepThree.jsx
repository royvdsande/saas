import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const LOADING_STEPS = [
  "Calculating your calorie targets",
  "Building your training schedule",
  "Designing your nutrition plan",
  "Adding personalised tips",
];

export default function StepThree() {
  const [activeStep, setActiveStep] = useState(0);

  // Cycle through loading steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center text-center pt-20">
      {/* Spinner */}
      <div className="relative w-20 h-20 mb-7">
        <div className="absolute inset-0 border-3 border-gray-100 border-t-accent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
      </div>

      <h2 className="text-[22px] font-bold mb-2">Analyzing your profile...</h2>
      <p className="text-[14px] text-gray-500 max-w-[400px] leading-relaxed mb-8">
        Our AI is crunching your stats and building a plan tailored specifically
        to you.
      </p>

      {/* Loading steps */}
      <div className="flex flex-col gap-2 w-full max-w-[320px] mb-7 text-left">
        {LOADING_STEPS.map((text, i) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep;

          return (
            <motion.div
              key={i}
              animate={{
                color: isActive
                  ? "#059669"
                  : isDone
                    ? "#737373"
                    : "#a3a3a3",
                fontWeight: isActive ? 500 : 400,
              }}
              className="flex items-center gap-2.5 text-[14px]"
            >
              <motion.span
                animate={{
                  backgroundColor: isActive
                    ? "#10b981"
                    : isDone
                      ? "#d1fae5"
                      : "#e5e5e5",
                  scale: isActive ? 1.2 : 1,
                }}
                className="w-2 h-2 rounded-full shrink-0"
              />
              {text}
            </motion.div>
          );
        })}
      </div>

      {/* Skeleton loaders */}
      <div className="flex flex-col gap-2.5 w-full max-w-[360px]">
        {[100, 75, 100, 50].map((w, i) => (
          <div
            key={i}
            className="h-3.5 bg-gray-100 rounded-[7px] animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
