import * as THREE from 'three';
import {
  BoomGateObstacle,
  LevelConfig,
  StaticObstacle,
  TargetBay,
  VehicleSpec,
} from '../types/game';

export interface CarRig {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  frontLeftPivot: THREE.Group;
  frontRightPivot: THREE.Group;
  brakeLights: THREE.Mesh[];
  reverseLights: THREE.Mesh[];
  bodyMesh: THREE.Mesh;
}

export interface BoomGateRig {
  group: THREE.Group;
  armPivot: THREE.Group;
}

export interface BayRig {
  group: THREE.Group;
  borderMat: THREE.MeshBasicMaterial;
  fillMesh: THREE.Mesh;
  fillMat: THREE.MeshBasicMaterial;
  arrowMeshes: THREE.Mesh[];
}

export function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFB800';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#1E2430';
  for (let x = -64; x < 320; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x + 48, 64);
    ctx.lineTo(x + 24, 64);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRedWhiteStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#EF4444';
  for (let x = -64; x < 320; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 56, 64);
    ctx.lineTo(x + 24, 64);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createParkingSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1B7FFF';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 18;
  ctx.strokeRect(16, 16, 224, 224);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 168px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', 128, 138);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAsphaltTexture(
  halfW: number,
  halfD: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Clean flat low-poly asphalt base matching reference
  ctx.fillStyle = '#565F6E';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle asphalt grain speckles (muted, zero noise clutter)
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let i = 0; i < 1600; i++) {
    const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const ry = (Math.sin(i * 78.233) * 43758.5453) % 1;
    const x = Math.abs(rx) * 1024;
    const y = Math.abs(ry) * 1024;
    ctx.fillRect(x, y, 3, 3);
  }

  // Painted parking lane border & dashed center divider
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.42)';
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, 976, 976);

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.28)';
  ctx.lineWidth = 6;
  ctx.setLineDash([28, 28]);
  ctx.beginPath();
  ctx.moveTo(40, 512);
  ctx.lineTo(984, 512);
  ctx.stroke();
  ctx.setLineDash([]);

  void halfW;
  void halfD;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function buildCarRig(
  spec: Pick<
    VehicleSpec,
    'style' | 'width' | 'length' | 'bodyColor' | 'accentColor' | 'roofColor'
  >,
  castShadow = true
): CarRig {
  const group = new THREE.Group();
  const w = spec.width;
  const l = spec.length;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: spec.bodyColor,
    roughness: 0.28,
    metalness: 0.15,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    flatShading: true,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: spec.roofColor,
    roughness: 0.35,
    metalness: 0.1,
    flatShading: true,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accentColor,
    roughness: 0.45,
    metalness: 0.2,
    flatShading: true,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: '#222834',
    roughness: 0.78,
    metalness: 0.1,
    flatShading: true,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: '#1E2D3D',
    roughness: 0.12,
    metalness: 0.35,
    flatShading: true,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: '#1E242E',
    roughness: 0.88,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: '#CBD5E1',
    roughness: 0.32,
    metalness: 0.75,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#FEF9C3',
    emissive: '#FDE047',
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });

  // 1. Lower Chassis / Bumper skirt
  const skirtGeo = new THREE.BoxGeometry(w * 0.98, 0.24, l * 0.98);
  const skirt = new THREE.Mesh(skirtGeo, darkTrimMat);
  skirt.position.set(0, 0.34, 0);
  skirt.castShadow = castShadow;
  skirt.receiveShadow = true;
  group.add(skirt);

  // 2. Main Sculpted Body Hull
  const bodyH = spec.style === 'suv' || spec.style === 'pickup' ? 0.56 : 0.46;
  const bodyGeo = new THREE.BoxGeometry(w, bodyH, l * 0.95);
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.position.set(0, 0.42 + bodyH * 0.5, 0);
  bodyMesh.castShadow = castShadow;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 3. Cabin / Greenhouse (varies by vehicle style)
  let cabinW = w * 0.84;
  let cabinH = 0.52;
  let cabinL = l * 0.52;
  let cabinZ = -l * 0.06;

  if (spec.style === 'hatchback') {
    cabinL = l * 0.58;
    cabinZ = -l * 0.1;
  } else if (spec.style === 'coupe') {
    cabinH = 0.44;
    cabinL = l * 0.46;
    cabinZ = -l * 0.08;
  } else if (spec.style === 'pickup') {
    cabinH = 0.56;
    cabinL = l * 0.36;
    cabinZ = l * 0.12;
  } else if (spec.style === 'van') {
    cabinW = w * 0.92;
    cabinH = 0.82;
    cabinL = l * 0.72;
    cabinZ = -l * 0.06;
  } else if (spec.style === 'wagon' || spec.style === 'suv') {
    cabinH = spec.style === 'suv' ? 0.62 : 0.52;
    cabinL = l * 0.64;
    cabinZ = -l * 0.11;
  }

  const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL);
  const cabin = new THREE.Mesh(cabinGeo, roofMat);
  cabin.position.set(0, 0.42 + bodyH + cabinH * 0.46, cabinZ);
  cabin.castShadow = castShadow;
  cabin.receiveShadow = true;
  group.add(cabin);

  // 4. Glass Windows Band
  const glassGeo = new THREE.BoxGeometry(cabinW + 0.04, cabinH * 0.66, cabinL + 0.04);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, 0.42 + bodyH + cabinH * 0.42, cabinZ);
  group.add(glass);

  // Style-specific accents
  if (spec.style === 'coupe') {
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.84, 0.08, 0.28),
      accentMat
    );
    spoiler.position.set(0, 0.42 + bodyH + 0.12, -l * 0.42);
    group.add(spoiler);
  } else if (spec.style === 'muscle') {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.26, 0.04, l * 0.94),
      accentMat
    );
    stripe.position.set(0, 0.42 + bodyH + 0.02, 0);
    group.add(stripe);
  } else if (spec.style === 'pickup') {
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.78, 0.14, l * 0.36),
      darkTrimMat
    );
    bed.position.set(0, 0.42 + bodyH - 0.03, -l * 0.26);
    group.add(bed);
  } else if (spec.style === 'suv') {
    const rackL = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, cabinL * 0.8),
      accentMat
    );
    rackL.position.set(-cabinW * 0.36, 0.42 + bodyH + cabinH + 0.02, cabinZ);
    const rackR = rackL.clone();
    rackR.position.x = cabinW * 0.36;
    group.add(rackL, rackR);
  }

  // 5. Headlights (+Z is front nose)
  const hlGeo = new THREE.BoxGeometry(w * 0.2, 0.14, 0.08);
  const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
  hlLeft.position.set(-w * 0.32, 0.56, l * 0.47);
  const hlRight = new THREE.Mesh(hlGeo, headlightMat);
  hlRight.position.set(w * 0.32, 0.56, l * 0.47);
  group.add(hlLeft, hlRight);

  // 6. Brake & Reverse Taillights (-Z is rear)
  const brakeMatL = new THREE.MeshStandardMaterial({
    color: '#DC2626',
    emissive: '#EF4444',
    emissiveIntensity: 0.2,
    roughness: 0.3,
  });
  const brakeMatR = brakeMatL.clone();
  const tlGeo = new THREE.BoxGeometry(w * 0.22, 0.13, 0.08);
  const tlLeft = new THREE.Mesh(tlGeo, brakeMatL);
  tlLeft.position.set(-w * 0.32, 0.56, -l * 0.47);
  const tlRight = new THREE.Mesh(tlGeo, brakeMatR);
  tlRight.position.set(w * 0.32, 0.56, -l * 0.47);
  group.add(tlLeft, tlRight);

  const revMatL = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    emissive: '#FFFFFF',
    emissiveIntensity: 0,
    roughness: 0.25,
  });
  const revMatR = revMatL.clone();
  const rlGeo = new THREE.BoxGeometry(w * 0.12, 0.1, 0.08);
  const rlLeft = new THREE.Mesh(rlGeo, revMatL);
  rlLeft.position.set(-w * 0.15, 0.56, -l * 0.47);
  const rlRight = new THREE.Mesh(rlGeo, revMatR);
  rlRight.position.set(w * 0.15, 0.56, -l * 0.47);
  group.add(rlLeft, rlRight);

  // 7. Side Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.18, 0.1, 0.12);
  const mirrorL = new THREE.Mesh(mirrorGeo, darkTrimMat);
  mirrorL.position.set(-w * 0.54, 0.42 + bodyH + 0.06, l * 0.14);
  const mirrorR = new THREE.Mesh(mirrorGeo, darkTrimMat);
  mirrorR.position.set(w * 0.54, 0.42 + bodyH + 0.06, l * 0.14);
  group.add(mirrorL, mirrorR);

  // 8. Wheels (4 composite tire + rim wheels, front pair inside steering pivots)
  const wheelRadius = 0.34;
  const wheelWidth = 0.24;
  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, wheelWidth + 0.03, 8);
  rimGeo.rotateZ(Math.PI / 2);

  const makeWheel = () => {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    tire.add(rim);
    tire.castShadow = castShadow;
    return tire;
  };

  const frontZ = l * 0.31;
  const rearZ = -l * 0.31;
  const trackX = w * 0.46;

  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-trackX, wheelRadius, frontZ);
  const flWheel = makeWheel();
  frontLeftPivot.add(flWheel);

  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(trackX, wheelRadius, frontZ);
  const frWheel = makeWheel();
  frontRightPivot.add(frWheel);

  const rlWheel = makeWheel();
  rlWheel.position.set(-trackX, wheelRadius, rearZ);
  const rrWheel = makeWheel();
  rrWheel.position.set(trackX, wheelRadius, rearZ);

  group.add(frontLeftPivot, frontRightPivot, rlWheel, rrWheel);

  return {
    group,
    wheels: [flWheel, frWheel, rlWheel, rrWheel],
    frontLeftPivot,
    frontRightPivot,
    brakeLights: [tlLeft, tlRight],
    reverseLights: [rlLeft, rlRight],
    bodyMesh,
  };
}

