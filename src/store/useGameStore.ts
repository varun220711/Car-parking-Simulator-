import { useCallback, useEffect, useState } from 'react';
import { GameSettings, PlayerProgress, RunOutcome } from '../types/game';
import { VEHICLES } from '../data/vehicles';
import { soundEngine } from '../audio/soundEngine';

const PROGRESS_KEY = 'car_parking_sim_progress_v1';
const SETTINGS_KEY = 'car_parking_sim_settings_v1';

const DEFAULT_PROGRESS: PlayerProgress = {
  highestUnlockedLevel: 1,
  coins: 0,
  levelRecords: {},
  ownedVehicleIds: [VEHICLES[0].id],
  selectedVehicleId: VEHICLES[0].id,
};

const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true,
  engineSoundEnabled: true,
  steeringSensitivity: 1.0,
  swapControls: false,
};

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      highestUnlockedLevel: Math.min(200, Math.max(1, parsed.highestUnlockedLevel ?? 1)),
      coins: Math.max(0, parsed.coins ?? 0),
      levelRecords: parsed.levelRecords ?? {},
      ownedVehicleIds:
        Array.isArray(parsed.ownedVehicleIds) && parsed.ownedVehicleIds.length > 0
          ? parsed.ownedVehicleIds
          : [VEHICLES[0].id],
      selectedVehicleId: parsed.selectedVehicleId ?? VEHICLES[0].id,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      sfxEnabled: parsed.sfxEnabled ?? true,
      engineSoundEnabled: parsed.engineSoundEnabled ?? true,
      steeringSensitivity: Math.min(1.4, Math.max(0.7, parsed.steeringSensitivity ?? 1.0)),
      swapControls: parsed.swapControls ?? false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useGameStore() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage quota errors
    }
  }, [progress]);

  useEffect(() => {
    soundEngine.setConfig(settings.sfxEnabled, settings.engineSoundEnabled);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage quota errors
    }
  }, [settings]);

  const recordLevelWin = useCallback(
    (
      levelId: number,
      stars: 1 | 2 | 3,
      elapsedSec: number,
      bumpsUsed: number,
      coinsFromPickups: number,
      baseReward: number
    ): RunOutcome => {
      const existing = progress.levelRecords[levelId];
      const isFirstClear = !existing?.firstClearClaimed;
      const prevStars = existing?.stars ?? 0;
      const bestStars = Math.max(prevStars, stars) as 1 | 2 | 3;
      const newStarsEarned = Math.max(0, stars - prevStars);

      const coinsFromClear = isFirstClear
        ? baseReward
        : Math.max(10, Math.round(baseReward * 0.3));
      const coinsFromStars = isFirstClear ? stars * 15 : newStarsEarned * 15;
      const coinsCleanBonus = bumpsUsed === 0 ? (isFirstClear ? 25 : 10) : 0;
      const totalCoinsEarned =
        coinsFromPickups + coinsFromClear + coinsFromStars + coinsCleanBonus;

      const isNewBest =
        !existing || stars > existing.stars || elapsedSec < existing.bestTime;
      const bestTime = existing
        ? Math.min(existing.bestTime, elapsedSec)
        : elapsedSec;

      const nextUnlocked = Math.min(
        200,
        Math.max(progress.highestUnlockedLevel, levelId + 1)
      );
      const nextLevelUnlocked = nextUnlocked > progress.highestUnlockedLevel;

      const computedOutcome: RunOutcome = {
        status: 'won',
        levelId,
        stars,
        elapsedSec,
        bumpsUsed,
        coinsFromPickups,
        coinsFromClear,
        coinsFromStars,
        coinsCleanBonus,
        totalCoinsEarned,
        isNewBest,
        nextLevelUnlocked,
      };

      setProgress((prev) => ({
        ...prev,
        highestUnlockedLevel: Math.min(
          200,
          Math.max(prev.highestUnlockedLevel, levelId + 1)
        ),
        coins: prev.coins + totalCoinsEarned,
        levelRecords: {
          ...prev.levelRecords,
          [levelId]: {
            stars: bestStars,
            bestTime,
            firstClearClaimed: true,
          },
        },
      }));

      return computedOutcome;
    },
    [progress]
  );

  const buyVehicle = useCallback(
    (vehicleId: string): boolean => {
      const spec = VEHICLES.find((v) => v.id === vehicleId);
      if (!spec) return false;

      if (progress.ownedVehicleIds.includes(vehicleId)) {
        setProgress((prev) => ({ ...prev, selectedVehicleId: vehicleId }));
        return true;
      }
      if (progress.coins < spec.price) {
        return false;
      }

      setProgress((prev) => {
        if (prev.ownedVehicleIds.includes(vehicleId)) return prev;
        if (prev.coins < spec.price) return prev;
        return {
          ...prev,
          coins: prev.coins - spec.price,
          ownedVehicleIds: [...prev.ownedVehicleIds, vehicleId],
          selectedVehicleId: vehicleId,
        };
      });
      return true;
    },
    [progress.coins, progress.ownedVehicleIds]
  );

  const selectVehicle = useCallback((vehicleId: string) => {
    setProgress((prev) => {
      if (!prev.ownedVehicleIds.includes(vehicleId)) return prev;
      return { ...prev, selectedVehicleId: vehicleId };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
  }, []);

  return {
    progress,
    settings,
    recordLevelWin,
    buyVehicle,
    selectVehicle,
    updateSettings,
    resetProgress,
  };
}
