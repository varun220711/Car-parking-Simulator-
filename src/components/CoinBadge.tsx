import React from 'react';

interface CoinIconProps {
  className?: string;
}

export const CoinIcon: React.FC<CoinIconProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="#FFB800"
      stroke="#1A212E"
      strokeWidth="2.2"
    />
    <circle cx="12" cy="12" r="6.5" fill="#FDE047" />
    <rect x="10.75" y="7.5" width="2.5" height="9" rx="1" fill="#D97706" />
  </svg>
);

interface CoinBadgeProps {
  coins: number;
  onClick?: () => void;
}

export const CoinBadge: React.FC<CoinBadgeProps> = ({ coins, onClick }) => {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="arcade-btn-sm flex items-center gap-2 bg-white text-[#1A212E] px-3 py-1.5 rounded-xl font-display font-bold text-base whitespace-nowrap shrink-0 cursor-pointer"
        aria-label={`Coins: ${coins}. Open car shop`}
      >
        <CoinIcon className="w-5 h-5 shrink-0" />
        <span className="tabular-nums">{coins.toLocaleString()}</span>
      </button>
    );
  }

  return (
    <div className="arcade-btn-sm flex items-center gap-1.5 bg-white text-[#1A212E] px-2.5 py-1 rounded-xl font-display font-bold text-sm whitespace-nowrap shrink-0">
      <CoinIcon className="w-4 h-4 shrink-0" />
      <span className="tabular-nums">{coins.toLocaleString()}</span>
    </div>
  );
};