export function buildLowPolyTree(scale = 1): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 1.4 * scale, 6),
    new THREE.MeshStandardMaterial({ color: '#78482A', roughness: 0.9, flatShading: true })
  );
  trunk.position.y = 0.7 * scale;
  trunk.castShadow = true;

  const foliage1 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15 * scale, 0),
    new THREE.MeshStandardMaterial({ color: '#4ADE80', roughness: 0.82, flatShading: true })
  );
  foliage1.position.y = 2.0 * scale;
  foliage1.castShadow = true;

  const foliage2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85 * scale, 0),
    new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.85, flatShading: true })
  );
  foliage2.position.set(0.35 * scale, 2.75 * scale, 0.2 * scale);
  foliage2.castShadow = true;

  tree.add(trunk, foliage1, foliage2);
  return tree;
}

export function buildConeMesh(): THREE.Group {
  const cone = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.08, 0.68),
    new THREE.MeshStandardMaterial({ color: '#272E3B', roughness: 0.85 })
  );
  base.position.y = 0.04;
  base.castShadow = true;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.26, 0.78, 8),
    new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.55, flatShading: true })
  );
  body.position.y = 0.45;
  body.castShadow = true;

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145, 0.20, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.45 })
  );
  band.position.y = 0.46;

  cone.add(base, body, band);
  return cone;
}

