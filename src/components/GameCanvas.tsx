import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GearMode,
  HudSnapshot,
  LevelConfig,
  ScreenRoute,
  VehicleSpec,
} from '../types/game';
import {
  BayRig,
  BoomGateRig,
  buildBoomGateRig,
  buildCarRig,
  buildCoinMesh,
  buildEnvironmentBackdrop,
  buildStaticObstacleMesh,
  buildTargetBayRig,
  CarRig,
  createHazardStripeTexture,
  createParkingSignTexture,
  createRedWhiteStripeTexture,
} from '../engine/lowPolyModels';
import {
  CarState,
  ControlInput,
  evaluateParkingBay,
  getBoomGateState,
  getPatrolPose,
  resolveLevelCollisions,
  stepCarPhysics,
} from '../engine/physics';
import { soundEngine } from '../audio/soundEngine';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  vrx: number;
  vry: number;
  life: number;
  maxLife: number;
}

interface GameCanvasProps {
  screen: ScreenRoute;
  paused: boolean;
  level: LevelConfig;
  vehicle: VehicleSpec;
  runKey: number;
  controlRef: React.MutableRefObject<{
    steerTarget: number;
    gas: number;
    brake: number;
    gear: GearMode;
    sensitivity: number;
  }>;
  onHudUpdate: (hud: HudSnapshot) => void;
  onWin: (stats: {
    elapsedSec: number;
    bumpsUsed: number;
    coinsCollected: number;
    coinBonusValue: number;
  }) => void;
  onCrash: (stats: { elapsedSec: number; bumpsUsed: number }) => void;
}

const CONFETTI_COLORS = ['#FFB800', '#1B7FFF', '#3EC929', '#EF4444', '#8B3DFF'];

