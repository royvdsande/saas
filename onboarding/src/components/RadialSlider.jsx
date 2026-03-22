import { useRef, useCallback, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

/**
 * Circular/radial slider component.
 * Renders an SVG arc that the user can drag to change a value.
 *
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} value - Current value
 * @param {function} onChange - Callback with new value
 * @param {string} label - Label text (e.g. "Age")
 * @param {string} unit - Unit text (e.g. "years")
 * @param {string} color - Accent color for the arc
 * @param {number} size - Diameter in pixels (default 140)
 */
export default function RadialSlider({
  min,
  max,
  value,
  onChange,
  label,
  unit,
  color = "#10b981",
  size = 140,
}) {
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Value to angle (0-270 degrees, starting from bottom-left)
  const startAngle = 135; // degrees from top (bottom-left starting point)
  const sweepAngle = 270; // total arc sweep

  const valueToAngle = (val) => {
    const pct = (val - min) / (max - min);
    return startAngle + pct * sweepAngle;
  };

  const angleToValue = (angle) => {
    // Normalize angle to our range
    let normalized = angle - startAngle;
    if (normalized < 0) normalized += 360;
    if (normalized > sweepAngle) {
      normalized = normalized > sweepAngle + (360 - sweepAngle) / 2 ? 0 : sweepAngle;
    }
    const pct = Math.max(0, Math.min(1, normalized / sweepAngle));
    return Math.round(min + pct * (max - min));
  };

  // SVG arc path
  const filledPct = (value - min) / (max - min);
  const dashOffset = circumference * (1 - (filledPct * sweepAngle) / 360);

  // Thumb position
  const thumbAngle = valueToAngle(value);
  const thumbRad = (thumbAngle - 90) * (Math.PI / 180);
  const thumbX = cx + radius * Math.cos(thumbRad);
  const thumbY = cy + radius * Math.sin(thumbRad);

  // Convert pointer position to angle relative to center
  const getAngleFromEvent = useCallback(
    (e) => {
      const svg = svgRef.current;
      if (!svg) return 0;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left - cx;
      const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top - cy;
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      return angle;
    },
    [cx, cy]
  );

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      const angle = getAngleFromEvent(e);
      const newValue = angleToValue(angle);
      onChange?.(newValue);

      const handleMove = (ev) => {
        ev.preventDefault();
        const a = getAngleFromEvent(ev);
        onChange?.(angleToValue(a));
      };

      const handleUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [getAngleFromEvent, angleToValue, onChange]
  );

  // Arc background rotation to start at bottom-left
  const arcRotation = startAngle - 90;

  return (
    <div className="radial-slider flex flex-col items-center gap-1">
      {/* Label */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>

      {/* SVG Dial */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="cursor-pointer"
          onPointerDown={handlePointerDown}
          style={{ touchAction: "none" }}
        >
          {/* Track (background arc) */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${(sweepAngle / 360) * circumference} ${circumference}`}
            transform={`rotate(${arcRotation} ${cx} ${cy})`}
          />

          {/* Filled arc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${(filledPct * sweepAngle / 360) * circumference} ${circumference}`}
            transform={`rotate(${arcRotation} ${cx} ${cy})`}
            style={{
              filter: isDragging ? `drop-shadow(0 0 6px ${color}80)` : undefined,
              transition: isDragging ? "none" : "stroke-dasharray 0.15s ease",
            }}
          />

          {/* Thumb */}
          <circle
            cx={thumbX}
            cy={thumbY}
            r={isDragging ? 12 : 10}
            fill="white"
            stroke={color}
            strokeWidth={3}
            style={{
              filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.15))${isDragging ? ` drop-shadow(0 0 8px ${color}60)` : ""}`,
              transition: isDragging ? "none" : "cx 0.15s ease, cy 0.15s ease, r 0.15s ease",
            }}
          />
        </svg>

        {/* Center value display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            key={value}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-extrabold tracking-tight"
            style={{ color }}
          >
            {value}
          </motion.span>
          <span className="text-[10px] text-gray-400 font-medium">{unit}</span>
        </div>
      </div>
    </div>
  );
}
