import React, { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { VEHICLES } from '../data/vehicles';
import { VehicleSpec } from '../types/game';
import { CoinBadge, CoinIcon } from './CoinBadge';
import { soundEngine } from '../audio/soundEngine';

interface GarageModalProps {
  coins: number;
  ownedVehicleIds: string[];
  selectedVehicleId: string;
  onBuyVehicle: (id: string) => boolean;
  onSelectVehicle: (id: string) => void;
  onClose: () => void;
}

const TopDownCarIcon: React.FC<{ vehicle: VehicleSpec }> = ({ vehicle }) => {
  const isTruck = vehicle.style === 'pickup';
  const isVan = vehicle.style === 'van';
  const isMuscle = vehicle.style === 'muscle';
  const isCoupe = vehicle.style === 'coupe';

  return (
    <svg viewBox="0 0 110 64" className="w-24 h-14 shrink-0" aria-hidden="true">
      {/* Ground shadow */}
      <rect x="8" y="12" width="94" height="44" rx="10" fill="rgba(26,33,46,0.16)" />
      {/* Wheels */}
      <rect x="20" y="6" width="16" height="8" rx="3" fill="#1E242E" />
      <rect x="74" y="6" width="16" height="8" rx="3" fill="#1E242E" />
      <rect x="20" y="50" width="16" height="8" rx="3" fill="#1E242E" />
      <rect x="74" y="50" width="16" height="8" rx="3" fill="#1E242E" />
      {/* Main Body */}
      <rect
        x="10"
        y="10"
        width="90"
        height="44"
        rx="9"
        fill={vehicle.bodyColor}
        stroke="#1A212E"
        strokeWidth="3"
      />
      {/* Muscle center stripe */}
      {isMuscle && (
        <rect x="13" y="27" width="84" height="10" fill={vehicle.accentColor} />
      )}
      {/* Pickup open bed */}
      {isTruck && (
        <rect
          x="16"
          y="15"
          width="28"
          height="34"
          rx="3"
          fill="#334155"
          stroke="#1A212E"
          strokeWidth="2"
        />
      )}
      {/* Cabin / Windshield */}
      <rect
        x={isTruck ? 48 : isVan ? 20 : 28}
        y="15"
        width={isTruck ? 34 : isVan ? 64 : 46}
        height="34"
        rx="5"
        fill="#1E2D3D"
        stroke="#1A212E"
        strokeWidth="2"
      />
      {/* Roof panel */}
      <rect
        x={isTruck ? 52 : isVan ? 23 : 33}
        y="18"
        width={isTruck ? 20 : isVan ? 50 : 30}
        height="28"
        rx="3"
        fill={vehicle.roofColor}
      />
      {/* Coupe spoiler */}
      {isCoupe && (
        <rect
          x="11"
          y="14"
          width="6"
          height="36"
          rx="2"
          fill={vehicle.accentColor}
          stroke="#1A212E"
          strokeWidth="1.5"
        />
      )}
      {/* Headlights (+X front) */}
      <rect x="95" y="14" width="5" height="9" rx="2" fill="#FEF08A" />
      <rect x="95" y="41" width="5" height="9" rx="2" fill="#FEF08A" />
    </svg>
  );
};

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
    <span className="w-16 shrink-0">{label}</span>
    <div className="flex-1 flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="h-2 flex-1 rounded-sm border border-[#1A212E]/40"
          style={{
            backgroundColor: n <= value ? color : '#E2E8F0',
          }}
        />
      ))}
    </div>
  </div>
);

export const GarageModal: React.FC<GarageModalProps> = ({
  coins,
  ownedVehicleIds,
  selectedVehicleId,
  onBuyVehicle,
  onSelectVehicle,
  onClose,
}) => {
  const [justBoughtId, setJustBoughtId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);

  const handleAction = (v: VehicleSpec) => {
    const owned = ownedVehicleIds.includes(v.id);
    if (owned) {
      soundEngine.playUiClick();
      onSelectVehicle(v.id);
      return;
    }
    const success = onBuyVehicle(v.id);
    if (success) {
      soundEngine.playPurchaseSuccess();
      setJustBoughtId(v.id);
      setTimeout(() => setJustBoughtId(null), 900);
    } else {
      soundEngine.playErrorBuzz();
      setShakeId(v.id);
      setTimeout(() => setShakeId(null), 400);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#1A212E]/65">
      <div className="arcade-card bg-[#F1F5F9] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-pop">
        {/* Header */}
        <div className="bg-[#3EC929] border-b-[3px] border-[#1A212E] px-4 py-3 flex items-center justify-between gap-3">
          <h2 className="font-display font-bold text-2xl text-white tracking-wide text-stroke-dark">
            CAR GARAGE
          </h2>
          <div className="flex items-center gap-2.5">
            <CoinBadge coins={coins} />
            <button
              type="button"
              onClick={onClose}
              className="arcade-btn-sm w-10 h-10 rounded-xl bg-white text-[#1A212E] flex items-center justify-center cursor-pointer"
              aria-label="Close garage"
            >
              <X className="w-6 h-6 stroke-[2.8]" />
            </button>
          </div>
        </div>

        {/* Scrollable Vehicle Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VEHICLES.map((v) => {
            const owned = ownedVehicleIds.includes(v.id);
            const selected = selectedVehicleId === v.id;
            const canAfford = coins >= v.price;
            const highlighted = justBoughtId === v.id;

            return (
              <div
                key={v.id}
                className={`rounded-2xl border-[3px] p-3 flex flex-col justify-between gap-2.5 transition-transform ${
                  selected
                    ? 'bg-[#EFF6FF] border-[#1B7FFF] shadow-[0_4px_0_#1B7FFF]'
                    : 'bg-white border-[#1A212E] shadow-[0_4px_0_#CBD5E1]'
                } ${shakeId === v.id ? 'translate-x-1' : ''} ${
                  highlighted ? 'scale-[1.02]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-[#E2E8F0] border-2 border-[#1A212E] rounded-xl p-1.5 flex items-center justify-center shrink-0">
                    <TopDownCarIcon vehicle={v} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-lg text-[#1A212E] truncate">
                      {v.name}
                    </h3>
                    <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                      {v.tagline}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <StatBar
                    label="Handling"
                    value={v.handlingRating}
                    color="#3EC929"
                  />
                  <StatBar
                    label="Speed"
                    value={v.speedRating}
                    color="#1B7FFF"
                  />
                  <StatBar
                    label="Compact"
                    value={v.compactRating}
                    color="#FFB800"
                  />
                </div>

                {owned ? (
                  <button
                    type="button"
                    onClick={() => handleAction(v)}
                    className={`arcade-btn-sm w-full py-2 px-3 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                      selected
                        ? 'bg-[#3EC929] text-white'
                        : 'bg-[#1B7FFF] text-white'
                    }`}
                  >
                    {selected ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>EQUIPPED</span>
                      </>
                    ) : (
                      <span>SELECT CAR</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(v)}
                    className={`arcade-btn-sm w-full py-2 px-3 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer ${
                      canAfford
                        ? 'bg-[#FFB800] text-[#1A212E]'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {!canAfford && <Lock className="w-4 h-4" />}
                    <CoinIcon className="w-4 h-4" />
                    <span className="tabular-nums">
                      BUY · {v.price.toLocaleString()}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
