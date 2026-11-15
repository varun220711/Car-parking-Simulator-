/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GearMode,
  HudSnapshot,
  ModalType,
  RunOutcome,
  ScreenRoute,
} from './types/game';
import { getLevelById } from './data/levels';
import { getVehicleById } from './data/vehicles';
import { useGameStore } from './store/useGameStore';
import { soundEngine } from './audio/soundEngine';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { LevelSelect } from './components/LevelSelect';
import { GarageModal } from './components/GarageModal';
import { SettingsModal } from './components/SettingsModal';
import { GameplayHud } from './components/GameplayHud';
import { ResultModal } from './components/ResultModal';

export default function App() {
  const {
    progress,
    settings,
    recordLevelWin,
    buyVehicle,
    selectVehicle,
    updateSettings,
    resetProgress,
  } = useGameStore();

  const [screen, setScreen] = useState<ScreenRoute>('menu');
  const [modal, setModal] = useState<ModalType>('none');
  const [activeLevelId, setActiveLevelId] = useState<number>(
    progress.highestUnlockedLevel
  );
  const [runKey, setRunKey] = useState<number>(1);
  const [runOutcome, setRunOutcome] = useState<RunOutcome | null>(null);
  const [crashed, setCrashed] = useState<boolean>(false);
  const [transitionActive, setTransitionActive] = useState<boolean>(false);

  const [gear, setGear] = useState<GearMode>('D');
  const [kbVisual, setKbVisual] = useState({
    steer: 0,
    gas: false,
    brake: false,
  });

  const activeLevel = useMemo(
    () => getLevelById(activeLevelId),
    [activeLevelId]
  );
  const selectedVehicle = useMemo(
    () => getVehicleById(progress.selectedVehicleId),
    [progress.selectedVehicleId]
  );

  const totalStars = useMemo(() => {
    return Object.values(progress.levelRecords).reduce(
      (sum, rec) => sum + rec.stars,
      0
    );
  }, [progress.levelRecords]);

  const [hud, setHud] = useState<HudSnapshot>({
    speedKmh: 0,
    bumpsLeft: activeLevel.maxBumps,
    maxBumps: activeLevel.maxBumps,
    elapsedSec: 0,
    bayProgress: 0,
    inBay: false,
    angleAligned: false,
    reverseValid: true,
    coinsCollectedInRun: 0,
    coinBonusValue: 0,
  });

  // Shared mutable driving control state read by GameCanvas loop
  const controlRef = useRef({
    steerTarget: 0,
    gas: 0,
    brake: 0,
    gear: 'D' as GearMode,
    sensitivity: settings.steeringSensitivity,
  });

  const touchInputRef = useRef({ steer: 0, gas: 0, brake: 0 });
  const keyInputRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    space: false,
  });

  const syncControlRef = useCallback(() => {
    const k = keyInputRef.current;
    const t = touchInputRef.current;
    const kbSteer = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const steerTarget = t.steer !== 0 ? t.steer : kbSteer;
    const gas = Math.max(t.gas, k.up ? 1 : 0);
    const brake = Math.max(t.brake, k.down || k.space ? 1 : 0);

    controlRef.current.steerTarget = steerTarget;
    controlRef.current.gas = gas;
    controlRef.current.brake = brake;
    controlRef.current.sensitivity = settings.steeringSensitivity;
  }, [settings.steeringSensitivity]);

  useEffect(() => {
    controlRef.current.sensitivity = settings.steeringSensitivity;
  }, [settings.steeringSensitivity]);

  useEffect(() => {
    controlRef.current.gear = gear;
  }, [gear]);

  // Unlock Web Audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const triggerScreenTransition = useCallback((fn: () => void) => {
    setTransitionActive(true);
    window.setTimeout(() => {
      fn();
    }, 140);
    window.setTimeout(() => {
      setTransitionActive(false);
    }, 390);
  }, []);

  const startLevel = useCallback(
    (levelId: number) => {
      soundEngine.unlock();
      soundEngine.startEngine();
      triggerScreenTransition(() => {
        setActiveLevelId(levelId);
        setRunKey((k) => k + 1);
        setRunOutcome(null);
        setCrashed(false);
        setModal('none');
        setGear('D');
        controlRef.current.gear = 'D';
        touchInputRef.current = { steer: 0, gas: 0, brake: 0 };
        keyInputRef.current = {
          left: false,
          right: false,
          up: false,
          down: false,
          space: false,
        };
        syncControlRef();
        setScreen('playing');
      });
    },
    [syncControlRef, triggerScreenTransition]
  );

  const handleGearChange = useCallback((nextGear: GearMode) => {
    setGear((prev) => {
      if (prev !== nextGear) {
        soundEngine.playGearShift(nextGear);
      }
      return nextGear;
    });
  }, []);

  // Keyboard support for desktop players
  useEffect(() => {
    if (screen !== 'playing') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = keyInputRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        k.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        k.right = true;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        k.up = true;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        k.down = true;
      } else if (e.key === ' ') {
        e.preventDefault();
        k.space = true;
      } else if (e.key === 'r' || e.key === 'R') {
        setGear((prev) => {
          const next = prev === 'D' ? 'R' : 'D';
          soundEngine.playGearShift(next);
          return next;
        });
      } else if (e.key === 'Escape') {
        setModal((m) => (m === 'pause' ? 'none' : 'pause'));
      }
      syncControlRef();
      setKbVisual({
        steer: (k.right ? 1 : 0) - (k.left ? 1 : 0),
        gas: k.up,
        brake: k.down || k.space,
      });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = keyInputRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        k.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        k.right = false;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        k.up = false;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        k.down = false;
      } else if (e.key === ' ') {
        k.space = false;
      }
      syncControlRef();
      setKbVisual({
        steer: (k.right ? 1 : 0) - (k.left ? 1 : 0),
        gas: k.up,
        brake: k.down || k.space,
      });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [screen, syncControlRef]);

  const handleWin = useCallback(
    (stats: {
      elapsedSec: number;
      bumpsUsed: number;
      coinsCollected: number;
      coinBonusValue: number;
    }) => {
      let stars: 1 | 2 | 3 = 1;
      if (stats.bumpsUsed === 0 && stats.elapsedSec <= activeLevel.parTimeSec) {
        stars = 3;
      } else if (
        stats.bumpsUsed <= 1 &&
        stats.elapsedSec <= activeLevel.parTimeSec * 1.45
      ) {
        stars = 2;
      }
      const outcome = recordLevelWin(
        activeLevel.id,
        stars,
        stats.elapsedSec,
        stats.bumpsUsed,
        stats.coinBonusValue,
        activeLevel.baseReward
      );
      setRunOutcome(outcome);
    },
    [activeLevel, recordLevelWin]
  );

  const handleCrash = useCallback(() => {
    setCrashed(true);
  }, []);

  const isPaused =
    modal !== 'none' || runOutcome !== null || crashed || screen !== 'playing';

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#2B96F3] select-none">
      {/* Persistent 3D Low-Poly Parking World */}
      <GameCanvas
        screen={screen}
        paused={isPaused}
        level={activeLevel}
        vehicle={selectedVehicle}
        runKey={runKey}
        controlRef={controlRef}
        onHudUpdate={setHud}
        onWin={handleWin}
        onCrash={handleCrash}
      />

      {/* Screen: Main Menu */}
      {screen === 'menu' && (
        <MainMenu
          currentLevel={progress.highestUnlockedLevel}
          coins={progress.coins}
          selectedVehicle={selectedVehicle}
          totalStars={totalStars}
          onPlay={() => {
            soundEngine.playUiClick();
            startLevel(progress.highestUnlockedLevel);
          }}
          onOpenLevels={() => {
            soundEngine.playUiClick();
            triggerScreenTransition(() => setScreen('levels'));
          }}
          onOpenGarage={() => {
            soundEngine.playUiClick();
            setModal('garage');
          }}
          onOpenSettings={() => {
            soundEngine.playUiClick();
            setModal('settings');
          }}
        />
      )}

      {/* Screen: 200-Level Paginated Grid */}
      {screen === 'levels' && (
        <LevelSelect
          highestUnlockedLevel={progress.highestUnlockedLevel}
          levelRecords={progress.levelRecords}
          coins={progress.coins}
          onSelectLevel={(id) => {
            soundEngine.playUiClick();
            startLevel(id);
          }}
          onBack={() => {
            soundEngine.playUiBack();
            triggerScreenTransition(() => setScreen('menu'));
          }}
          onOpenGarage={() => {
            soundEngine.playUiClick();
            setModal('garage');
          }}
        />
      )}

      {/* Screen: Active Driving HUD & Touch Controls */}
      {screen === 'playing' && (
        <GameplayHud
          level={activeLevel}
          hud={hud}
          gear={gear}
          swapControls={settings.swapControls}
          externalSteer={kbVisual.steer}
          externalGas={kbVisual.gas}
          externalBrake={kbVisual.brake}
          onSteerChange={(v) => {
            touchInputRef.current.steer = v;
            syncControlRef();
          }}
          onGearChange={handleGearChange}
          onGasChange={(v) => {
            touchInputRef.current.gas = v;
            syncControlRef();
          }}
          onBrakeChange={(v) => {
            touchInputRef.current.brake = v;
            syncControlRef();
          }}
          onPause={() => {
            soundEngine.playUiClick();
            setModal('pause');
          }}
          onRestart={() => {
            soundEngine.playUiClick();
            startLevel(activeLevelId);
          }}
        />
      )}

      {/* Overlays: Victory / Crash / Pause */}
      {screen === 'playing' && runOutcome && (
        <ResultModal
          mode="won"
          levelId={activeLevelId}
          outcome={runOutcome}
          onNextLevel={() => {
            soundEngine.playUiClick();
            startLevel(Math.min(200, activeLevelId + 1));
          }}
          onReplay={() => {
            soundEngine.playUiClick();
            startLevel(activeLevelId);
          }}
          onResume={() => {}}
          onOpenLevels={() => {
            soundEngine.playUiBack();
            triggerScreenTransition(() => {
              setRunOutcome(null);
              setScreen('levels');
            });
          }}
          onOpenSettings={() => {}}
        />
      )}

      {screen === 'playing' && crashed && !runOutcome && (
        <ResultModal
          mode="crashed"
          levelId={activeLevelId}
          outcome={null}
          onNextLevel={() => {}}
          onReplay={() => {
            soundEngine.playUiClick();
            startLevel(activeLevelId);
          }}
          onResume={() => {}}
          onOpenLevels={() => {
            soundEngine.playUiBack();
            triggerScreenTransition(() => {
              setCrashed(false);
              setScreen('levels');
            });
          }}
          onOpenSettings={() => {}}
        />
      )}

      {screen === 'playing' && modal === 'pause' && !runOutcome && !crashed && (
        <ResultModal
          mode="paused"
          levelId={activeLevelId}
          outcome={null}
          onNextLevel={() => {}}
          onReplay={() => {
            soundEngine.playUiClick();
            startLevel(activeLevelId);
          }}
          onResume={() => {
            soundEngine.playUiClick();
            setModal('none');
          }}
          onOpenLevels={() => {
            soundEngine.playUiBack();
            triggerScreenTransition(() => {
              setModal('none');
              setScreen('levels');
            });
          }}
          onOpenSettings={() => {
            soundEngine.playUiClick();
            setModal('settings');
          }}
        />
      )}

      {/* Garage Shop Modal */}
      {modal === 'garage' && (
        <GarageModal
          coins={progress.coins}
          ownedVehicleIds={progress.ownedVehicleIds}
          selectedVehicleId={progress.selectedVehicleId}
          onBuyVehicle={buyVehicle}
          onSelectVehicle={selectVehicle}
          onClose={() => {
            soundEngine.playUiBack();
            setModal('none');
          }}
        />
      )}

      {/* Settings Modal */}
      {modal === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetProgress={() => {
            resetProgress();
            setActiveLevelId(1);
          }}
          onClose={() => {
            setModal(screen === 'playing' ? 'pause' : 'none');
          }}
        />
      )}

      {/* Smooth Screen Transition Curtain */}
      {transitionActive && (
        <div
          className="fixed inset-0 z-50 pointer-events-none bg-[#2B96F3] animate-curtain flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="font-display font-bold text-3xl text-white text-stroke-dark">
            PARKING...
          </div>
        </div>
      )}
    </div>
  );
}
