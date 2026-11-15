import {
  BoomGateObstacle,
  GearMode,
  LevelConfig,
  PatrolObstacle,
  StaticObstacle,
  TargetBay,
  VehicleSpec,
} from '../types/game';

export interface CarState {
  x: number;
  z: number;
  heading: number; // radians, nose is (sin(heading), cos(heading))
  speed: number; // signed forward speed (positive = forward along nose)
  steerAngle: number; // current front wheel angle (radians, + = steer right)
  wheelSpin: number;
}

export interface ControlInput {
  steerTarget: number; // -1..1 (+1 = right)
  gas: number; // 0..1
  brake: number; // 0..1
  gear: GearMode;
  sensitivity: number;
}

export interface Box2D {
  x: number;
  z: number;
  heading: number;
  halfW: number;
  halfL: number;
}

export interface CollisionResult {
  collided: boolean;
  pushX: number;
  pushZ: number;
  impactSpeed: number;
  hitKind: string;
}

export interface BayEvalResult {
  inBay: boolean;
  angleAligned: boolean;
  reverseValid: boolean;
  allReady: boolean;
}

const _cornersA: Array<[number, number]> = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];
const _cornersB: Array<[number, number]> = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];

export function normalizeAngle(a: number): number {
  let res = a % (Math.PI * 2);
  if (res > Math.PI) res -= Math.PI * 2;
  if (res < -Math.PI) res += Math.PI * 2;
  return res;
}

export function getBoxCorners(
  box: Box2D,
  out: Array<[number, number]>
): Array<[number, number]> {
  const s = Math.sin(box.heading);
  const c = Math.cos(box.heading);
  // Forward axis: (s, c), Right axis: (c, -s)
  const fx = s * box.halfL;
  const fz = c * box.halfL;
  const rx = c * box.halfW;
  const rz = -s * box.halfW;

  out[0][0] = box.x + fx + rx;
  out[0][1] = box.z + fz + rz;
  out[1][0] = box.x + fx - rx;
  out[1][1] = box.z + fz - rz;
  out[2][0] = box.x - fx - rx;
  out[2][1] = box.z - fz - rz;
  out[3][0] = box.x - fx + rx;
  out[3][1] = box.z - fz + rz;
  return out;
}

// SAT collision returning MTV (minimum translation vector) to push A out of B
function collideOBBvsOBB(
  a: Box2D,
  b: Box2D
): { hit: boolean; mtvX: number; mtvZ: number } {
  getBoxCorners(a, _cornersA);
  getBoxCorners(b, _cornersB);

  const axes: Array<[number, number]> = [
    [Math.sin(a.heading), Math.cos(a.heading)],
    [Math.cos(a.heading), -Math.sin(a.heading)],
    [Math.sin(b.heading), Math.cos(b.heading)],
    [Math.cos(b.heading), -Math.sin(b.heading)],
  ];

  let minOverlap = Infinity;
  let bestAxisX = 0;
  let bestAxisZ = 0;

  for (let i = 0; i < 4; i++) {
    const ax = axes[i][0];
    const az = axes[i][1];

    let minA = Infinity;
    let maxA = -Infinity;
    for (let k = 0; k < 4; k++) {
      const p = _cornersA[k][0] * ax + _cornersA[k][1] * az;
      if (p < minA) minA = p;
      if (p > maxA) maxA = p;
    }

    let minB = Infinity;
    let maxB = -Infinity;
    for (let k = 0; k < 4; k++) {
      const p = _cornersB[k][0] * ax + _cornersB[k][1] * az;
      if (p < minB) minB = p;
      if (p > maxB) maxB = p;
    }

    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= 0) {
      return { hit: false, mtvX: 0, mtvZ: 0 };
    }
    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestAxisX = ax;
      bestAxisZ = az;
    }
  }

  // Ensure push direction points from B toward A
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  if (dx * bestAxisX + dz * bestAxisZ < 0) {
    bestAxisX = -bestAxisX;
    bestAxisZ = -bestAxisZ;
  }

  return {
    hit: true,
    mtvX: bestAxisX * minOverlap,
    mtvZ: bestAxisZ * minOverlap,
  };
}

