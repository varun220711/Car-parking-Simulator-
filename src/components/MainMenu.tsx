import React from 'react';
import { Car, List, Play, Settings } from 'lucide-react';
import { CoinBadge } from './CoinBadge';
import { VehicleSpec } from '../types/game';

interface MainMenuProps {
  currentLevel: number;
  coins: number;
  selectedVehicle: VehicleSpec;
  totalStars: number;
  onPlay: () => void;
  onOpenLevels: () => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
}

const CheckeredFlagSvg: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <svg
    viewBox="0 0 64 52"
    className={`w-12 h-10 sm:w-14 sm:h-12 shrink-0 ${flip ? '-scale-x-100' : ''}`}
    aria-hidden="true"
  >
    <rect
      x="6"
      y="6"
      width="5"
      height="44"
      rx="2"
      fill="#334155"
      stroke="#1A212E"
      strokeWidth="2.5"
    />
    <g transform="translate(10, 6) rotate(-10)">
      <rect
        x="0"
        y="0"
        width="44"
        height="28"
        rx="3"
        fill="#FFFFFF"
        stroke="#1A212E"
        strokeWidth="3"
      />
      <rect x="0" y="0" width="11" height="9" fill="#1A212E" />
      <rect x="22" y="0" width="11" height="9" fill="#1A212E" />
      <rect x="11" y="9" width="11" height="10" fill="#1A212E" />
      <rect x="33" y="9" width="11" height="10" fill="#1A212E" />
      <rect x="0" y="19" width="11" height="9" fill="#1A212E" />
      <rect x="22" y="19" width="11" height="9" fill="#1A212E" />
    </g>
  </svg>
);

export const MainMenu: React.FC<MainMenuProps> = ({
  currentLevel,
  coins,
  selectedVehicle,
  totalStars,
  onPlay,
  onOpenLevels,
  onOpenGarage,
  onOpenSettings,
}) => {
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 pointer-events-none animate-screen-pop">
      {/* Top Bar: Clean progress text & interactive Coin Shop trigger */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="arcade-btn-sm bg-white/95 text-[#1A212E] px-3 py-1.5 rounded-xl font-display font-bold text-sm flex items-center gap-2 whitespace-nowrap">
          <span className="text-[#1B7FFF] tabular-nums">LVL {currentLevel}/200</span>
          <span className="text-slate-400" aria-hidden="true">·</span>
          <span className="text-[#D97706] tabular-nums">{totalStars} ★</span>
        </div>

        <CoinBadge coins={coins} onClick={onOpenGarage} />
      </div>

      {/* Hero Title Emblem matching Reference Image 1 */}
      <div className="flex flex-col items-center text-center mt-2 sm:mt-4 pointer-events-none">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <CheckeredFlagSvg />
          <div className="flex flex-col items-center leading-none">
            <span className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-white tracking-wide text-stroke-title">
              CAR
            </span>
            <span className="font-display font-bold text-5xl sm:text-6xl md:text-7xl text-[#FFB800] tracking-wide text-stroke-title -mt-1.5">
              PARKING
            </span>
          </div>
          <CheckeredFlagSvg flip />
        </div>

        {/* Checkered SIMULATOR banner */}
        <div className="mt-1 flex items-center bg-[#1A212E] border-[3px] border-[#1A212E] rounded-xl overflow-hidden shadow-[0_4px_0_rgba(26,33,46,0.45)]">
          <div className="grid grid-cols-2 w-7 h-7 sm:w-8 sm:h-8 shrink-0">
            <div className="bg-white" />
            <div className="bg-[#475569]" />
            <div className="bg-[#475569]" />
            <div className="bg-white" />
          </div>
          <span className="px-4 py-1 font-display font-bold text-base sm:text-xl tracking-widest text-white">
            SIMULATOR
          </span>
          <div className="grid grid-cols-2 w-7 h-7 sm:w-8 sm:h-8 shrink-0">
            <div className="bg-[#475569]" />
            <div className="bg-white" />
            <div className="bg-white" />
            <div className="bg-[#475569]" />
          </div>
        </div>
      </div>

      {/* Spacer letting 3D parking lot & car showcase breathe in center */}
      <div className="flex-1 min-h-6" />

      {/* Bottom Action Cluster matching Reference Image 1 */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 pb-2 sm:pb-4 pointer-events-auto">
        {/* Active car quick indicator button */}
        <button
          type="button"
          onClick={onOpenGarage}
          className="arcade-btn-sm bg-white text-[#1A212E] px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
        >
          <span
            className="w-3.5 h-3.5 rounded-full border-2 border-[#1A212E] shrink-0"
            style={{ backgroundColor: selectedVehicle.bodyColor }}
          />
          <span>{selectedVehicle.name}</span>
          <span className="text-slate-400" aria-hidden="true">·</span>
          <span className="text-[#1B7FFF]">Change Car</span>
        </button>

        {/* Primary PLAY Button with left/right arcade ray ticks */}
        <div className="flex items-center justify-center gap-3 w-full">
          <div className="hidden xs:flex flex-col gap-1.5 items-end" aria-hidden="true">
            <span className="w-4 h-1.5 rounded-full bg-[#FFB800] border border-[#1A212E] rotate-12" />
            <span className="w-5 h-1.5 rounded-full bg-[#FFB800] border border-[#1A212E]" />
            <span className="w-4 h-1.5 rounded-full bg-[#FFB800] border border-[#1A212E] -rotate-12" />
          </div>

          <button
            type="button"
            onClick={onPlay}
            className="arcade-btn flex-1 max-w-xs bg-[#FFB800] hover:bg-[#FFC41A] text-white rounded-[22px] py-3.5 px-6 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-8 h-8 fill-white text-[#1A212E] stroke-[2.5]" />
            <div className="flex flex-col items-start leading-none">
              <span className="font-display font-bold text-3xl sm:text-4xl tracking-wide text-stroke-dark">
                PLAY
              </span>
              <span className="font-display font-bold text-xs text-[#1A212E] tracking-wide">
                LEVEL {currentLevel}
              </span>
            </div>
          </button>

          <div className="hidden xs:flex flex-col gap-1.5 items-start" aria-hidden="true">
            <span className="w-4 h-1.5 rounded-full bg-[#FFB800] border border-[#1A212E] -rotate-12" />
            <span className="w-5 h-1.5 rounded-full bg-[#FFB800] border border-[#1A212E]" />
            <span className="w-4 h-1.5 rounded-full bg-[#FFB800] border border-[#1A212E] rotate-12" />
          </div>
        </div>

        {/* Secondary Action Row: LEVELS · GARAGE · SETTINGS */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm">
          <button
            type="button"
            onClick={onOpenLevels}
            className="arcade-btn bg-[#1B7FFF] text-white rounded-2xl py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <List className="w-5 h-5 stroke-[2.6] shrink-0" />
            <span className="font-display font-bold text-sm sm:text-base tracking-wide text-stroke-dark">
              LEVELS
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenGarage}
            className="arcade-btn bg-[#3EC929] text-white rounded-2xl py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Car className="w-5 h-5 stroke-[2.5] shrink-0" />
            <span className="font-display font-bold text-sm sm:text-base tracking-wide text-stroke-dark">
              GARAGE
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="arcade-btn bg-[#8B3DFF] text-white rounded-2xl py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-5 h-5 stroke-[2.5] shrink-0" />
            <span className="font-display font-bold text-sm sm:text-base tracking-wide text-stroke-dark">
              SETTINGS
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