export function buildStaticObstacleMesh(
  obs: StaticObstacle,
  hazardTex: THREE.CanvasTexture
): THREE.Object3D {
  if (obs.kind === 'cone') {
    const cone = buildConeMesh();
    cone.position.set(obs.x, 0, obs.z);
    return cone;
  }

  if (obs.kind === 'parkedCar') {
    const car = buildCarRig(
      {
        style: 'sedan',
        width: obs.width,
        length: obs.length,
        bodyColor: obs.color ?? '#3B82F6',
        accentColor: '#E2E8F0',
        roofColor: obs.color ?? '#3B82F6',
      },
      true
    );
    car.group.position.set(obs.x, 0, obs.z);
    car.group.rotation.y = obs.rotation;
    return car.group;
  }

  if (obs.kind === 'planter') {
    const g = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(obs.width, 0.62, obs.length),
      new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.85, flatShading: true })
    );
    box.position.y = 0.31;
    box.castShadow = true;
    box.receiveShadow = true;
    g.add(box);

    const bushCount = Math.max(2, Math.floor(Math.max(obs.width, obs.length) / 1.7));
    for (let i = 0; i < bushCount; i++) {
      const bush = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.56, 0),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? '#4ADE80' : '#22C55E',
          roughness: 0.85,
          flatShading: true,
        })
      );
      const frac = bushCount === 1 ? 0 : i / (bushCount - 1) - 0.5;
      if (obs.width >= obs.length) {
        bush.position.set(frac * (obs.width - 1.1), 0.78, 0);
      } else {
        bush.position.set(0, 0.78, frac * (obs.length - 1.1));
      }
      bush.castShadow = true;
      g.add(bush);
    }

    g.position.set(obs.x, 0, obs.z);
    g.rotation.y = obs.rotation;
    return g;
  }

  // Curb / concrete barrier with hazard yellow-black top stripe
  const g = new THREE.Group();
  const h = obs.kind === 'wall' ? 1.5 : 0.72;
  const concrete = new THREE.Mesh(
    new THREE.BoxGeometry(obs.width, h, obs.length),
    new THREE.MeshStandardMaterial({ color: '#B0BAC7', roughness: 0.88, flatShading: true })
  );
  concrete.position.y = h * 0.5;
  concrete.castShadow = true;
  concrete.receiveShadow = true;
  g.add(concrete);

  const capTex = hazardTex.clone();
  capTex.needsUpdate = true;
  capTex.repeat.set(Math.max(1, Math.round(Math.max(obs.width, obs.length) / 2.2)), 1);

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(obs.width + 0.04, 0.14, obs.length + 0.04),
    new THREE.MeshStandardMaterial({ map: capTex, roughness: 0.65 })
  );
  cap.position.y = h + 0.05;
  g.add(cap);

  g.position.set(obs.x, 0, obs.z);
  g.rotation.y = obs.rotation;
  return g;
}