function collideOBBvsCircle(
  box: Box2D,
  cx: number,
  cz: number,
  radius: number
): { hit: boolean; mtvX: number; mtvZ: number } {
  const s = Math.sin(box.heading);
  const c = Math.cos(box.heading);

  // Transform circle center into box local space
  const dx = cx - box.x;
  const dz = cz - box.z;
  // Forward axis (s, c), Right axis (c, -s)
  const localForward = dx * s + dz * c;
  const localRight = dx * c - dz * s;

  const clampedR = Math.max(-box.halfW, Math.min(box.halfW, localRight));
  const clampedF = Math.max(-box.halfL, Math.min(box.halfL, localForward));

  const diffR = localRight - clampedR;
  const diffF = localForward - clampedF;
  const distSq = diffR * diffR + diffF * diffF;

  if (distSq >= radius * radius) {
    return { hit: false, mtvX: 0, mtvZ: 0 };
  }

  const dist = Math.sqrt(distSq);
  let pushLocalR = 0;
  let pushLocalF = 0;

  if (dist > 0.0001) {
    const pen = radius - dist;
    // Push box away from circle (opposite of diff)
    pushLocalR = -(diffR / dist) * pen;
    pushLocalF = -(diffF / dist) * pen;
  } else {
    pushLocalF = -(radius + box.halfL);
  }

  // Convert local push back to world space
  const pushX = pushLocalF * s + pushLocalR * c;
  const pushZ = pushLocalF * c - pushLocalR * s;

  return { hit: true, mtvX: pushX, mtvZ: pushZ };
}

export function getPatrolPose(
  patrol: PatrolObstacle,
  timeSec: number
): { x: number; z: number; heading: number } {
  const dx = patrol.endX - patrol.startX;
  const dz = patrol.endZ - patrol.startZ;
  const dist = Math.hypot(dx, dz) || 1;
  const travelSec = dist / patrol.speed;
  const halfCycle = travelSec + patrol.pauseAtEndsSec;
  const fullCycle = halfCycle * 2;
  const t = (timeSec + patrol.phaseOffset) % fullCycle;

  let frac = 0;
  let forward = true;
  if (t < travelSec) {
    frac = t / travelSec;
    forward = true;
  } else if (t < halfCycle) {
    frac = 1;
    forward = true;
  } else if (t < halfCycle + travelSec) {
    frac = 1 - (t - halfCycle) / travelSec;
    forward = false;
  } else {
    frac = 0;
    forward = false;
  }

  // Smooth ease at ends
  const smooth = frac * frac * (3 - 2 * frac);
  const x = patrol.startX + dx * smooth;
  const z = patrol.startZ + dz * smooth;
  const baseHeading = Math.atan2(dx, dz);
  const heading = forward ? baseHeading : normalizeAngle(baseHeading + Math.PI);
  return { x, z, heading };
}

export function getBoomGateState(
  gate: BoomGateObstacle,
  timeSec: number
): { openFactor: number; isClosed: boolean } {
  const phase = ((timeSec + gate.phaseOffset) % gate.periodSec) / gate.periodSec;
  // Open for openRatio, smooth transition over 0.12 of cycle
  const ramp = 0.12;
  let openFactor = 0;
  if (phase < gate.openRatio) {
    if (phase < ramp) {
      openFactor = phase / ramp;
    } else if (phase > gate.openRatio - ramp) {
      openFactor = (gate.openRatio - phase) / ramp;
    } else {
      openFactor = 1;
    }
  } else {
    openFactor = 0;
  }
  return {
    openFactor: Math.max(0, Math.min(1, openFactor)),
    isClosed: openFactor < 0.45,
  };
}