export const GameCanvas: React.FC<GameCanvasProps> = ({
  screen,
  paused,
  level,
  vehicle,
  runKey,
  controlRef,
  onHudUpdate,
  onWin,
  onCrash,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Latest props in refs so WebGL renderer lives once without teardown
  const screenRef = useRef(screen);
  const pausedRef = useRef(paused);
  const levelRef = useRef(level);
  const vehicleRef = useRef(vehicle);
  const callbacksRef = useRef({ onHudUpdate, onWin, onCrash });

  screenRef.current = screen;
  pausedRef.current = paused;
  levelRef.current = level;
  vehicleRef.current = vehicle;
  callbacksRef.current = { onHudUpdate, onWin, onCrash };

  // Trigger scene rebuild signal when level/vehicle/runKey changes
  const rebuildSignalRef = useRef({
    levelId: level.id,
    vehicleId: vehicle.id,
    runKey,
    screen,
    dirty: true,
  });

  if (
    rebuildSignalRef.current.levelId !== level.id ||
    rebuildSignalRef.current.vehicleId !== vehicle.id ||
    rebuildSignalRef.current.runKey !== runKey ||
    (rebuildSignalRef.current.screen !== screen &&
      (screen === 'playing' || rebuildSignalRef.current.screen === 'playing'))
  ) {
    rebuildSignalRef.current = {
      levelId: level.id,
      vehicleId: vehicle.id,
      runKey,
      screen,
      dirty: true,
    };
  }

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored
    );

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#5BB8FF');
    scene.fog = new THREE.Fog('#72C6FF', 42, 115);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      44,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.5,
      200
    );

    // Warm sun + cool sky hemisphere fill
    const hemi = new THREE.HemisphereLight('#BDE3FF', '#587A5C', 0.85);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#FFF7E0', 1.65);
    sun.position.set(18, 34, 22);
    sun.castShadow = !isSoftwareGl;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 95;
    const d = 26;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const hazardTex = createHazardStripeTexture();
    const stripeTex = createRedWhiteStripeTexture();
    const pSignTex = createParkingSignTexture();

    // Dynamic world root cleared/rebuilt per level
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    const particles: Particle[] = [];
    const particleGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);

    const spawnParticles = (
      x: number,
      y: number,
      z: number,
      count: number,
      colors: string[],
      speedSpread: number,
      upward: number,
      lifeSec: number
    ) => {
      for (let i = 0; i < count; i++) {
        if (particles.length > 90) break;
        const mat = new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
        });
        const m = new THREE.Mesh(particleGeo, mat);
        m.position.set(x, y, z);
        particleGroup.add(m);
        const angle = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.7) * speedSpread;
        particles.push({
          mesh: m,
          vx: Math.cos(angle) * spd,
          vy: upward * (0.6 + Math.random() * 0.8),
          vz: Math.sin(angle) * spd,
          vrx: (Math.random() - 0.5) * 10,
          vry: (Math.random() - 0.5) * 10,
          life: lifeSec,
          maxLife: lifeSec,
        });
      }
    };

    // Active run state
    let playerRig: CarRig | null = null;
    let bayRig: BayRig | null = null;
    let patrolRigs: CarRig[] = [];
    let gateRigs: BoomGateRig[] = [];
    let coinEntries: Array<{
      id: string;
      x: number;
      z: number;
      value: number;
      collected: boolean;
      mesh: THREE.Group;
    }> = [];

    const carState: CarState = {
      x: 0,
      z: 0,
      heading: Math.PI,
      speed: 0,
      steerAngle: 0,
      wheelSpin: 0,
    };

    let elapsedSec = 0;
    let bumpsUsed = 0;
    let bumpCooldown = 0;
    let bayHoldSec = 0;
    let runEnded = false;
    let coinsCollectedCount = 0;
    let coinsBonusValue = 0;
    let shakeTimer = 0;
    let hudSyncAccum = 0;
    let lastBayTickBucket = -1;

    const disposeGroup = (grp: THREE.Group) => {
      grp.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      while (grp.children.length > 0) {
        grp.remove(grp.children[0]);
      }
    };

    const rebuildWorld = () => {
      disposeGroup(worldGroup);
      patrolRigs = [];
      gateRigs = [];
      coinEntries = [];

      const lvl = levelRef.current;
      const veh = vehicleRef.current;
      const isPlaying = screenRef.current === 'playing';

      const backdrop = buildEnvironmentBackdrop(
        lvl,
        maxAnisotropy,
        hazardTex,
        stripeTex,
        pSignTex
      );
      worldGroup.add(backdrop);

      if (isPlaying) {
        // Target Bay
        bayRig = buildTargetBayRig(lvl.targetBay);
        worldGroup.add(bayRig.group);

        // Static obstacles
        lvl.staticObstacles.forEach((obs) => {
          const mesh = buildStaticObstacleMesh(obs, hazardTex);
          worldGroup.add(mesh);
        });

        // Patrolling traffic cars
        lvl.patrols.forEach((p) => {
          const rig = buildCarRig(
            {
              style: 'sedan',
              width: p.width,
              length: p.length,
              bodyColor: p.color,
              accentColor: '#F8FAFC',
              roofColor: p.color,
            },
            !isSoftwareGl
          );
          worldGroup.add(rig.group);
          patrolRigs.push(rig);
        });

        // Boom gates
        lvl.boomGates.forEach((g) => {
          const rig = buildBoomGateRig(g, stripeTex);
          worldGroup.add(rig.group);
          gateRigs.push(rig);
        });

        // Collectible coins
        lvl.coins.forEach((c) => {
          const mesh = buildCoinMesh();
          mesh.position.set(c.x, 0.85, c.z);
          worldGroup.add(mesh);
          coinEntries.push({
            id: c.id,
            x: c.x,
            z: c.z,
            value: c.value,
            collected: false,
            mesh,
          });
        });

        // Player car at level spawn
        playerRig = buildCarRig(veh, !isSoftwareGl);
        worldGroup.add(playerRig.group);

        carState.x = lvl.spawn.x;
        carState.z = lvl.spawn.z;
        carState.heading = lvl.spawn.heading;
        carState.speed = 0;
        carState.steerAngle = 0;
        carState.wheelSpin = 0;

        playerRig.group.position.set(carState.x, 0, carState.z);
        playerRig.group.rotation.y = carState.heading;

        // Position camera immediately at level start (then damp smoothly)
        const aspect =
          Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
        const camH = aspect < 0.85 ? 25 : 20;
        const camZOff = aspect < 0.85 ? 14.5 : 12.5;
        camera.position.set(carState.x, camH, carState.z + camZOff);
        camera.lookAt(carState.x, 0.4, carState.z - 1.2);
      } else {
        // Showcase Menu Backdrop: park player's vehicle near garage entrance with decorative cones
        bayRig = null;
        playerRig = buildCarRig(veh, !isSoftwareGl);
        playerRig.group.position.set(-2.5, 0, -4.5);
        playerRig.group.rotation.y = Math.PI * 0.16;
        worldGroup.add(playerRig.group);

        const decoCones: Array<[number, number]> = [
          [-7.5, -1.5],
          [4.5, -2.5],
          [-5.5, 4.0],
          [7.5, 3.2],
        ];
        decoCones.forEach(([cx, cz], idx) => {
          const cone = buildStaticObstacleMesh(
            {
              id: `menu-cone-${idx}`,
              kind: 'cone',
              x: cx,
              z: cz,
              rotation: 0,
              width: 0.72,
              length: 0.72,
              radius: 0.36,
            },
            hazardTex
          );
          worldGroup.add(cone);
        });

        camera.position.set(0, 7.2, 11.5);
        camera.lookAt(1.5, 1.8, -12);
      }

      elapsedSec = 0;
      bumpsUsed = 0;
      bumpCooldown = 0;
      bayHoldSec = 0;
      runEnded = false;
      coinsCollectedCount = 0;
      coinsBonusValue = 0;
      shakeTimer = 0;
      hudSyncAccum = 0;
      lastBayTickBucket = -1;

      callbacksRef.current.onHudUpdate({
        speedKmh: 0,
        bumpsLeft: lvl.maxBumps,
        maxBumps: lvl.maxBumps,
        elapsedSec: 0,
        bayProgress: 0,
        inBay: false,
        angleAligned: false,
        reverseValid: true,
        coinsCollectedInRun: 0,
        coinBonusValue: 0,
      });

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
      rebuildSignalRef.current.dirty = false;
    };

    rebuildWorld();

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let unmounted = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (unmounted) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const _camTarget = new THREE.Vector3();
    const _lookTarget = new THREE.Vector3();

    const tick = () => {
      if (unmounted) return;
      const rawDelta = clock.getDelta();
      const dt = Math.min(rawDelta, 0.05);

      if (rebuildSignalRef.current.dirty) {
        rebuildWorld();
      }

      const curScreen = screenRef.current;
      const isPaused = pausedRef.current;
      const lvl = levelRef.current;
      const veh = vehicleRef.current;

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particleGroup.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          particles.splice(i, 1);
          continue;
        }
        p.vy -= 12 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y = Math.max(0.12, p.mesh.position.y + p.vy * dt);
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.x += p.vrx * dt;
        p.mesh.rotation.y += p.vry * dt;
        const s = Math.max(0.05, p.life / p.maxLife);
        p.mesh.scale.setScalar(s);
      }

      if (curScreen === 'playing' && !isPaused && !runEnded && playerRig) {
        elapsedSec += dt;
        if (bumpCooldown > 0) bumpCooldown -= dt;
        if (shakeTimer > 0) shakeTimer -= dt;

        const ctrl = controlRef.current;
        const input: ControlInput = {
          steerTarget: ctrl.steerTarget,
          gas: ctrl.gas,
          brake: ctrl.brake,
          gear: ctrl.gear,
          sensitivity: ctrl.sensitivity,
        };

        stepCarPhysics(carState, veh, input, dt);

        // Update engine audio
        soundEngine.updateEngine(
          Math.abs(carState.speed) / veh.maxSpeed,
          ctrl.gas,
          true
        );

        // Resolve collisions
        const col = resolveLevelCollisions(carState, veh, lvl, elapsedSec);
        if (col.collided && bumpCooldown <= 0 && col.impactSpeed > 0.65) {
          bumpsUsed += 1;
          bumpCooldown = 0.85;
          shakeTimer = 0.28;
          soundEngine.playBump(Math.min(1, col.impactSpeed / 7));
          spawnParticles(
            carState.x,
            0.7,
            carState.z,
            10,
            ['#F97316', '#FFB800', '#FFFFFF'],
            4.8,
            4.5,
            0.48
          );

          if (bumpsUsed >= lvl.maxBumps) {
            runEnded = true;
            soundEngine.updateEngine(0, 0, false);
            soundEngine.playLevelFail();
            callbacksRef.current.onCrash({ elapsedSec, bumpsUsed });
          }
        }

        // Tire dust puff when braking firmly at speed
        if (ctrl.brake > 0.3 && Math.abs(carState.speed) > 3.2 && Math.random() < 0.35) {
          spawnParticles(
            carState.x,
            0.18,
            carState.z,
            1,
            ['#CBD5E1', '#94A3B8'],
            1.4,
            1.4,
            0.35
          );
        }

        // Update car mesh & wheel visuals
        playerRig.group.position.set(carState.x, 0, carState.z);
        playerRig.group.rotation.y = carState.heading;
        playerRig.frontLeftPivot.rotation.y = -carState.steerAngle;
        playerRig.frontRightPivot.rotation.y = -carState.steerAngle;
        for (let w = 0; w < playerRig.wheels.length; w++) {
          playerRig.wheels[w].rotation.x = carState.wheelSpin;
        }
        const brakeGlow = ctrl.brake > 0.1 ? 1.4 : 0.2;
        playerRig.brakeLights.forEach((m) => {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = brakeGlow;
        });
        const revGlow = ctrl.gear === 'R' ? 1.2 : 0;
        playerRig.reverseLights.forEach((m) => {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = revGlow;
        });

        // Update dynamic patrols
        for (let i = 0; i < lvl.patrols.length; i++) {
          const pose = getPatrolPose(lvl.patrols[i], elapsedSec);
          const rig = patrolRigs[i];
          if (rig) {
            rig.group.position.set(pose.x, 0, pose.z);
            rig.group.rotation.y = pose.heading;
          }
        }

        // Update boom gates
        for (let i = 0; i < lvl.boomGates.length; i++) {
          const state = getBoomGateState(lvl.boomGates[i], elapsedSec);
          const rig = gateRigs[i];
          if (rig) {
            rig.armPivot.rotation.z = state.openFactor * (Math.PI * 0.44);
          }
        }

        // Update & check collectible coins
        for (let i = 0; i < coinEntries.length; i++) {
          const c = coinEntries[i];
          if (c.collected) continue;
          c.mesh.rotation.y += dt * 3.1;
          c.mesh.position.y = 0.85 + Math.sin(elapsedSec * 4 + i) * 0.14;
          const dist = Math.hypot(carState.x - c.x, carState.z - c.z);
          if (dist < veh.width * 0.58 + 0.65) {
            c.collected = true;
            c.mesh.visible = false;
            coinsCollectedCount += 1;
            coinsBonusValue += c.value;
            soundEngine.playCoinPickup();
            spawnParticles(
              c.x,
              1.0,
              c.z,
              14,
              ['#FFB800', '#FDE047', '#FFFFFF'],
              4.2,
              5.2,
              0.55
            );
          }
        }

        // Evaluate Target Parking Bay
        const bayEval = evaluateParkingBay(
          carState,
          veh,
          lvl.targetBay,
          ctrl.gear
        );

        if (bayEval.allReady) {
          bayHoldSec = Math.min(0.85, bayHoldSec + dt);
          const bucket = Math.floor((bayHoldSec / 0.85) * 4);
          if (bucket !== lastBayTickBucket && bucket < 4) {
            lastBayTickBucket = bucket;
            soundEngine.playBayLockTick();
          }
        } else {
          bayHoldSec = Math.max(0, bayHoldSec - dt * 1.8);
          lastBayTickBucket = -1;
        }

        const bayProgress = Math.min(1, bayHoldSec / 0.85);
        if (bayRig) {
          if (bayEval.allReady) {
            bayRig.borderMat.color.set('#3EC929');
            bayRig.fillMat.color.set('#3EC929');
            bayRig.fillMat.opacity = 0.25 + bayProgress * 0.45;
          } else if (bayEval.inBay) {
            bayRig.borderMat.color.set('#FFB800');
            bayRig.fillMat.color.set('#FFB800');
            bayRig.fillMat.opacity = 0.28;
          } else {
            bayRig.borderMat.color.set('#F8FAFC');
            bayRig.fillMat.color.set('#1B7FFF');
            bayRig.fillMat.opacity = 0.18;
          }
          bayRig.arrowMeshes.forEach((a, idx) => {
            const pulse = 0.45 + 0.45 * Math.sin(elapsedSec * 5 - idx * 0.9);
            (a.material as THREE.MeshBasicMaterial).opacity = pulse;
          });
        }

        if (bayProgress >= 1 && !runEnded) {
          runEnded = true;
          soundEngine.updateEngine(0, 0, false);
          let stars: 1 | 2 | 3 = 1;
          if (bumpsUsed === 0 && elapsedSec <= lvl.parTimeSec) {
            stars = 3;
          } else if (bumpsUsed <= 1 && elapsedSec <= lvl.parTimeSec * 1.45) {
            stars = 2;
          }
          soundEngine.playLevelWin(stars);
          spawnParticles(
            carState.x,
            1.6,
            carState.z,
            34,
            CONFETTI_COLORS,
            6.5,
            8.2,
            1.2
          );
          callbacksRef.current.onWin({
            elapsedSec,
            bumpsUsed,
            coinsCollected: coinsCollectedCount,
            coinBonusValue: coinsBonusValue,
          });
        }

        // Fixed angled overhead damped camera follow
        const aspect =
          Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
        const camH = aspect < 0.85 ? 25 : 20;
        const camZOff = aspect < 0.85 ? 14.5 : 12.5;

        const shakeX =
          shakeTimer > 0 ? (Math.random() - 0.5) * 0.55 * (shakeTimer / 0.28) : 0;
        const shakeZ =
          shakeTimer > 0 ? (Math.random() - 0.5) * 0.55 * (shakeTimer / 0.28) : 0;

        _camTarget.set(carState.x + shakeX, camH, carState.z + camZOff + shakeZ);
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _camTarget.x,
          7,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _camTarget.y,
          7,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _camTarget.z,
          7,
          dt
        );

        _lookTarget.set(
          camera.position.x - shakeX,
          0.4,
          camera.position.z - camZOff - 1.2 - shakeZ
        );
        camera.lookAt(_lookTarget);

        // Throttled HUD sync
        hudSyncAccum += dt;
        if (hudSyncAccum >= 0.06 || bayProgress >= 1 || col.collided) {
          hudSyncAccum = 0;
          callbacksRef.current.onHudUpdate({
            speedKmh: Math.round(Math.abs(carState.speed) * 4.5),
            bumpsLeft: Math.max(0, lvl.maxBumps - bumpsUsed),
            maxBumps: lvl.maxBumps,
            elapsedSec,
            bayProgress,
            inBay: bayEval.inBay,
            angleAligned: bayEval.angleAligned,
            reverseValid: bayEval.reverseValid,
            coinsCollectedInRun: coinsCollectedCount,
            coinBonusValue: coinsBonusValue,
          });
        }
      } else {
        soundEngine.updateEngine(0, 0, false);
        if (curScreen !== 'playing') {
          // Gentle menu diorama camera sway matching reference framing
          const t = clock.elapsedTime;
          camera.position.x = Math.sin(t * 0.35) * 1.4;
          camera.position.y = 6.8 + Math.sin(t * 0.45) * 0.2;
          camera.position.z = 11.2;
          camera.lookAt(1.6, 1.8, -11);
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      soundEngine.updateEngine(0, 0, false);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored
      );
      disposeGroup(worldGroup);
      disposeGroup(particleGroup);
      particleGeo.dispose();
      hazardTex.dispose();
      stripeTex.dispose();
      pSignTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [controlRef]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#2B96F3] text-white p-6 text-center">
          <div className="arcade-card bg-white text-[#1A212E] rounded-2xl p-6 max-w-sm">
            <h2 className="font-display text-xl font-bold mb-2">
              Graphics Resetting
            </h2>
            <p className="text-sm text-slate-600">
              Your browser paused WebGL rendering. Reloading graphics context...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