export function buildBoomGateRig(
  gate: BoomGateObstacle,
  stripeTex: THREE.CanvasTexture
): BoomGateRig {
  const group = new THREE.Group();

  const yellowMat = new THREE.MeshStandardMaterial({
    color: '#FFB800',
    roughness: 0.42,
    metalness: 0.1,
    flatShading: true,
  });

  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.55), yellowMat);
  postL.position.set(-gate.barLength * 0.5 - 0.3, 0.675, 0);
  postL.castShadow = true;

  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.15, 0.45), yellowMat);
  postR.position.set(gate.barLength * 0.5 + 0.3, 0.575, 0);
  postR.castShadow = true;

  const armPivot = new THREE.Group();
  armPivot.position.set(-gate.barLength * 0.5 - 0.1, 1.05, 0);

  const barTex = stripeTex.clone();
  barTex.needsUpdate = true;
  barTex.repeat.set(3, 1);

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(gate.barLength, 0.2, 0.18),
    new THREE.MeshStandardMaterial({ map: barTex, roughness: 0.5 })
  );
  bar.position.set(gate.barLength * 0.5 + 0.1, 0, 0);
  bar.castShadow = true;
  armPivot.add(bar);

  group.add(postL, postR, armPivot);
  group.position.set(gate.x, 0, gate.z);
  group.rotation.y = gate.rotation;

  return { group, armPivot };
}

