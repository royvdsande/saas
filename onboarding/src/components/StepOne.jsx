import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOALS = [
  {
    id: "lose-weight",
    label: "Lose Weight",
    desc: "Burn fat and get lean",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12" />
        <path d="M16 12l-4-4-4 4" />
      </svg>
    ),
    color: "#10b981",
    position: "top-left",
  },
  {
    id: "build-muscle",
    label: "Build Muscle",
    desc: "Gain strength and size",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      </svg>
    ),
    color: "#8b5cf6",
    position: "top-right",
  },
  {
    id: "get-fitter",
    label: "Get Fitter",
    desc: "Improve overall health",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    color: "#f97316",
    position: "bottom-left",
  },
  {
    id: "boost-endurance",
    label: "Boost Endurance",
    desc: "Last longer, go further",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    color: "#3b82f6",
    position: "bottom-right",
  },
];

// Position classes for the 4 goal zones (2x2 grid)
const ZONE_POSITIONS = {
  "top-left": "top-2 left-2 sm:top-4 sm:left-4",
  "top-right": "top-2 right-2 sm:top-4 sm:right-4",
  "bottom-left": "bottom-2 left-2 sm:bottom-4 sm:left-4",
  "bottom-right": "bottom-2 right-2 sm:bottom-4 sm:right-4",
};

export default function StepOne({ value, onChange }) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const [selectedZone, setSelectedZone] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const arenaRef = useRef(null);
  const zoneRefs = useRef({});

  // Hide hint after first drag
  useEffect(() => {
    if (isDragging && showHint) setShowHint(false);
  }, [isDragging, showHint]);

  // Check which zone the avatar is over
  const checkZoneHit = useCallback((point) => {
    for (const goal of GOALS) {
      const el = zoneRefs.current[goal.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      // Expand hit area slightly for better UX
      const padding = 20;
      if (
        point.x >= rect.left - padding &&
        point.x <= rect.right + padding &&
        point.y >= rect.top - padding &&
        point.y <= rect.bottom + padding
      ) {
        return goal.id;
      }
    }
    return null;
  }, []);

  const handleDrag = useCallback(
    (_, info) => {
      const point = {
        x: info.point.x,
        y: info.point.y,
      };
      const hit = checkZoneHit(point);
      setHoveredZone(hit);
    },
    [checkZoneHit]
  );

  const handleDragEnd = useCallback(
    (_, info) => {
      setIsDragging(false);
      const point = { x: info.point.x, y: info.point.y };
      const hit = checkZoneHit(point);

      if (hit) {
        setSelectedZone(hit);
        setHoveredZone(null);
        onChange?.(hit);
      } else {
        setHoveredZone(null);
      }
    },
    [checkZoneHit, onChange]
  );

  return (
    <div className="pt-5">
      <p className="text-xs font-semibold tracking-[0.06em] uppercase text-accent mb-3">
        Step 1 of 4
      </p>
      <h1 className="text-[clamp(26px,5vw,36px)] font-extrabold tracking-[-1.2px] mb-2 leading-[1.15]">
        Choose your path
      </h1>
      <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
        Drag your avatar to the goal that best describes what you want to achieve.
      </p>

      {/* Drag Arena */}
      <div
        ref={arenaRef}
        className="drag-arena relative w-full aspect-square max-w-[480px] mx-auto rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 overflow-hidden"
      >
        {/* Background grid pattern for game feel */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #0a0a0a 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Goal Zones */}
        {GOALS.map((goal) => {
          const isHovered = hoveredZone === goal.id;
          const isSelected = selectedZone === goal.id;

          return (
            <div
              key={goal.id}
              ref={(el) => (zoneRefs.current[goal.id] = el)}
              className={`absolute ${ZONE_POSITIONS[goal.position]} w-[calc(45%-16px)] sm:w-[calc(42%-16px)] aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 border-2 border-dashed ${
                isSelected
                  ? "border-accent bg-accent-50 scale-105"
                  : isHovered
                    ? "border-accent/60 bg-accent-50/50 scale-[1.04]"
                    : "border-gray-300 bg-white/60"
              }`}
              style={
                isHovered || isSelected
                  ? {
                      boxShadow: `0 0 ${isSelected ? 30 : 20}px ${goal.color}33, 0 0 ${isSelected ? 60 : 40}px ${goal.color}15`,
                      animation: isHovered && !isSelected ? "zone-glow 1.5s ease-in-out infinite" : undefined,
                    }
                  : {}
              }
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isHovered || isSelected
                    ? "scale-110"
                    : "scale-100"
                }`}
                style={{ color: goal.color }}
              >
                {/* PLUG: Replace this icon with your own custom illustration or 3D model per goal */}
                {goal.icon}
              </div>
              <span className="text-[13px] sm:text-sm font-bold text-center leading-tight">
                {goal.label}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 text-center hidden sm:block">
                {goal.desc}
              </span>

              {/* Selection checkmark */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-accent rounded-full flex items-center justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pulse ring on hover */}
              {isHovered && !isSelected && (
                <div
                  className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                  style={{
                    borderColor: goal.color + "40",
                    animation: "pulse-ring 1.2s ease-out infinite",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Draggable Avatar (center) */}
        <motion.div
          drag
          dragSnapToOrigin
          dragElastic={0.15}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.15 }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing ${
            isDragging
              ? "shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              : "shadow-lg"
          }`}
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            animation: !isDragging && !selectedZone ? "avatar-float 3s ease-in-out infinite" : undefined,
          }}
        >
          {/* PLUG: Replace this SVG with your custom 3D avatar or character model */}
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </motion.div>

        {/* Drag hint animation */}
        <AnimatePresence>
          {showHint && !selectedZone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm"
            >
              <motion.svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </motion.svg>
              Drag me to a goal
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