export function stepCarPhysics(
  car: CarState,
  vehicle: VehicleSpec,
  input: ControlInput,
  dt: number
): void {
  const clampedDt = Math.min(dt, 0.05);
  const targetSteer = input.steerTarget * vehicle.maxSteerAngle;
  const steerLerp = 1 - Math.exp(-10 * input.sensitivity * clampedDt);
  car.steerAngle += (targetSteer - car.steerAngle) * steerLerp;

  const dirSign = input.gear === 'D' ? 1 : -1;
  const maxSpd =
    input.gear === 'D' ? vehicle.maxSpeed : -vehicle.maxReverseSpeed;

  if (input.brake > 0.05) {
    const brakeDecel = 22 * input.brake * clampedDt;
    if (Math.abs(car.speed) <= brakeDecel) {
      car.speed = 0;
    } else {
      car.speed -= Math.sign(car.speed) * brakeDecel;
    }
  } else if (input.gas > 0.02) {
    const accelStep = vehicle.accel * input.gas * dirSign * clampedDt;
    car.speed += accelStep;
    if (dirSign > 0 && car.speed > maxSpd) car.speed = maxSpd;
    if (dirSign < 0 && car.speed < maxSpd) car.speed = maxSpd;
  } else {
    // Natural rolling resistance
    const drag = Math.exp(-3.4 * clampedDt);
    car.speed *= drag;
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }

  // Prevent moving opposite to selected gear except braking
  if (input.gear === 'D' && car.speed < 0) {
    car.speed = Math.min(0, car.speed + 18 * clampedDt);
  } else if (input.gear === 'R' && car.speed > 0) {
    car.speed = Math.max(0, car.speed - 18 * clampedDt);
  }

  if (Math.abs(car.speed) > 0.01) {
    const omega =
      (car.speed / vehicle.wheelbase) * Math.tan(car.steerAngle);
    car.heading = normalizeAngle(car.heading - omega * clampedDt);

    const sinH = Math.sin(car.heading);
    const cosH = Math.cos(car.heading);
    car.x += sinH * car.speed * clampedDt;
    car.z += cosH * car.speed * clampedDt;
    car.wheelSpin += (car.speed * clampedDt) / 0.34;
  }
}

export function resolveLevelCollisions(
  car: CarState,
  vehicle: VehicleSpec,
  level: LevelConfig,
  timeSec: number
): CollisionResult {
  const carBox: Box2D = {
    x: car.x,
    z: car.z,
    heading: car.heading,
    halfW: vehicle.width * 0.47,
    halfL: vehicle.length * 0.47,
  };

  let totalPushX = 0;
  let totalPushZ = 0;
  let collided = false;
  let hitKind = '';
  const impactSpeed = Math.abs(car.speed);

  // 1. Static obstacles
  for (let i = 0; i < level.staticObstacles.length; i++) {
    const obs: StaticObstacle = level.staticObstacles[i];
    if (obs.kind === 'cone' || obs.kind === 'pillar') {
      const r = obs.radius ?? Math.min(obs.width, obs.length) * 0.5;
      const res = collideOBBvsCircle(carBox, obs.x, obs.z, r);
      if (res.hit) {
        collided = true;
        hitKind = obs.kind;
        totalPushX += res.mtvX;
        totalPushZ += res.mtvZ;
        carBox.x += res.mtvX;
        carBox.z += res.mtvZ;
      }
    } else {
      const obsBox: Box2D = {
        x: obs.x,
        z: obs.z,
        heading: obs.rotation,
        halfW: obs.width * 0.5,
        halfL: obs.length * 0.5,
      };
      const res = collideOBBvsOBB(carBox, obsBox);
      if (res.hit) {
        collided = true;
        hitKind = obs.kind;
        totalPushX += res.mtvX;
        totalPushZ += res.mtvZ;
        carBox.x += res.mtvX;
        carBox.z += res.mtvZ;
      }
    }
  }

  // 2. Patrolling vehicles
  for (let i = 0; i < level.patrols.length; i++) {
    const p = level.patrols[i];
    const pose = getPatrolPose(p, timeSec);
    const pBox: Box2D = {
      x: pose.x,
      z: pose.z,
      heading: pose.heading,
      halfW: p.width * 0.48,
      halfL: p.length * 0.48,
    };
    const res = collideOBBvsOBB(carBox, pBox);
    if (res.hit) {
      collided = true;
      hitKind = 'traffic';
      totalPushX += res.mtvX;
      totalPushZ += res.mtvZ;
      carBox.x += res.mtvX;
      carBox.z += res.mtvZ;
    }
  }

  // 3. Boom gates (when closed)
  for (let i = 0; i < level.boomGates.length; i++) {
    const gate = level.boomGates[i];
    const state = getBoomGateState(gate, timeSec);
    if (state.isClosed) {
      const gateBox: Box2D = {
        x: gate.x,
        z: gate.z,
        heading: gate.rotation,
        halfW: gate.barLength * 0.5,
        halfL: 0.25,
      };
      const res = collideOBBvsOBB(carBox, gateBox);
      if (res.hit) {
        collided = true;
        hitKind = 'gate';
        totalPushX += res.mtvX;
        totalPushZ += res.mtvZ;
        carBox.x += res.mtvX;
        carBox.z += res.mtvZ;
      }
    }
  }

  // 4. World perimeter bounds
  const marginX = level.worldHalfW - vehicle.width * 0.6;
  const marginZ = level.worldHalfD - vehicle.width * 0.6;
  if (carBox.x < -marginX) {
    totalPushX += -marginX - carBox.x;
    carBox.x = -marginX;
    collided = true;
    hitKind = 'boundary';
  } else if (carBox.x > marginX) {
    totalPushX += marginX - carBox.x;
    carBox.x = marginX;
    collided = true;
    hitKind = 'boundary';
  }
  if (carBox.z < -marginZ) {
    totalPushZ += -marginZ - carBox.z;
    carBox.z = -marginZ;
    collided = true;
    hitKind = 'boundary';
  } else if (carBox.z > marginZ) {
    totalPushZ += marginZ - carBox.z;
    carBox.z = marginZ;
    collided = true;
    hitKind = 'boundary';
  }

  if (collided) {
    car.x = carBox.x;
    car.z = carBox.z;
    // Bounce back gently and damp speed
    car.speed = -Math.sign(car.speed) * Math.min(1.6, impactSpeed * 0.3);
  }

  return {
    collided,
    pushX: totalPushX,
    pushZ: totalPushZ,
    impactSpeed,
    hitKind,
  };
}

