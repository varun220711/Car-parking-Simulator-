import {
  BoomGateObstacle,
  CollectibleCoin,
  LevelConfig,
  PatrolObstacle,
  StaticObstacle,
  TargetBay,
} from '../types/game';

const TRAFFIC_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#6366F1',
  '#EC4899',
  '#F97316',
  '#64748B',
];

const TIER_META = [
  { name: 'Sunny Lot Basics', subtitle: 'Master clean turns & straight stalls' },
  { name: 'Angled Stalls', subtitle: 'Dial in 45° diagonal entries' },
  { name: 'Cone Chicane', subtitle: 'Thread carefully past bright cones' },
  { name: 'Curbside Parallel', subtitle: 'Slide cleanly between parked cars' },
  { name: 'Reverse Garage', subtitle: 'Back into tail-in bays with precision' },
  { name: 'S-Curve Slalom', subtitle: 'Navigate double-bend concrete lanes' },
  { name: 'Boom Gate Timing', subtitle: 'Time your pass under rising barriers' },
  { name: 'Cross-Lot Traffic', subtitle: 'Watch for patrolling lot vehicles' },
  { name: 'Tight Alley Maze', subtitle: 'Tight turns in narrow concrete alleys' },
  { name: 'Master Precision', subtitle: 'Moving traffic, gates & tight reverse bays' },
];

// Deterministic PRNG (Mulberry32)
function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickColor(rng: () => number): string {
  return TRAFFIC_COLORS[Math.floor(rng() * TRAFFIC_COLORS.length)];
}

function sanitizeLevel(
  spawn: { x: number; z: number; heading: number },
  bay: TargetBay,
  obstacles: StaticObstacle[],
  coins: CollectibleCoin[]
): { obstacles: StaticObstacle[]; coins: CollectibleCoin[] } {
  const safeObstacles = obstacles.filter((obs) => {
    const distSpawn = Math.hypot(obs.x - spawn.x, obs.z - spawn.z);
    const distBay = Math.hypot(obs.x - bay.x, obs.z - bay.z);
    const obsMargin = Math.max(obs.width, obs.length) * 0.5;
    if (distSpawn < 2.7 + obsMargin * 0.65) return false;
    if (distBay < 2.6 + obsMargin * 0.65) return false;
    return true;
  });

  const safeCoins = coins.filter((c) => {
    for (const obs of safeObstacles) {
      const r = Math.max(obs.width, obs.length) * 0.55 + 0.9;
      if (Math.hypot(c.x - obs.x, c.z - obs.z) < r) return false;
    }
    return true;
  });

  return { obstacles: safeObstacles, coins: safeCoins };
}

