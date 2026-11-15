import React, { useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { GameSettings } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#1A212E]/65">
      <div className="arcade-card bg-white rounded-3xl w-full max-w-md overflow-hidden animate-modal-pop">
        {/* Header matching purple Settings button */}
        <div className="bg-[#8B3DFF] border-b-[3px] border-[#1A212E] px-5 py-3.5 flex items-center justify-between">
          <h2 className="font-display font-bold text-2xl text-white tracking-wide text-stroke-dark">
            SETTINGS
          </h2>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiBack();
              onClose();
            }}
            className="arcade-btn-sm w-10 h-10 rounded-xl bg-white text-[#1A212E] flex items-center justify-center cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-6 h-6 stroke-[2.8]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Sound Effects */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {settings.sfxEnabled ? (
                <Volume2 className="w-5 h-5 text-[#1B7FFF]" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <div className="font-bold text-sm text-[#1A212E]">
                  Sound Effects
                </div>
                <div className="text-xs text-slate-500">
                  Coins, bumps, gear clicks & stars
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !settings.sfxEnabled;
                onUpdateSettings({ sfxEnabled: next });
                if (next) soundEngine.playUiClick();
              }}
              className={`arcade-btn-sm px-4 py-1.5 rounded-xl font-display font-bold text-sm cursor-pointer ${
                settings.sfxEnabled
                  ? 'bg-[#3EC929] text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {settings.sfxEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Engine Audio */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-sm text-[#1A212E]">
                Engine Audio
              </div>
              <div className="text-xs text-slate-500">
                Smooth speed-reactive motor sound
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({
                  engineSoundEnabled: !settings.engineSoundEnabled,
                });
              }}
              className={`arcade-btn-sm px-4 py-1.5 rounded-xl font-display font-bold text-sm cursor-pointer ${
                settings.engineSoundEnabled
                  ? 'bg-[#3EC929] text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {settings.engineSoundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Control Layout Swap */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-sm text-[#1A212E]">
                Swap Left / Right Controls
              </div>
              <div className="text-xs text-slate-500">
                Move wheel to right side for left-hand play
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({ swapControls: !settings.swapControls });
              }}
              className={`arcade-btn-sm px-4 py-1.5 rounded-xl font-display font-bold text-sm cursor-pointer ${
                settings.swapControls
                  ? 'bg-[#1B7FFF] text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {settings.swapControls ? 'RIGHT' : 'LEFT'}
            </button>
          </div>

          {/* Steering Sensitivity */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-sm font-bold text-[#1A212E] mb-1.5">
              <span>Steering Sensitivity</span>
              <span className="tabular-nums text-[#1B7FFF]">
                {Math.round(settings.steeringSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.7}
              max={1.4}
              step={0.05}
              value={settings.steeringSensitivity}
              onChange={(e) =>
                onUpdateSettings({
                  steeringSensitivity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-[#1B7FFF] cursor-pointer"
            />
          </div>

          {/* Desktop Keyboard Note */}
          <div className="bg-slate-100 border-2 border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            <span className="font-bold text-[#1A212E]">Desktop Keys:</span>{' '}
            Arrow Keys / WASD to steer & drive, Space to brake, R to toggle
            Reverse.
          </div>

          {/* Reset Progress */}
          <div className="pt-2 border-t border-slate-200">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setConfirmReset(true);
                }}
                className="w-full py-2.5 rounded-xl border-2 border-red-300 text-red-600 font-bold text-xs hover:bg-red-50 transition-colors cursor-pointer"
              >
                Reset All Progress & Coins
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiBack();
                    setConfirmReset(false);
                  }}
                  className="arcade-btn-sm flex-1 py-2 rounded-xl bg-slate-200 text-[#1A212E] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playBump(1);
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="arcade-btn-sm flex-1 py-2 rounded-xl bg-[#EF4444] text-white font-bold text-xs cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