export function buildTargetBayRig(bay: TargetBay): BayRig {
  const group = new THREE.Group();
  group.position.set(bay.x, 0.03, bay.z);
  group.rotation.y = bay.heading;

  // Bay fill indicator (grows as alignment holds)
  const fillMat = new THREE.MeshBasicMaterial({
    color: '#FFB800',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const fillMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(bay.width - 0.16, bay.length - 0.16),
    fillMat
  );
  fillMesh.rotation.x = -Math.PI / 2;
  fillMesh.position.y = 0.01;
  group.add(fillMesh);

  // Crisp perimeter border frame (4 strips)
  const borderMat = new THREE.MeshBasicMaterial({
    color: '#F8FAFC',
  });
  const t = 0.16;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(bay.width, t), borderMat);
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, 0.02, bay.length * 0.5);

  const bottom = new THREE.Mesh(new THREE.PlaneGeometry(bay.width, t), borderMat);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.set(0, 0.02, -bay.length * 0.5);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(t, bay.length), borderMat);
  left.rotation.x = -Math.PI / 2;
  left.position.set(-bay.width * 0.5, 0.02, 0);

  const right = new THREE.Mesh(new THREE.PlaneGeometry(t, bay.length), borderMat);
  right.rotation.x = -Math.PI / 2;
  right.position.set(bay.width * 0.5, 0.02, 0);

  group.add(top, bottom, left, right);

  // Directional chevrons inside the bay showing nose heading (+Z in bay local space)
  const arrowMeshes: THREE.Mesh[] = [];
  const chevronShape = new THREE.Shape();
  chevronShape.moveTo(-0.55, -0.35);
  chevronShape.lineTo(0, 0.35);
  chevronShape.lineTo(0.55, -0.35);
  chevronShape.lineTo(0.32, -0.35);
  chevronShape.lineTo(0, 0.08);
  chevronShape.lineTo(-0.32, -0.35);
  chevronShape.closePath();

  const chevronGeo = new THREE.ShapeGeometry(chevronShape);
  chevronGeo.rotateX(Math.PI / 2);

  for (let i = -1; i <= 1; i++) {
    const arrowMat = new THREE.MeshBasicMaterial({
      color: bay.requireReverse ? '#F97316' : '#FACC15',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const arrow = new THREE.Mesh(chevronGeo, arrowMat);
    arrow.position.set(0, 0.025, i * 1.15);
    group.add(arrow);
    arrowMeshes.push(arrow);
  }

  return { group, borderMat, fillMesh, fillMat, arrowMeshes };
}

export function buildCoinMesh(): THREE.Group {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.14, 14),
    new THREE.MeshStandardMaterial({
      color: '#FFB800',
      roughness: 0.28,
      metalness: 0.6,
      flatShading: true,
    })
  );
  outer.rotation.x = Math.PI / 2;
  outer.castShadow = true;

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.17, 10),
    new THREE.MeshStandardMaterial({
      color: '#FDE047',
      roughness: 0.25,
      metalness: 0.45,
      flatShading: true,
    })
  );
  inner.rotation.x = Math.PI / 2;

  g.add(outer, inner);
  g.position.y = 0.85;
  return g;
}

