import React from 'react';
import { ArrowRight, List, Play, RotateCcw, Settings, Star } from 'lucide-react';
import { RunOutcome } from '../types/game';
import { CoinIcon } from './CoinBadge';

interface ResultModalProps {
  mode: 'won' | 'crashed' | 'paused';
  levelId: number;
  outcome: RunOutcome | null;
  onNextLevel: () => void;
  onReplay: () => void;
  onResume: () => void;
  onOpenLevels: () => void;
  onOpenSettings: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  mode,
  levelId,
  outcome,
  onNextLevel,
  onReplay,
  onResume,
  onOpenLevels,
  onOpenSettings,
}) => {
  if (mode === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#1A212E]/60">
        <div className="arcade-card bg-white rounded-3xl w-full max-w-xs overflow-hidden animate-modal-pop">
          <div className="bg-[#1B7FFF] border-b-[3px] border-[#1A212E] py-3 px-5 text-center">
            <h2 className="font-display font-bold text-2xl text-white text-stroke-dark">
              PAUSED · LVL {levelId}
            </h2>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="arcade-btn w-full bg-[#3EC929] text-white rounded-2xl py-3 font-display font-bold text-xl flex items-center justify-center gap-2 text-stroke-dark cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>RESUME</span>
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="arcade-btn w-full bg-[#FFB800] text-white rounded-2xl py-2.5 font-display font-bold text-lg flex items-center justify-center gap-2 text-stroke-dark cursor-pointer"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.6]" />
              <span>RESTART</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="arcade-btn w-full bg-[#8B3DFF] text-white rounded-2xl py-2.5 font-display font-bold text-lg flex items-center justify-center gap-2 text-stroke-dark cursor-pointer"
            >
              <Settings className="w-5 h-5 stroke-[2.5]" />
              <span>SETTINGS</span>
            </button>
            <button
              type="button"
              onClick={onOpenLevels}
              className="arcade-btn w-full bg-[#1B7FFF] text-white rounded-2xl py-2.5 font-display font-bold text-lg flex items-center justify-center gap-2 text-stroke-dark cursor-pointer"
            >
              <List className="w-5 h-5 stroke-[2.6]" />
              <span>LEVELS</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'crashed') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#1A212E]/60">
        <div className="arcade-card bg-white rounded-3xl w-full max-w-xs overflow-hidden animate-modal-pop">
          <div className="bg-[#EF4444] border-b-[3px] border-[#1A212E] py-3.5 px-5 text-center">
            <h2 className="font-display font-bold text-2xl text-white text-stroke-dark">
              CAR DAMAGED!
            </h2>
          </div>
          <div className="p-5 text-center space-y-4">
            <p className="text-sm font-semibold text-slate-600">
              Too many bumps on Level {levelId}. Take it steady around tight
              corners!
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onReplay}
                className="arcade-btn w-full bg-[#FFB800] text-white rounded-2xl py-3 font-display font-bold text-xl flex items-center justify-center gap-2 text-stroke-dark cursor-pointer"
              >
                <RotateCcw className="w-6 h-6 stroke-[2.8]" />
                <span>TRY AGAIN</span>
              </button>
              <button
                type="button"
                onClick={onOpenLevels}
                className="arcade-btn w-full bg-[#1B7FFF] text-white rounded-2xl py-2.5 font-display font-bold text-base flex items-center justify-center gap-2 text-stroke-dark cursor-pointer"
              >
                <List className="w-5 h-5 stroke-[2.6]" />
                <span>LEVELS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // mode === 'won'
  const stars = outcome?.stars ?? 3;
  const hasNext = levelId < 200;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#1A212E]/60">
      <div className="arcade-card bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-modal-pop">
        <div className="bg-[#3EC929] border-b-[3px] border-[#1A212E] py-3.5 px-5 text-center">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white text-stroke-dark">
            PARKED! · LVL {levelId}
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* 3-Star Showcase */}
          <div className="flex items-center justify-center gap-3 py-1">
            {[1, 2, 3].map((s) => {
              const earned = s <= stars;
              return (
                <div
                  key={s}
                  style={{ animationDelay: `${(s - 1) * 120}ms` }}
                  className={earned ? 'animate-star-pop' : ''}
                >
                  <Star
                    className={`w-12 h-12 sm:w-14 sm:h-14 stroke-[2.2] ${
                      earned
                        ? 'fill-[#FFB800] text-[#1A212E] drop-shadow-[0_3px_0_#1A212E]'
                        : 'fill-slate-200 text-slate-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Time & Bumps Summary */}
          {outcome && (
            <div className="bg-slate-100 border-2 border-[#1A212E]/15 rounded-2xl p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between font-bold text-[#1A212E]">
                <span>Time</span>
                <span className="tabular-nums">
                  {outcome.elapsedSec.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center justify-between font-bold text-[#1A212E]">
                <span>Bumps</span>
                <span className="tabular-nums">
                  {outcome.bumpsUsed === 0
                    ? '0 (Clean!)'
                    : `${outcome.bumpsUsed}`}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs text-slate-600 font-semibold">
                <div className="flex justify-between">
                  <span>Level Clear</span>
                  <span className="tabular-nums">+{outcome.coinsFromClear}</span>
                </div>
                {outcome.coinsFromStars > 0 && (
                  <div className="flex justify-between">
                    <span>Star Bonus</span>
                    <span className="tabular-nums">+{outcome.coinsFromStars}</span>
                  </div>
                )}
                {outcome.coinsCleanBonus > 0 && (
                  <div className="flex justify-between text-[#16A34A]">
                    <span>Zero-Bump Bonus</span>
                    <span className="tabular-nums">
                      +{outcome.coinsCleanBonus}
                    </span>
                  </div>
                )}
                {outcome.coinsFromPickups > 0 && (
                  <div className="flex justify-between text-[#D97706]">
                    <span>Collected Coins</span>
                    <span className="tabular-nums">
                      +{outcome.coinsFromPickups}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-300 pt-2 flex items-center justify-between font-display font-bold text-base text-[#1A212E]">
                <span>Coins Earned</span>
                <span className="flex items-center gap-1.5 text-[#D97706] tabular-nums">
                  <CoinIcon className="w-5 h-5" />+{outcome.totalCoinsEarned}
                </span>
              </div>
            </div>
          )}

          {/* Primary Actions */}
          <div className="flex flex-col gap-2.5">
            {hasNext && (
              <button
                type="button"
                onClick={onNextLevel}
                className="arcade-btn w-full bg-[#FFB800] text-white rounded-2xl py-3 font-display font-bold text-xl flex items-center justify-center gap-2 text-stroke-dark cursor-pointer"
              >
                <span>NEXT LEVEL</span>
                <ArrowRight className="w-6 h-6 stroke-[3]" />
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onReplay}
                className="arcade-btn bg-[#3EC929] text-white rounded-2xl py-2.5 font-display font-bold text-base flex items-center justify-center gap-1.5 text-stroke-dark cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.8]" />
                <span>REPLAY</span>
              </button>
              <button
                type="button"
                onClick={onOpenLevels}
                className="arcade-btn bg-[#1B7FFF] text-white rounded-2xl py-2.5 font-display font-bold text-base flex items-center justify-center gap-1.5 text-stroke-dark cursor-pointer"
              >
                <List className="w-4 h-4 stroke-[2.8]" />
                <span>LEVELS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