export function evaluateParkingBay(
  car: CarState,
  vehicle: VehicleSpec,
  bay: TargetBay,
  gear: GearMode
): BayEvalResult {
  const carBox: Box2D = {
    x: car.x,
    z: car.z,
    heading: car.heading,
    halfW: vehicle.width * 0.48,
    halfL: vehicle.length * 0.48,
  };

  getBoxCorners(carBox, _cornersA);

  const sinB = Math.sin(bay.heading);
  const cosB = Math.cos(bay.heading);
  const halfBayW = bay.width * 0.5 + 0.14;
  const halfBayL = bay.length * 0.5 + 0.16;

  let allInside = true;
  for (let i = 0; i < 4; i++) {
    const dx = _cornersA[i][0] - bay.x;
    const dz = _cornersA[i][1] - bay.z;
    const localF = dx * sinB + dz * cosB;
    const localR = dx * cosB - dz * sinB;
    if (Math.abs(localR) > halfBayW || Math.abs(localF) > halfBayL) {
      allInside = false;
      break;
    }
  }

  const angleDiff = Math.abs(normalizeAngle(car.heading - bay.heading));
  // If requireReverse is false, either nose-in or tail-in is acceptable (within 18 deg),
  // though bay chevron points toward bay.heading; if requireReverse is true, must match bay.heading (tail-in)!
  const angleTol = 0.33; // ~19 deg
  const angleAligned = bay.requireReverse
    ? angleDiff <= angleTol
    : angleDiff <= angleTol || Math.abs(Math.PI - angleDiff) <= angleTol;

  // For reverse-required bays, player should either arrive in R or be aligned tail-in
  const reverseValid = !bay.requireReverse || gear === 'R' || angleDiff <= angleTol;
  const speedSlow = Math.abs(car.speed) < 1.25;

  return {
    inBay: allInside,
    angleAligned,
    reverseValid,
    allReady: allInside && angleAligned && reverseValid && speedSlow,
  };
}
