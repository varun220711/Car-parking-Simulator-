import React from 'react';
import { Heart, Pause, RotateCcw } from 'lucide-react';
import { GearMode, HudSnapshot, LevelConfig } from '../types/game';
import { CoinIcon } from './CoinBadge';
import { SteeringWheel } from './SteeringWheel';
import { PedalsAndShifter } from './PedalsAndShifter';

interface GameplayHudProps {
  level: LevelConfig;
  hud: HudSnapshot;
  gear: GearMode;
  swapControls: boolean;
  externalSteer: number;
  externalGas: boolean;
  externalBrake: boolean;
  onSteerChange: (v: number) => void;
  onGearChange: (g: GearMode) => void;
  onGasChange: (v: number) => void;
  onBrakeChange: (v: number) => void;
  onPause: () => void;
  onRestart: () => void;
}

export const GameplayHud: React.FC<GameplayHudProps> = ({
  level,
  hud,
  gear,
  swapControls,
  externalSteer,
  externalGas,
  externalBrake,
  onSteerChange,
  onGearChange,
  onGasChange,
  onBrakeChange,
  onPause,
  onRestart,
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = Math.floor(sec % 60);
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Compact Top HUD Row (<= 12% viewport height) */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-full max-w-3xl flex items-center justify-between gap-2 pointer-events-auto">
          {/* Left: Pause & Level Tag */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPause}
              className="arcade-btn-sm w-11 h-11 rounded-xl bg-[#FFB800] text-[#1A212E] flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Pause game"
            >
              <Pause className="w-5 h-5 fill-[#1A212E]" />
            </button>

            <div className="arcade-btn-sm bg-white text-[#1A212E] rounded-xl px-3 py-1.5 flex items-center gap-2 whitespace-nowrap">
              <span className="font-display font-bold text-base tabular-nums">
                LVL {level.id}
              </span>
              <span className="hidden sm:inline text-xs font-bold text-slate-500">
                {level.tierName}
              </span>
            </div>
          </div>

          {/* Center: Bumper Hearts */}
          <div
            className="arcade-btn-sm bg-white rounded-xl px-2.5 py-1.5 flex items-center gap-1"
            aria-label={`${hud.bumpsLeft} of ${hud.maxBumps} bumper durability left`}
          >
            {Array.from({ length: hud.maxBumps }, (_, idx) => {
              const alive = idx < hud.bumpsLeft;
              return (
                <Heart
                  key={idx}
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    alive
                      ? 'fill-[#EF4444] text-[#1A212E]'
                      : 'fill-slate-200 text-slate-300'
                  }`}
                />
              );
            })}
          </div>

          {/* Right: Run Coins + Timer + Restart */}
          <div className="flex items-center gap-2">
            {level.coins.length > 0 && (
              <div className="arcade-btn-sm bg-white text-[#1A212E] rounded-xl px-2.5 py-1.5 flex items-center gap-1 font-display font-bold text-sm tabular-nums">
                <CoinIcon className="w-4 h-4" />
                <span>+{hud.coinBonusValue}</span>
              </div>
            )}

            <div className="arcade-btn-sm bg-white text-[#1A212E] rounded-xl px-2.5 py-1.5 font-display font-bold text-sm tabular-nums">
              {formatTime(hud.elapsedSec)}
            </div>

            <button
              type="button"
              onClick={onRestart}
              className="arcade-btn-sm w-11 h-11 rounded-xl bg-[#1B7FFF] text-white flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Restart level"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.6]" />
            </button>
          </div>
        </div>

        {/* Parking Alignment Cue Strip */}
        {(hud.inBay || level.targetBay.requireReverse) && (
          <div className="pointer-events-none flex items-center justify-center">
            {hud.inBay ? (
              <div className="bg-[#1A212E] border-2 border-[#1A212E] rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-md">
                <span className="font-display font-bold text-xs text-white whitespace-nowrap">
                  {hud.angleAligned && hud.reverseValid
                    ? 'HOLD STEADY!'
                    : !hud.reverseValid
                    ? 'USE REVERSE (R)'
                    : 'STRAIGHTEN CAR'}
                </span>
                <div className="w-24 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3EC929] transition-all duration-75"
                    style={{ width: `${Math.round(hud.bayProgress * 100)}%` }}
                  />
                </div>
              </div>
            ) : level.targetBay.requireReverse ? (
              <div className="bg-[#F97316] border-2 border-[#1A212E] rounded-xl px-3 py-1 text-white font-display font-bold text-xs shadow-sm">
                BACK INTO BAY (REVERSE)
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom Touch Controls Row */}
      <div
        className={`w-full flex items-end justify-between gap-2 pb-1 sm:pb-2 pointer-events-auto ${
          swapControls ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <SteeringWheel
          onSteerChange={onSteerChange}
          externalSteer={externalSteer}
        />

        <PedalsAndShifter
          gear={gear}
          onGearChange={onGearChange}
          onGasChange={onGasChange}
          onBrakeChange={onBrakeChange}
          externalGas={externalGas}
          externalBrake={externalBrake}
        />
      </div>
    </div>
  );
};
