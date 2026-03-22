import { useState, useCallback, useRef } from "react";

/**
 * Custom hook for pointer-based drag interactions.
 * Works with both mouse and touch input.
 * Used by the drag arena in StepOne.
 */
export default function useDrag({ onDragStart, onDragMove, onDragEnd } = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      e.target.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      startPos.current = { x: e.clientX, y: e.clientY };
      startOffset.current = { ...position };
      onDragStart?.({ x: e.clientX, y: e.clientY });
    },
    [position, onDragStart]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      const newPos = {
        x: startOffset.current.x + dx,
        y: startOffset.current.y + dy,
      };
      setPosition(newPos);
      onDragMove?.(newPos, { x: e.clientX, y: e.clientY });
    },
    [isDragging, onDragMove]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!isDragging) return;
      setIsDragging(false);
      e.target.releasePointerCapture?.(e.pointerId);
      onDragEnd?.(position, { x: e.clientX, y: e.clientY });
    },
    [isDragging, position, onDragEnd]
  );

  const resetPosition = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return {
    isDragging,
    position,
    resetPosition,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
}
