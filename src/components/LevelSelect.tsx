import React, { useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Lock, Star } from 'lucide-react';
import { LevelRecord } from '../types/game';
import { LEVELS } from '../data/levels';
import { CoinBadge } from './CoinBadge';

interface LevelSelectProps {
  highestUnlockedLevel: number;
  levelRecords: Record<number, LevelRecord>;
  coins: number;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
  onOpenGarage: () => void;
}

const LEVELS_PER_PAGE = 20;
const TOTAL_PAGES = 10; // 10 * 20 = 200 levels

export const LevelSelect: React.FC<LevelSelectProps> = ({
  highestUnlockedLevel,
  levelRecords,
  coins,
  onSelectLevel,
  onBack,
  onOpenGarage,
}) => {
  const initialPage = Math.min(
    TOTAL_PAGES - 1,
    Math.floor((highestUnlockedLevel - 1) / LEVELS_PER_PAGE)
  );
  const [page, setPage] = useState(initialPage);

  const startIndex = page * LEVELS_PER_PAGE;
  const pageLevels = LEVELS.slice(startIndex, startIndex + LEVELS_PER_PAGE);
  const tierName = pageLevels[0]?.tierName ?? '';

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 bg-[#1A212E]/20 animate-screen-pop">
      {/* Top Bar: Back Button + LEVELS Checkered Banner + Coins */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="arcade-btn w-12 h-12 rounded-2xl bg-[#FFB800] text-white flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Back to menu"
        >
          <ArrowLeft className="w-7 h-7 stroke-[3] text-white drop-shadow-[0_2px_0_#1A212E]" />
        </button>

        {/* LEVELS Banner matching Reference Image 2 */}
        <div className="flex items-center bg-[#1A212E] border-[3px] border-[#1A212E] rounded-2xl overflow-hidden shadow-[0_5px_0_rgba(26,33,46,0.45)]">
          <div className="grid grid-cols-2 w-6 h-10 sm:w-8 sm:h-12 shrink-0">
            <div className="bg-white" />
            <div className="bg-[#334155]" />
            <div className="bg-[#334155]" />
            <div className="bg-white" />
            <div className="bg-white" />
            <div className="bg-[#334155]" />
          </div>
          <div className="px-4 sm:px-6 py-1 text-center">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#FFB800] tracking-wider leading-none text-stroke-dark">
              LEVELS
            </h1>
          </div>
          <div className="grid grid-cols-2 w-6 h-10 sm:w-8 sm:h-12 shrink-0">
            <div className="bg-[#334155]" />
            <div className="bg-white" />
            <div className="bg-white" />
            <div className="bg-[#334155]" />
            <div className="bg-[#334155]" />
            <div className="bg-white" />
          </div>
        </div>

        <CoinBadge coins={coins} onClick={onOpenGarage} />
      </div>

      {/* Tier Name & Page Range Indicator */}
      <div className="flex items-center justify-center gap-2 mt-2 mb-1">
        <div className="bg-white/95 border-[2.5px] border-[#1A212E] rounded-xl px-3.5 py-1 shadow-[0_3px_0_#1A212E] flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1A212E]">
          <span>{tierName}</span>
          <span className="text-slate-400" aria-hidden="true">·</span>
          <span className="text-[#1B7FFF] tabular-nums">
            {startIndex + 1}–{startIndex + LEVELS_PER_PAGE}
          </span>
        </div>
      </div>

      {/* 4x5 Grid of 20 Level Tiles matching Reference Image 2 */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-1">
        <div className="w-full max-w-md grid grid-cols-4 gap-2.5 sm:gap-3">
          {pageLevels.map((lvl) => {
            const record = levelRecords[lvl.id];
            const isCompleted = Boolean(record);
            const isUnlocked = lvl.id <= highestUnlockedLevel;
            const stars = record?.stars ?? 0;

            let tileStyle =
              'bg-[#94A3B8] text-slate-100 opacity-85 cursor-not-allowed';
            if (isCompleted) {
              tileStyle = 'bg-[#3EC929] text-white cursor-pointer';
            } else if (isUnlocked) {
              tileStyle = 'bg-[#1B7FFF] text-white cursor-pointer';
            }

            return (
              <button
                key={lvl.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onSelectLevel(lvl.id)}
                className={`arcade-btn rounded-2xl py-2 sm:py-2.5 px-1 flex flex-col items-center justify-center gap-1 ${tileStyle}`}
                aria-label={`Level ${lvl.id}${
                  isCompleted
                    ? `, completed with ${stars} stars`
                    : isUnlocked
                    ? ', unlocked'
                    : ', locked'
                }`}
              >
                <span className="font-display font-bold text-xl sm:text-2xl leading-none tabular-nums text-stroke-dark">
                  {lvl.id}
                </span>

                {isCompleted ? (
                  <div className="flex items-center gap-1">
                    <span className="w-5 h-4 rounded-md bg-[#166534] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3.2] text-white" />
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= stars
                              ? 'fill-[#FFB800] text-[#1A212E]'
                              : 'fill-[#166534] text-[#166534]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : isUnlocked ? (
                  <div className="flex items-center gap-0.5 pt-0.5">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5 fill-[#0F3F8C] text-[#0F3F8C]"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="pt-0.5">
                    <Lock className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Pagination Dots & Page Controls (10 Pages = 200 Levels) */}
      <div className="flex items-center justify-center gap-3 pb-1">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="arcade-btn-sm w-10 h-10 rounded-xl bg-white text-[#1A212E] flex items-center justify-center cursor-pointer disabled:opacity-45"
          aria-label="Previous 20 levels"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.8]" />
        </button>

        <div className="flex items-center gap-1.5 bg-[#1A212E]/25 px-3 py-2 rounded-full">
          {Array.from({ length: TOTAL_PAGES }, (_, idx) => {
            const active = idx === page;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setPage(idx)}
                className={`h-2.5 rounded-full border border-[#1A212E] transition-all cursor-pointer ${
                  active
                    ? 'w-6 bg-[#3EC929]'
                    : 'w-2.5 bg-slate-400 hover:bg-slate-200'
                }`}
                aria-label={`Page ${idx + 1}: Levels ${idx * 20 + 1} to ${
                  (idx + 1) * 20
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          disabled={page === TOTAL_PAGES - 1}
          onClick={() => setPage((p) => Math.min(TOTAL_PAGES - 1, p + 1))}
          className="arcade-btn-sm w-10 h-10 rounded-xl bg-white text-[#1A212E] flex items-center justify-center cursor-pointer disabled:opacity-45"
          aria-label="Next 20 levels"
        >
          <ChevronRight className="w-6 h-6 stroke-[2.8]" />
        </button>
      </div>
    </div>
  );
};
