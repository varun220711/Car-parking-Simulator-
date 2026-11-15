import React, { useEffect, useRef, useState } from 'react';

interface SteeringWheelProps {
  onSteerChange: (steer: number) => void;
  externalSteer: number; // for visual sync when keyboard is used
}

export const SteeringWheel: React.FC<SteeringWheelProps> = ({
  onSteerChange,
  externalSteer,
}) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const lastAngleRef = useRef<number>(0);
  const wheelAngleDegRef = useRef<number>(0);
  const [displayDeg, setDisplayDeg] = useState(0);
  const [dragging, setDragging] = useState(false);

  const MAX_DEG = 135;

  // Sync visual angle when keyboard drives steering and user isn't touching wheel
  useEffect(() => {
    if (!dragging) {
      const target = externalSteer * MAX_DEG;
      wheelAngleDegRef.current = target;
      setDisplayDeg(target);
    }
  }, [externalSteer, dragging]);

  const getPointerAngle = (clientX: number, clientY: number): number => {
    const el = wheelRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    lastAngleRef.current = getPointerAngle(e.clientX, e.clientY);
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    const curAngle = getPointerAngle(e.clientX, e.clientY);
    let delta = curAngle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngleRef.current = curAngle;

    const next = Math.max(
      -MAX_DEG,
      Math.min(MAX_DEG, wheelAngleDegRef.current + delta)
    );
    wheelAngleDegRef.current = next;
    setDisplayDeg(next);
    onSteerChange(next / MAX_DEG);
  };

  const releasePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    setDragging(false);
    wheelAngleDegRef.current = 0;
    setDisplayDeg(0);
    onSteerChange(0);
  };

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        className="relative w-32 h-32 sm:w-36 sm:h-36 touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
        role="slider"
        aria-label="Steering wheel"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round((displayDeg / MAX_DEG) * 100)}
      >
        <div
          style={{
            transform: `rotate(${displayDeg}deg)`,
            transition: dragging ? 'none' : 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="w-full h-full flex items-center justify-center"
        >
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[0_4px_0_rgba(26,33,46,0.45)]">
            {/* Outer Tire-grip rim */}
            <circle
              cx="70"
              cy="70"
              r="56"
              fill="none"
              stroke="#1A212E"
              strokeWidth="22"
            />
            <circle
              cx="70"
              cy="70"
              r="56"
              fill="none"
              stroke="#334155"
              strokeWidth="15"
            />
            {/* Top Yellow Center Marker */}
            <rect
              x="64"
              y="7"
              width="12"
              height="16"
              rx="3"
              fill="#FFB800"
              stroke="#1A212E"
              strokeWidth="2"
            />
            {/* Left, Right & Bottom Spokes */}
            <rect
              x="16"
              y="62"
              width="108"
              height="16"
              rx="6"
              fill="#475569"
              stroke="#1A212E"
              strokeWidth="3"
            />
            <rect
              x="62"
              y="70"
              width="16"
              height="52"
              rx="6"
              fill="#475569"
              stroke="#1A212E"
              strokeWidth="3"
            />
            {/* Center Hub */}
            <circle
              cx="70"
              cy="70"
              r="21"
              fill="#FFB800"
              stroke="#1A212E"
              strokeWidth="3.5"
            />
            <circle cx="70" cy="70" r="9" fill="#1A212E" />
          </svg>
        </div>
      </div>
    </div>
  );
};
