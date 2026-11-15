export type VehicleStyle =
  | 'hatchback'
  | 'sedan'
  | 'coupe'
  | 'pickup'
  | 'van'
  | 'wagon'
  | 'muscle'
  | 'suv';

export interface VehicleSpec {
  id: string;
  name: string;
  tagline: string;
  style: VehicleStyle;
  price: number;
  width: number;
  length: number;
  wheelbase: number;
  maxSpeed: number;
  maxReverseSpeed: number;
  accel: number;
  maxSteerAngle: number; // radians
  bodyColor: string;
  accentColor: string;
  roofColor: string;
  handlingRating: number; // 1..5
  speedRating: number; // 1..5
  compactRating: number; // 1..5
}

export type StaticObstacleKind =
  | 'parkedCar'
  | 'cone'
  | 'curb'
  | 'wall'
  | 'pillar'
  | 'planter';

export interface StaticObstacle {
  id: string;
  kind: StaticObstacleKind;
  x: number;
  z: number;
  rotation: number; // radians
  width: number;
  length: number;
  height?: number;
  color?: string;
  radius?: number; // for cones / round pillars
}

export interface PatrolObstacle {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  speed: number;
  phaseOffset: number;
  width: number;
  length: number;
  color: string;
  pauseAtEndsSec: number;
}

export interface BoomGateObstacle {
  id: string;
  x: number;
  z: number;
  rotation: number; // orientation across the lane
  barLength: number;
  periodSec: number;
  openRatio: number; // fraction of period the bar is up
  phaseOffset: number;
}

export interface CollectibleCoin {
  id: string;
  x: number;
  z: number;
  value: number;
}

export interface TargetBay {
  x: number;
  z: number;
  heading: number; // required car nose direction (radians, 0 = +Z, or atan2(dx, dz))
  width: number;
  length: number;
  requireReverse: boolean;
}

export interface LevelConfig {
  id: number;
  tierIndex: number; // 0..9
  tierName: string;
  subtitle: string;
  worldHalfW: number;
  worldHalfD: number;
  spawn: {
    x: number;
    z: number;
    heading: number;
  };
  targetBay: TargetBay;
  staticObstacles: StaticObstacle[];
  patrols: PatrolObstacle[];
  boomGates: BoomGateObstacle[];
  coins: CollectibleCoin[];
  parTimeSec: number;
  maxBumps: number;
  baseReward: number;
}

export interface LevelRecord {
  stars: 1 | 2 | 3;
  bestTime: number;
  firstClearClaimed: boolean;
}

export interface PlayerProgress {
  highestUnlockedLevel: number; // 1..200
  coins: number;
  levelRecords: Record<number, LevelRecord>;
  ownedVehicleIds: string[];
  selectedVehicleId: string;
}

export interface GameSettings {
  sfxEnabled: boolean;
  engineSoundEnabled: boolean;
  steeringSensitivity: number; // 0.7..1.4
  swapControls: boolean; // false = wheel left, pedals right
}

export type ScreenRoute = 'menu' | 'levels' | 'playing';
export type ModalType = 'none' | 'garage' | 'settings' | 'pause';

export type GearMode = 'D' | 'R';

export interface HudSnapshot {
  speedKmh: number;
  bumpsLeft: number;
  maxBumps: number;
  elapsedSec: number;
  bayProgress: number; // 0..1
  inBay: boolean;
  angleAligned: boolean;
  reverseValid: boolean;
  coinsCollectedInRun: number;
  coinBonusValue: number;
}

export interface RunOutcome {
  status: 'won' | 'crashed';
  levelId: number;
  stars: 0 | 1 | 2 | 3;
  elapsedSec: number;
  bumpsUsed: number;
  coinsFromPickups: number;
  coinsFromClear: number;
  coinsFromStars: number;
  coinsCleanBonus: number;
  totalCoinsEarned: number;
  isNewBest: boolean;
  nextLevelUnlocked: boolean;
}
