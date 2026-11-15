import React, { useRef, useState } from 'react';
import { GearMode } from '../types/game';

interface PedalsAndShifterProps {
  gear: GearMode;
  onGearChange: (g: GearMode) => void;
  onGasChange: (v: number) => void;
  onBrakeChange: (v: number) => void;
  externalGas: boolean;
  externalBrake: boolean;
}

export const PedalsAndShifter: React.FC<PedalsAndShifterProps> = ({
  gear,
  onGearChange,
  onGasChange,
  onBrakeChange,
  externalGas,
  externalBrake,
}) => {
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);

  const gasPointerRef = useRef<number | null>(null);
  const brakePointerRef = useRef<number | null>(null);

  const handleBrakeDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    brakePointerRef.current = e.pointerId;
    setBrakePressed(true);
    onBrakeChange(1);
  };

  const handleBrakeUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (brakePointerRef.current !== e.pointerId) return;
    brakePointerRef.current = null;
    setBrakePressed(false);
    onBrakeChange(0);
  };

  const handleGasDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    gasPointerRef.current = e.pointerId;
    setGasPressed(true);
    onGasChange(1);
  };

  const handleGasUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (gasPointerRef.current !== e.pointerId) return;
    gasPointerRef.current = null;
    setGasPressed(false);
    onGasChange(0);
  };

  const isBrakeDown = brakePressed || externalBrake;
  const isGasDown = gasPressed || externalGas;

  return (
    <div className="flex items-end gap-2.5 sm:gap-3 select-none">
      {/* Vertical D / R Gear Shifter */}
      <div className="arcade-card bg-[#2A3342] rounded-2xl p-1.5 flex flex-col gap-1.5 w-14 sm:w-16">
        <button
          type="button"
          onClick={() => onGearChange('D')}
          className={`h-12 sm:h-14 rounded-xl font-display font-bold text-xl flex items-center justify-center border-2 border-[#1A212E] transition-colors cursor-pointer ${
            gear === 'D'
              ? 'bg-[#3EC929] text-white shadow-[0_3px_0_#1A212E]'
              : 'bg-[#475569] text-slate-300'
          }`}
          aria-label="Drive gear"
        >
          D
        </button>
        <button
          type="button"
          onClick={() => onGearChange('R')}
          className={`h-12 sm:h-14 rounded-xl font-display font-bold text-xl flex items-center justify-center border-2 border-[#1A212E] transition-colors cursor-pointer ${
            gear === 'R'
              ? 'bg-[#F97316] text-white shadow-[0_3px_0_#1A212E]'
              : 'bg-[#475569] text-slate-300'
          }`}
          aria-label="Reverse gear"
        >
          R
        </button>
      </div>

      {/* Brake Pedal */}
      <button
        type="button"
        onPointerDown={handleBrakeDown}
        onPointerUp={handleBrakeUp}
        onPointerCancel={handleBrakeUp}
        style={{
          transform: isBrakeDown ? 'translateY(4px) scale(0.97)' : 'translateY(0)',
        }}
        className="w-16 h-24 sm:w-20 sm:h-28 rounded-2xl border-[3px] border-[#1A212E] shadow-[0_5px_0_#1A212E] bg-[#EF4444] flex flex-col items-center justify-between p-2.5 touch-none cursor-pointer transition-transform duration-75"
        aria-label="Brake pedal"
      >
        <div className="w-full space-y-1.5">
          <div className="h-1.5 rounded-full bg-[#991B1B]" />
          <div className="h-1.5 rounded-full bg-[#991B1B]" />
          <div className="h-1.5 rounded-full bg-[#991B1B]" />
        </div>
        <span className="font-display font-bold text-xs text-white tracking-wide">
          BRAKE
        </span>
      </button>

      {/* Gas Pedal */}
      <button
        type="button"
        onPointerDown={handleGasDown}
        onPointerUp={handleGasUp}
        onPointerCancel={handleGasUp}
        style={{
          transform: isGasDown ? 'translateY(4px) scale(0.97)' : 'translateY(0)',
        }}
        className="w-16 h-28 sm:w-20 sm:h-32 rounded-2xl border-[3px] border-[#1A212E] shadow-[0_5px_0_#1A212E] bg-[#FFB800] flex flex-col items-center justify-between p-2.5 touch-none cursor-pointer transition-transform duration-75"
        aria-label="Gas pedal"
      >
        <div className="w-full space-y-2">
          <div className="h-1.5 rounded-full bg-[#B45309]" />
          <div className="h-1.5 rounded-full bg-[#B45309]" />
          <div className="h-1.5 rounded-full bg-[#B45309]" />
          <div className="h-1.5 rounded-full bg-[#B45309]" />
        </div>
        <span className="font-display font-bold text-xs text-[#1A212E] tracking-wide">
          GAS
        </span>
      </button>
    </div>
  );
};