export function buildEnvironmentBackdrop(
  level: LevelConfig,
  maxAnisotropy: number,
  hazardTex: THREE.CanvasTexture,
  stripeTex: THREE.CanvasTexture,
  pSignTex: THREE.CanvasTexture
): THREE.Group {
  const env = new THREE.Group();

  // 1. Extended green grass / plaza ground beyond parking lot (no floating slab void!)
  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: '#63A86C', roughness: 0.95 })
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.06;
  outerGround.receiveShadow = true;
  env.add(outerGround);

  // 2. Asphalt Lot Surface with procedural lines
  const asphaltTex = createAsphaltTexture(
    level.worldHalfW,
    level.worldHalfD,
    maxAnisotropy
  );
  const lotW = level.worldHalfW * 2;
  const lotD = level.worldHalfD * 2;
  const lot = new THREE.Mesh(
    new THREE.PlaneGeometry(lotW, lotD),
    new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  lot.rotation.x = -Math.PI / 2;
  lot.position.y = 0;
  lot.receiveShadow = true;
  env.add(lot);

  // 3. Perimeter Curb Framing around lot
  const curbMat = new THREE.MeshStandardMaterial({
    color: '#B8C1CE',
    roughness: 0.85,
    flatShading: true,
  });
  const topWall = new THREE.Mesh(new THREE.BoxGeometry(lotW + 1.2, 0.7, 0.8), curbMat);
  topWall.position.set(0, 0.35, -level.worldHalfD - 0.4);
  topWall.castShadow = true;
  topWall.receiveShadow = true;

  const botWall = new THREE.Mesh(new THREE.BoxGeometry(lotW + 1.2, 0.55, 0.8), curbMat);
  botWall.position.set(0, 0.275, level.worldHalfD + 0.4);
  botWall.receiveShadow = true;

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, lotD + 1.2), curbMat);
  leftWall.position.set(-level.worldHalfW - 0.4, 0.35, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, lotD + 1.2), curbMat);
  rightWall.position.set(level.worldHalfW + 0.4, 0.35, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;

  env.add(topWall, botWall, leftWall, rightWall);

  // 4. Parking Garage Entrance Structure along North-East edge (like reference screenshot!)
  const garage = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({
    color: '#9BA6B5',
    roughness: 0.86,
    flatShading: true,
  });
  const darkIntMat = new THREE.MeshStandardMaterial({
    color: '#3D4654',
    roughness: 0.9,
  });
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(11, 0.9, 6), concreteMat);
  roofSlab.position.set(0, 4.1, 0);
  roofSlab.castShadow = true;

  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.8, 5.6), concreteMat);
  pillarL.position.set(-4.8, 1.9, 0);
  pillarL.castShadow = true;

  const pillarR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.8, 5.6), concreteMat);
  pillarR.position.set(4.8, 1.9, 0);
  pillarR.castShadow = true;

  const backBox = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.7, 4.4), darkIntMat);
  backBox.position.set(0, 1.85, -0.5);

  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 2.1, 0.25),
    new THREE.MeshStandardMaterial({ map: pSignTex, roughness: 0.35 })
  );
  signBoard.position.set(0, 4.1, 3.1);

  garage.add(roofSlab, pillarL, pillarR, backBox, signBoard);
  garage.position.set(level.worldHalfW - 6.5, 0, -level.worldHalfD - 3.9);
  env.add(garage);

  // Decorative yellow/black bumper strip near bottom edge
  const decoHazard = new THREE.Mesh(
    new THREE.BoxGeometry(lotW * 0.4, 0.22, 0.6),
    new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.6 })
  );
  decoHazard.position.set(-level.worldHalfW * 0.25, 0.11, level.worldHalfD + 0.45);
  env.add(decoHazard);

  // Decorative static boom gate next to garage
  const decoGate = buildBoomGateRig(
    {
      id: 'deco-garage-gate',
      x: level.worldHalfW - 6.5,
      z: -level.worldHalfD - 0.6,
      rotation: 0,
      barLength: 6.2,
      periodSec: 8,
      openRatio: 0.5,
      phaseOffset: 0,
    },
    stripeTex
  );
  env.add(decoGate.group);

  // 5. Low-Poly Trees ringing the outside of the lot
  const treePositions: Array<[number, number, number]> = [
    [-level.worldHalfW - 3.5, -level.worldHalfD - 2.5, 1.2],
    [-level.worldHalfW - 4.2, -4, 1.05],
    [-level.worldHalfW - 3.5, 6, 1.25],
    [-level.worldHalfW + 3, -level.worldHalfD - 3.5, 1.1],
    [-level.worldHalfW + 10, -level.worldHalfD - 4.0, 1.3],
    [level.worldHalfW + 3.8, -level.worldHalfD - 2.0, 1.15],
    [level.worldHalfW + 4.2, 3, 1.2],
    [level.worldHalfW + 3.6, 10, 1.0],
  ];
  treePositions.forEach(([tx, tz, sc]) => {
    const t = buildLowPolyTree(sc);
    t.position.set(tx, 0, tz);
    env.add(t);
  });

  // 6. Distant Low-Poly Blue City Skyline Towers (matching reference horizon!)
  const cityMat1 = new THREE.MeshStandardMaterial({
    color: '#4B8CE8',
    roughness: 0.85,
    flatShading: true,
  });
  const cityMat2 = new THREE.MeshStandardMaterial({
    color: '#3B7AD9',
    roughness: 0.85,
    flatShading: true,
  });
  const towers: Array<[number, number, number, number, number]> = [
    [-34, -42, 7, 22, 7],
    [-23, -45, 6, 16, 6],
    [-13, -41, 8, 26, 8],
    [-2, -46, 6, 18, 6],
    [9, -43, 7, 24, 7],
    [22, -44, 8, 19, 7],
    [34, -40, 7, 25, 7],
    [-42, -24, 7, 18, 7],
    [42, -22, 7, 20, 7],
  ];
  towers.forEach(([bx, bz, bw, bh, bd], idx) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bd),
      idx % 2 === 0 ? cityMat1 : cityMat2
    );
    m.position.set(bx, bh * 0.5 - 0.1, bz);
    env.add(m);
  });

  // 7. Blocky Low-Poly Clouds high in the sky
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.9,
    flatShading: true,
  });
  const cloudSpots: Array<[number, number, number]> = [
    [-24, 22, -36],
    [18, 25, -40],
    [-4, 28, -48],
  ];
  cloudSpots.forEach(([cx, cy, cz]) => {
    const cloud = new THREE.Group();
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 0), cloudMat);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 0), cloudMat);
    c2.position.set(2.3, -0.4, 0.3);
    const c3 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 0), cloudMat);
    c3.position.set(-2.2, -0.5, -0.2);
    cloud.add(c1, c2, c3);
    cloud.position.set(cx, cy, cz);
    env.add(cloud);
  });

  return env;
}