function buildSingleLevel(id: number): LevelConfig {
  const tierIndex = Math.floor((id - 1) / 20); // 0..9
  const levelInTier = (id - 1) % 20; // 0..19
  const rng = makeRng(id * 7919 + 1337);
  const mirror = levelInTier % 2 === 1 ? -1 : 1;
  const difficulty = (id - 1) / 199; // 0..1

  const worldHalfW = 16 + Math.floor(tierIndex / 3) * 2;
  const worldHalfD = 16 + Math.floor(tierIndex / 4) * 2;

  let spawn = { x: -6 * mirror, z: 10, heading: Math.PI };
  let targetBay: TargetBay = {
    x: 0,
    z: -8,
    heading: Math.PI,
    width: 3.1,
    length: 5.4,
    requireReverse: false,
  };

  const staticObstacles: StaticObstacle[] = [];
  const patrols: PatrolObstacle[] = [];
  const boomGates: BoomGateObstacle[] = [];
  const coins: CollectibleCoin[] = [];

  const addCar = (
    key: string,
    x: number,
    z: number,
    rotation: number,
    color = pickColor(rng)
  ) => {
    staticObstacles.push({
      id: `${id}-car-${key}`,
      kind: 'parkedCar',
      x,
      z,
      rotation,
      width: 2.0,
      length: 4.2,
      color,
    });
  };

  const addCone = (key: string, x: number, z: number) => {
    staticObstacles.push({
      id: `${id}-cone-${key}`,
      kind: 'cone',
      x,
      z,
      rotation: 0,
      width: 0.72,
      length: 0.72,
      radius: 0.36,
    });
  };

  const addCurb = (
    key: string,
    x: number,
    z: number,
    width: number,
    length: number,
    rotation = 0
  ) => {
    staticObstacles.push({
      id: `${id}-curb-${key}`,
      kind: 'curb',
      x,
      z,
      rotation,
      width,
      length,
    });
  };

  const addPlanter = (
    key: string,
    x: number,
    z: number,
    width: number,
    length: number,
    rotation = 0
  ) => {
    staticObstacles.push({
      id: `${id}-planter-${key}`,
      kind: 'planter',
      x,
      z,
      rotation,
      width,
      length,
    });
  };

  // Helper for placing row of parked cars with one open bay
  const buildParkingRow = (
    rowZ: number,
    slotXs: number[],
    openIdx: number,
    bayHeading: number,
    requireReverse: boolean,
    slotWidth: number
  ) => {
    slotXs.forEach((sx, idx) => {
      if (idx === openIdx) {
        targetBay = {
          x: sx,
          z: rowZ,
          heading: bayHeading,
          width: slotWidth,
          length: 5.3,
          requireReverse,
        };
      } else {
        addCar(`row-${rowZ}-${idx}`, sx, rowZ, bayHeading);
      }
    });
  };

  if (tierIndex === 0) {
    // Tier 1 (1-20): Sunny Lot Basics
    const bayWidth = 3.35 - levelInTier * 0.02;
    const laneOffset = (levelInTier % 5) - 2; // -2..2
    spawn = {
      x: (-5 + laneOffset * 1.4) * mirror,
      z: 10.5,
      heading: Math.PI + (rng() - 0.5) * 0.18,
    };

    const slots = [-9, -5.4, -1.8, 1.8, 5.4, 9];
    const openIdx =
      levelInTier < 3 ? (mirror > 0 ? 3 : 2) : 1 + (levelInTier % 4);
    buildParkingRow(-8.5, slots, openIdx, Math.PI, false, bayWidth);

    // Gentle cone guides early on, median island later
    if (levelInTier >= 4) {
      addCurb('mid-1', -4.5 * mirror, 1.5, 5.5, 1.1);
    }
    const coneCount = 2 + Math.floor(levelInTier / 4);
    for (let c = 0; c < coneCount; c++) {
      addCone(
        `c-${c}`,
        (rng() - 0.5) * 14,
        1.5 + (c % 2) * 3.2 - 1.5
      );
    }
    coins.push({
      id: `${id}-coin-0`,
      x: (spawn.x + targetBay.x) * 0.5,
      z: 1.5,
      value: 15,
    });
    if (levelInTier >= 8) {
      coins.push({
        id: `${id}-coin-1`,
        x: targetBay.x - 1.5 * mirror,
        z: -2.2,
        value: 15,
      });
    }
  } else if (tierIndex === 1) {
    // Tier 2 (21-40): Angled 45° Stalls
    const angle = (Math.PI * 0.78) * (mirror > 0 ? 1 : -1); // angled away from entry
    const bayWidth = 3.15 - levelInTier * 0.015;
    spawn = {
      x: -9 * mirror,
      z: 9.5,
      heading: Math.PI * 0.5 * mirror + Math.PI, // facing across lane
    };
    if (mirror > 0) {
      spawn.heading = Math.PI * 0.5; // facing +X
    } else {
      spawn.heading = -Math.PI * 0.5; // facing -X
    }

    const xs = [-8, -3.6, 0.8, 5.2, 9.6];
    const openIdx = 1 + (levelInTier % 3);
    xs.forEach((sx, idx) => {
      const slotAngle = mirror > 0 ? Math.PI * 0.78 : -Math.PI * 0.78;
      if (idx === openIdx) {
        targetBay = {
          x: sx,
          z: -7.5,
          heading: slotAngle,
          width: bayWidth,
          length: 5.3,
          requireReverse: false,
        };
      } else {
        addCar(`ang-${idx}`, sx, -7.5, slotAngle);
      }
    });

    // Bottom row parked cars + planters
    addCar('bot-1', -4 * mirror, 4.5, Math.PI * 0.5);
    addPlanter('plt-1', 5 * mirror, 2.2, 4.2, 1.4);
    for (let c = 0; c < 3 + (levelInTier % 4); c++) {
      addCone(`ang-c-${c}`, -6 + c * 4.2, -1.2 + (c % 2) * 2.2);
    }

    coins.push(
      { id: `${id}-coin-0`, x: 0, z: 0.5, value: 15 },
      { id: `${id}-coin-1`, x: targetBay.x - 1.2 * mirror, z: -2.2, value: 15 }
    );
    void angle;
  } else if (tierIndex === 2) {
    // Tier 3 (41-60): Cone Chicane
    const bayWidth = 2.95 - levelInTier * 0.012;
    spawn = { x: -10 * mirror, z: 11, heading: Math.PI };
    const openX = (levelInTier % 2 === 0 ? 7.5 : 3.5) * mirror;
    targetBay = {
      x: openX,
      z: -10,
      heading: Math.PI,
      width: bayWidth,
      length: 5.2,
      requireReverse: false,
    };
    addCar('adj-l', openX - 3.35, -10, Math.PI);
    addCar('adj-r', openX + 3.35, -10, Math.PI);

    // Slalom cone gates across the middle
    const rows = [-3.5, 1.5, 6.0];
    rows.forEach((rz, ri) => {
      const gapX = (ri % 2 === 0 ? 4.5 : -4.5) * mirror;
      for (let x = -11; x <= 11; x += 2.6) {
        if (Math.abs(x - gapX) > 2.35) {
          addCone(`chic-${ri}-${x.toFixed(1)}`, x, rz);
        }
      }
      coins.push({
        id: `${id}-coin-${ri}`,
        x: gapX,
        z: rz,
        value: 15,
      });
    });
  } else if (tierIndex === 3) {
    // Tier 4 (61-80): Curbside Parallel Parking
    const bayLength = 6.1 - levelInTier * 0.03;
    const bayWidth = 2.85 - levelInTier * 0.01;
    const curbSide = mirror; // +1 right curb, -1 left curb
    const bayX = 8.5 * curbSide;
    const bayZ = -2 + ((levelInTier % 5) - 2) * 1.1;

    spawn = {
      x: 2.2 * curbSide,
      z: 10.5,
      heading: Math.PI,
    };
    targetBay = {
      x: bayX,
      z: bayZ,
      heading: Math.PI,
      width: bayWidth,
      length: bayLength,
      requireReverse: false,
    };

    // Curb wall along the side + front/back parked cars framing the parallel pocket
    addCurb('side-curb', 11.4 * curbSide, 0, 1.4, 24);
    addCar('front-pocket', bayX, bayZ - (bayLength * 0.5 + 2.6), Math.PI);
    addCar('rear-pocket', bayX, bayZ + (bayLength * 0.5 + 2.6), Math.PI);

    // Opposite lane parked cars & cones
    addCar('opp-1', -6.5 * curbSide, -5, 0);
    addCar('opp-2', -6.5 * curbSide, 4, 0);
    addPlanter('par-plt', -1.5 * curbSide, -10.5, 5, 1.6);
    for (let c = 0; c < 3; c++) {
      addCone(`par-c-${c}`, -1.8 * curbSide, -6 + c * 6);
    }

    coins.push(
      { id: `${id}-coin-0`, x: 2.8 * curbSide, z: 3.5, value: 15 },
      { id: `${id}-coin-1`, x: bayX, z: bayZ, value: 20 }
    );
  } else if (tierIndex === 4) {
    // Tier 5 (81-100): Reverse Garage (Tail-in required!)
    const bayWidth = 2.9 - levelInTier * 0.012;
    spawn = { x: -7 * mirror, z: 9.5, heading: Math.PI * 0.5 * mirror };
    if (mirror < 0) spawn.heading = -Math.PI * 0.5;

    // Row of bays at z = -9; heading = 0 means car nose points OUT (+Z), so player must back in!
    const slots = [-8.4, -4.2, 0, 4.2, 8.4];
    const openIdx = 1 + (levelInTier % 3);
    buildParkingRow(-9, slots, openIdx, 0, true, bayWidth);

    // Concrete dividers & cones forcing an approach arc
    addPlanter('rev-plt-1', -4.5 * mirror, 2.2, 6.2, 1.5);
    addCar('rev-park-1', 7.5 * mirror, 4.0, Math.PI * 0.5);
    addCone('rev-c1', 0, 1.5);
    addCone('rev-c2', 3.5 * mirror, -1.8);

    coins.push(
      { id: `${id}-coin-0`, x: 2.5 * mirror, z: 2.5, value: 15 },
      { id: `${id}-coin-1`, x: targetBay.x, z: -2.8, value: 20 }
    );
  } else if (tierIndex === 5) {
    // Tier 6 (101-120): S-Curve Slalom
    const bayWidth = 2.85 - levelInTier * 0.01;
    spawn = { x: -10.5 * mirror, z: 11.5, heading: Math.PI };
    targetBay = {
      x: 10 * mirror,
      z: -10.5,
      heading: levelInTier % 3 === 0 ? 0 : Math.PI,
      width: bayWidth,
      length: 5.2,
      requireReverse: levelInTier % 3 === 0,
    };

    // Staggered S-curve concrete walls
    addCurb('s-wall-1', -4.5 * mirror, 5.2, 12.5, 1.35);
    addCurb('s-wall-2', 4.5 * mirror, -1.8, 12.5, 1.35);
    addCar('s-block-1', 6.5 * mirror, -10.5, Math.PI);
    addCar('s-block-2', -8.5 * mirror, -9.0, 0);

    for (let c = 0; c < 4; c++) {
      addCone(`sc-${c}`, (-6 + c * 4) * mirror, 1.8 - (c % 2) * 0.8);
    }

    coins.push(
      { id: `${id}-coin-0`, x: 6.5 * mirror, z: 5.2, value: 15 },
      { id: `${id}-coin-1`, x: -6.5 * mirror, z: -1.8, value: 15 },
      { id: `${id}-coin-2`, x: 2.0 * mirror, z: -6.5, value: 20 }
    );
  } else if (tierIndex === 6) {
    // Tier 7 (121-140): Boom Gate Timing
    const bayWidth = 2.85 - levelInTier * 0.01;
    spawn = { x: -9 * mirror, z: 11.5, heading: Math.PI };
    targetBay = {
      x: (3 + (levelInTier % 3) * 2.5) * mirror,
      z: -10.5,
      heading: levelInTier % 2 === 0 ? 0 : Math.PI,
      width: bayWidth,
      length: 5.2,
      requireReverse: levelInTier % 2 === 0,
    };

    // Concrete wall across middle with boom gate opening(s)
    addCurb('gate-wall-l', -9.2 * mirror, 0, 9.5, 1.4);
    addCurb('gate-wall-r', 9.2 * mirror, 0, 9.5, 1.4);

    boomGates.push({
      id: `${id}-gate-0`,
      x: 0,
      z: 0,
      rotation: 0,
      barLength: 7.4,
      periodSec: Math.max(4.6, 6.8 - levelInTier * 0.1),
      openRatio: 0.56,
      phaseOffset: levelInTier * 0.7,
    });

    if (levelInTier >= 10) {
      // Second inner gate near bay
      addCurb('gate-wall-2', -4.5 * mirror, -5.6, 8.5, 1.2);
      boomGates.push({
        id: `${id}-gate-1`,
        x: 5.5 * mirror,
        z: -5.6,
        rotation: 0,
        barLength: 6.6,
        periodSec: 5.2,
        openRatio: 0.54,
        phaseOffset: 2.1 + levelInTier * 0.4,
      });
    }

    addCar('g-park-1', targetBay.x - 3.3, -10.5, targetBay.heading);
    addCar('g-park-2', targetBay.x + 3.3, -10.5, targetBay.heading);
    addCone('g-c1', -2.5 * mirror, 5.5);
    addCone('g-c2', 3.0 * mirror, 5.5);

    coins.push(
      { id: `${id}-coin-0`, x: 0, z: 0, value: 20 },
      { id: `${id}-coin-1`, x: targetBay.x, z: -5.2, value: 20 }
    );
  } else if (tierIndex === 7) {
    // Tier 8 (141-160): Cross-Lot Patrolling Traffic
    const bayWidth = 2.82 - levelInTier * 0.008;
    spawn = { x: 0, z: 12.5, heading: Math.PI };
    const openSlot = (levelInTier % 4) - 1.5; // -1.5..1.5
    const slots = [-7.5, -2.5, 2.5, 7.5];
    buildParkingRow(
      -11.5,
      slots,
      Math.round(openSlot + 1.5),
      levelInTier % 2 === 0 ? 0 : Math.PI,
      levelInTier % 2 === 0,
      bayWidth
    );

    // 1 to 2 patrolling vehicles crossing the lanes horizontally
    patrols.push({
      id: `${id}-patrol-0`,
      startX: -12,
      startZ: 3.5,
      endX: 12,
      endZ: 3.5,
      speed: 4.5 + levelInTier * 0.14,
      phaseOffset: levelInTier * 0.9,
      width: 2.0,
      length: 4.2,
      color: pickColor(rng),
      pauseAtEndsSec: 0.6,
    });

    patrols.push({
      id: `${id}-patrol-1`,
      startX: 12,
      startZ: -4.2,
      endX: -12,
      endZ: -4.2,
      speed: 4.9 + levelInTier * 0.15,
      phaseOffset: 2.2 + levelInTier * 0.6,
      width: 2.0,
      length: 4.2,
      color: pickColor(rng),
      pauseAtEndsSec: 0.5,
    });

    addPlanter('traf-p1', -8.5, -0.3, 4.5, 1.4);
    addPlanter('traf-p2', 8.5, -0.3, 4.5, 1.4);

    coins.push(
      { id: `${id}-coin-0`, x: -3 * mirror, z: 3.5, value: 20 },
      { id: `${id}-coin-1`, x: 3 * mirror, z: -4.2, value: 20 }
    );
  } else if (tierIndex === 8) {
    // Tier 9 (161-180): Tight Alley Maze
    const bayWidth = 2.75 - levelInTier * 0.008;
    spawn = { x: -12 * mirror, z: 12, heading: Math.PI };
    targetBay = {
      x: 11 * mirror,
      z: 10.5,
      heading: levelInTier % 2 === 0 ? 0 : Math.PI,
      width: bayWidth,
      length: 5.1,
      requireReverse: levelInTier % 2 === 0,
    };

    // U-turn concrete alley maze forcing drive around central island
    addCurb('maze-center', 0, 2.5, 2.2, 17);
    addCurb('maze-top', -3.5 * mirror, -9.5, 14, 1.4);
    addCar('maze-car-1', 6.5 * mirror, -4, Math.PI * 0.5);
    addCar('maze-car-2', -6.8 * mirror, 0, Math.PI);
    addCar('maze-car-3', 7.2 * mirror, 10.5, targetBay.heading);

    for (let c = 0; c < 4; c++) {
      addCone(`mz-c-${c}`, (-6 + c * 4) * mirror, -5.5 + (c % 2) * 1.4);
    }

    coins.push(
      { id: `${id}-coin-0`, x: -6.5 * mirror, z: -5.5, value: 20 },
      { id: `${id}-coin-1`, x: 0, z: -13.2, value: 25 },
      { id: `${id}-coin-2`, x: 6.5 * mirror, z: 3.5, value: 20 }
    );
  } else {
    // Tier 10 (181-200): Master Precision (Traffic + Boom Gates + Tight Reverse/Parallel)
    const bayWidth = 2.68 - levelInTier * 0.005;
    const isParallel = levelInTier % 3 === 1;
    spawn = { x: -12 * mirror, z: 13, heading: Math.PI };

    if (isParallel) {
      targetBay = {
        x: 10.5 * mirror,
        z: -8.5,
        heading: Math.PI,
        width: bayWidth,
        length: 5.4,
        requireReverse: true,
      };
      addCurb('m-curb', 13.4 * mirror, -8.5, 1.4, 14);
      addCar('m-front', 10.5 * mirror, -13.8, Math.PI);
      addCar('m-back', 10.5 * mirror, -3.2, Math.PI);
    } else {
      targetBay = {
        x: (5.5 + (levelInTier % 3) * 2.2) * mirror,
        z: -12.5,
        heading: 0,
        width: bayWidth,
        length: 5.1,
        requireReverse: true,
      };
      addCar('m-adj-1', targetBay.x - 3.1, -12.5, 0);
      addCar('m-adj-2', targetBay.x + 3.1, -12.5, 0);
    }

    // Boom gate mid-lot + concrete wings
    addCurb('m-wall-1', -10 * mirror, 3.5, 11, 1.4);
    addCurb('m-wall-2', 10 * mirror, 3.5, 11, 1.4);
    boomGates.push({
      id: `${id}-mgate`,
      x: 0,
      z: 3.5,
      rotation: 0,
      barLength: 7.4,
      periodSec: 4.8,
      openRatio: 0.5,
      phaseOffset: levelInTier * 0.5,
    });

    // Patrolling lot traffic behind the gate
    patrols.push({
      id: `${id}-mpatrol-0`,
      startX: -12.5,
      startZ: -2.2,
      endX: 12.5,
      endZ: -2.2,
      speed: 5.8 + levelInTier * 0.12,
      phaseOffset: levelInTier * 0.8,
      width: 2.0,
      length: 4.2,
      color: pickColor(rng),
      pauseAtEndsSec: 0.4,
    });

    if (levelInTier >= 8) {
      patrols.push({
        id: `${id}-mpatrol-1`,
        startX: 11,
        startZ: 8.2,
        endX: -5 * mirror,
        endZ: 8.2,
        speed: 5.2,
        phaseOffset: 1.7,
        width: 2.0,
        length: 4.2,
        color: pickColor(rng),
        pauseAtEndsSec: 0.5,
      });
    }

    coins.push(
      { id: `${id}-coin-0`, x: 0, z: 3.5, value: 25 },
      { id: `${id}-coin-1`, x: -3 * mirror, z: -2.2, value: 25 },
      { id: `${id}-coin-2`, x: targetBay.x - 2.5 * mirror, z: -6.8, value: 25 }
    );
  }

  const sanitized = sanitizeLevel(spawn, targetBay, staticObstacles, coins);

  const tierMeta = TIER_META[tierIndex];
  const parTimeSec = Math.round(22 + tierIndex * 3.5 + (levelInTier % 5) * 1.5);
  const maxBumps = tierIndex >= 8 ? 2 : 3;
  const baseReward = Math.round(30 + difficulty * 90);

  return {
    id,
    tierIndex,
    tierName: tierMeta.name,
    subtitle: targetBay.requireReverse
      ? `${tierMeta.subtitle} · Tail-in Reverse`
      : tierMeta.subtitle,
    worldHalfW,
    worldHalfD,
    spawn,
    targetBay,
    staticObstacles: sanitized.obstacles,
    patrols,
    boomGates,
    coins: sanitized.coins,
    parTimeSec,
    maxBumps,
    baseReward,
  };
}

export const LEVELS: LevelConfig[] = Array.from({ length: 200 }, (_, i) =>
  buildSingleLevel(i + 1)
);

export function getLevelById(id: number): LevelConfig {
  const clamped = Math.max(1, Math.min(200, Math.floor(id)));
  return LEVELS[clamped - 1];
}
