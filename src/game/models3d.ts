/**
 * Enhanced Procedural 3D Composite Models for GestureStrike
 * Scaled up for AAA 45-degree top-down perspective with high visual presence,
 * faceted asteroids, colossal capital boss, and intricate detail parts.
 */

import * as THREE from 'three';

// Shared PBR Materials Library
export const materials3D = {
  hullDark: new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.2,
  }),
  hullPlating: new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.75,
    roughness: 0.28,
  }),
  hullArmor: new THREE.MeshStandardMaterial({
    color: 0x020617,
    metalness: 0.95,
    roughness: 0.15,
  }),
  chrome: new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.98,
    roughness: 0.08,
  }),
  goldTrim: new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.9,
    roughness: 0.18,
  }),
  glowCyan: new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
  }),
  glowRose: new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
  }),
  glowAmber: new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
  }),
  glowPurple: new THREE.MeshBasicMaterial({
    color: 0xc084fc,
  }),
  shieldHolo: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.45,
    wireframe: true,
    roughness: 0.1,
    metalness: 0.1,
  }),
  asteroidRock: new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.85,
    metalness: 0.2,
    flatShading: true,
  }),
  asteroidVein: new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
  }),
};

/**
 * Creates 3D Player Interceptor (Scaled for 45° Top-Down visibility)
 */
export function createPlayerFighterMesh(): THREE.Group {
  const group = new THREE.Group();

  // 1. Central Fuselage
  const bodyGeo = new THREE.ConeGeometry(1.2, 4.2, 5);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, materials3D.hullDark);
  body.castShadow = true;
  group.add(body);

  // 2. Cockpit Canopy Glass
  const canopyGeo = new THREE.SphereGeometry(0.65, 16, 12);
  canopyGeo.scale(0.8, 0.6, 1.8);
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.85,
    transparent: true,
    opacity: 0.9,
  });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 0.4, 0.3);
  group.add(canopy);

  // 3. Swept Delta Wings (Large span for clear top-down silhouette)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(3.6, -1.8);
  wingShape.lineTo(3.3, -2.6);
  wingShape.lineTo(0, -1.4);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06 });
  wingExtrude.rotateX(-Math.PI / 2);
  wingExtrude.center();

  const rightWing = new THREE.Mesh(wingExtrude, materials3D.hullPlating);
  rightWing.position.set(1.8, 0, -0.3);
  rightWing.castShadow = true;
  group.add(rightWing);

  const leftWing = new THREE.Mesh(wingExtrude, materials3D.hullPlating);
  leftWing.scale.set(-1, 1, 1);
  leftWing.position.set(-1.8, 0, -0.3);
  leftWing.castShadow = true;
  group.add(leftWing);

  // 4. Twin Railgun Plasma Cannons
  const cannonGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.8, 8);
  cannonGeo.rotateX(Math.PI / 2);
  const leftCannon = new THREE.Mesh(cannonGeo, materials3D.chrome);
  leftCannon.position.set(-2.2, -0.1, 0.8);
  const rightCannon = new THREE.Mesh(cannonGeo, materials3D.chrome);
  rightCannon.position.set(2.2, -0.1, 0.8);
  group.add(leftCannon);
  group.add(rightCannon);

  // 5. Plasma Muzzle Rings
  const muzzleGeo = new THREE.TorusGeometry(0.2, 0.05, 8, 16);
  const leftMuzzle = new THREE.Mesh(muzzleGeo, materials3D.glowCyan);
  leftMuzzle.position.set(-2.2, -0.1, 2.2);
  const rightMuzzle = new THREE.Mesh(muzzleGeo, materials3D.glowCyan);
  rightMuzzle.position.set(2.2, -0.1, 2.2);
  group.add(leftMuzzle);
  group.add(rightMuzzle);

  // 6. Dual Thrusters & Exhaust Plumes
  const thrusterGeo = new THREE.CylinderGeometry(0.35, 0.22, 0.9, 12);
  thrusterGeo.rotateX(Math.PI / 2);
  const leftThruster = new THREE.Mesh(thrusterGeo, materials3D.hullArmor);
  leftThruster.position.set(-0.7, 0, -2.1);
  const rightThruster = new THREE.Mesh(thrusterGeo, materials3D.hullArmor);
  rightThruster.position.set(0.7, 0, -2.1);
  group.add(leftThruster);
  group.add(rightThruster);

  const plumeGeo = new THREE.ConeGeometry(0.28, 2.0, 8);
  plumeGeo.rotateX(-Math.PI / 2);
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
  const leftPlume = new THREE.Mesh(plumeGeo, plumeMat);
  leftPlume.position.set(-0.7, 0, -3.1);
  const rightPlume = new THREE.Mesh(plumeGeo, plumeMat);
  rightPlume.position.set(0.7, 0, -3.1);
  group.add(leftPlume);
  group.add(rightPlume);

  // 7. Holographic 3D Reticle Torus
  const reticleRingGeo = new THREE.TorusGeometry(2.4, 0.05, 12, 32);
  const reticleRing = new THREE.Mesh(reticleRingGeo, materials3D.glowCyan);
  reticleRing.position.set(0, 0, 4.5);
  reticleRing.name = 'reticleRing';
  group.add(reticleRing);

  // 8. Holographic Energy Shield
  const shieldGeo = new THREE.SphereGeometry(3.8, 24, 18);
  const shield = new THREE.Mesh(shieldGeo, materials3D.shieldHolo);
  shield.name = 'energyShield';
  shield.visible = false;
  group.add(shield);

  return group;
}

/**
 * Creates 3D Scout Drone (Scaled up by ~2.2x for commanding 45° presence)
 */
export function createScoutDroneMesh(): THREE.Group {
  const group = new THREE.Group();
  const scale = 2.4;

  // 1. Aerodynamic Dart Hull
  const hullGeo = new THREE.ConeGeometry(0.7 * scale, 2.4 * scale, 4);
  hullGeo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.2 });
  const hull = new THREE.Mesh(hullGeo, mat);
  hull.castShadow = true;
  group.add(hull);

  // 2. Wide Swept Stealth Wings
  const finGeo = new THREE.BoxGeometry(2.4 * scale, 0.12 * scale, 0.9 * scale);
  const fin = new THREE.Mesh(finGeo, materials3D.hullDark);
  fin.position.set(0, 0, 0.3 * scale);
  group.add(fin);

  // 3. Central Sensor Eye
  const eyeGeo = new THREE.SphereGeometry(0.3 * scale, 12, 12);
  const eye = new THREE.Mesh(eyeGeo, materials3D.glowRose);
  eye.position.set(0, 0.2 * scale, -0.8 * scale);
  group.add(eye);

  // 4. Twin Thrusters & Plumes
  const engGeo = new THREE.CylinderGeometry(0.18 * scale, 0.12 * scale, 0.6 * scale, 8);
  engGeo.rotateX(Math.PI / 2);
  const engL = new THREE.Mesh(engGeo, materials3D.hullArmor);
  engL.position.set(-0.45 * scale, 0, 1.3 * scale);
  const engR = new THREE.Mesh(engGeo, materials3D.hullArmor);
  engR.position.set(0.45 * scale, 0, 1.3 * scale);
  group.add(engL);
  group.add(engR);

  const plumeGeo = new THREE.ConeGeometry(0.15 * scale, 1.1 * scale, 6);
  plumeGeo.rotateX(Math.PI / 2);
  const plume = new THREE.Mesh(plumeGeo, materials3D.glowCyan);
  plume.position.set(0, 0, 1.9 * scale);
  group.add(plume);

  return group;
}

/**
 * Creates 3D Corrupted Core Spiked Mine (Scaled up by ~2.5x)
 */
export function createCorruptedCoreMesh(): THREE.Group {
  const group = new THREE.Group();
  const scale = 2.6;

  // 1. Geodesic Icosahedron Core
  const coreGeo = new THREE.IcosahedronGeometry(0.9 * scale, 0);
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.25 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.castShadow = true;
  group.add(core);

  // 2. Inner Glowing Core
  const innerGeo = new THREE.SphereGeometry(0.55 * scale, 12, 12);
  const inner = new THREE.Mesh(innerGeo, materials3D.glowAmber);
  group.add(inner);

  // 3. Menacing Spikes
  const spikeGeo = new THREE.ConeGeometry(0.2 * scale, 1.6 * scale, 6);
  const dirs = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1],
  ];

  dirs.forEach(([dx, dy, dz]) => {
    const spike = new THREE.Mesh(spikeGeo, materials3D.hullDark);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    spike.position.copy(dir.clone().multiplyScalar(0.9 * scale));
    spike.castShadow = true;
    group.add(spike);
  });

  // 4. Orbiting Hazard Ring
  const ringGeo = new THREE.TorusGeometry(1.6 * scale, 0.05 * scale, 8, 24);
  const ring = new THREE.Mesh(ringGeo, materials3D.glowRose);
  ring.name = 'orbitRing';
  group.add(ring);

  return group;
}

/**
 * Creates 3D Void Striker Heavy Bomber (Scaled up by ~2.6x)
 */
export function createVoidStrikerMesh(): THREE.Group {
  const group = new THREE.Group();
  const scale = 2.6;

  // 1. Angular Heavy Hull
  const hullGeo = new THREE.BoxGeometry(1.3 * scale, 0.7 * scale, 3.0 * scale);
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, metalness: 0.85, roughness: 0.2 });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true;
  group.add(hull);

  // 2. Heavy Swept Wings
  const wingGeo = new THREE.BoxGeometry(4.6 * scale, 0.14 * scale, 1.5 * scale);
  const wing = new THREE.Mesh(wingGeo, materials3D.hullPlating);
  wing.position.set(0, 0.1 * scale, 0.3 * scale);
  group.add(wing);

  // 3. Wingtip Stabilizers
  const finGeo = new THREE.BoxGeometry(0.12 * scale, 0.9 * scale, 1.3 * scale);
  const finL = new THREE.Mesh(finGeo, materials3D.hullArmor);
  finL.position.set(-2.3 * scale, 0.3 * scale, 0.3 * scale);
  const finR = new THREE.Mesh(finGeo, materials3D.hullArmor);
  finR.position.set(2.3 * scale, 0.3 * scale, 0.3 * scale);
  group.add(finL);
  group.add(finR);

  // 4. Twin Underwing Heavy Cannons
  const cannonGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 1.8 * scale, 8);
  cannonGeo.rotateX(Math.PI / 2);
  const cL = new THREE.Mesh(cannonGeo, materials3D.chrome);
  cL.position.set(-1.4 * scale, -0.3 * scale, -0.4 * scale);
  const cR = new THREE.Mesh(cannonGeo, materials3D.chrome);
  cR.position.set(1.4 * scale, -0.3 * scale, -0.4 * scale);
  group.add(cL);
  group.add(cR);

  // 5. Glowing Intake Vents
  const ventGeo = new THREE.BoxGeometry(0.4 * scale, 0.18 * scale, 0.06 * scale);
  const vent = new THREE.Mesh(ventGeo, materials3D.glowPurple);
  vent.position.set(0, 0.15 * scale, -1.52 * scale);
  group.add(vent);

  return group;
}

/**
 * Creates 3D Titan Dreadnought Boss (Colossal flagship, ~2.8x scale)
 */
export function createTitanDreadnoughtMesh(): THREE.Group {
  const group = new THREE.Group();
  const scale = 2.8;

  // 1. Massive Primary Armored Citadel
  const mainHullGeo = new THREE.BoxGeometry(3.6 * scale, 1.5 * scale, 8.0 * scale);
  const mainHullMat = new THREE.MeshStandardMaterial({ color: 0x881337, metalness: 0.9, roughness: 0.15 });
  const mainHull = new THREE.Mesh(mainHullGeo, mainHullMat);
  mainHull.castShadow = true;
  group.add(mainHull);

  // 2. Command Bridge
  const bridgeGeo = new THREE.BoxGeometry(2.2 * scale, 1.1 * scale, 3.4 * scale);
  const bridge = new THREE.Mesh(bridgeGeo, materials3D.hullDark);
  bridge.position.set(0, 1.2 * scale, 0.6 * scale);
  group.add(bridge);

  // 3. Broadside Wing Pylons
  const pylonGeo = new THREE.BoxGeometry(8.2 * scale, 0.45 * scale, 3.0 * scale);
  const pylon = new THREE.Mesh(pylonGeo, materials3D.hullArmor);
  pylon.position.set(0, 0, 1.0 * scale);
  group.add(pylon);

  // 4. Ram Prow
  const prowGeo = new THREE.ConeGeometry(2.0 * scale, 3.4 * scale, 4);
  prowGeo.rotateX(-Math.PI / 2);
  const prow = new THREE.Mesh(prowGeo, mainHullMat);
  prow.position.set(0, 0, -5.2 * scale);
  group.add(prow);

  // 5. Glowing Anti-Matter Reactor Core
  const coreGeo = new THREE.SphereGeometry(1.3 * scale, 16, 16);
  const core = new THREE.Mesh(coreGeo, materials3D.glowAmber);
  core.position.set(0, 0.35 * scale, -1.3 * scale);
  core.name = 'bossCore';
  group.add(core);

  // 6. Quad Heavy Particle Cannon Turrets
  const turretBaseGeo = new THREE.CylinderGeometry(0.45 * scale, 0.45 * scale, 0.35 * scale, 12);
  const barrelGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 2.4 * scale, 8);
  barrelGeo.rotateX(Math.PI / 2);

  const turretPositions = [
    [-3.2 * scale, 0.4 * scale, 0.2 * scale],
    [3.2 * scale, 0.4 * scale, 0.2 * scale],
    [-1.4 * scale, 1.1 * scale, -2.8 * scale],
    [1.4 * scale, 1.1 * scale, -2.8 * scale],
  ];

  turretPositions.forEach(([tx, ty, tz]) => {
    const base = new THREE.Mesh(turretBaseGeo, materials3D.chrome);
    base.position.set(tx, ty, tz);
    const barrel = new THREE.Mesh(barrelGeo, materials3D.chrome);
    barrel.position.set(tx, ty, tz - 0.9 * scale);
    group.add(base);
    group.add(barrel);
  });

  // 7. Rotating Magnetic Shield Torus
  const shieldRingGeo = new THREE.TorusGeometry(5.4 * scale, 0.14 * scale, 12, 32);
  const shieldRing = new THREE.Mesh(shieldRingGeo, materials3D.glowCyan);
  shieldRing.name = 'bossShieldRing';
  group.add(shieldRing);

  return group;
}

/**
 * Creates 3D Space Asteroid Obstacle
 */
export function createAsteroidMesh(size: number = 2.4): THREE.Group {
  const group = new THREE.Group();

  // Low-poly faceted space rock
  const rockGeo = new THREE.DodecahedronGeometry(size, 1);
  // Deform vertices for authentic irregular asteroid profile
  const pos = rockGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const noise = 1 + (Math.sin(vx * 3) + Math.cos(vy * 2) + Math.sin(vz * 4)) * 0.18;
    pos.setXYZ(i, vx * noise, vy * noise, vz * noise);
  }
  rockGeo.computeVertexNormals();

  const rock = new THREE.Mesh(rockGeo, materials3D.asteroidRock);
  rock.castShadow = true;
  group.add(rock);

  // Glowing crystal mineral vein
  const veinGeo = new THREE.IcosahedronGeometry(size * 0.4, 0);
  const vein = new THREE.Mesh(veinGeo, materials3D.asteroidVein);
  vein.position.set(size * 0.4, size * 0.3, size * 0.2);
  group.add(vein);

  return group;
}

/**
 * Creates 3D Powerup Orb
 */
export function createPowerupMesh(type: string): THREE.Group {
  const group = new THREE.Group();

  const crystalGeo = new THREE.OctahedronGeometry(1.1, 0);
  let color = 0x38bdf8;
  if (type === 'RAPID_FIRE') color = 0xf59e0b;
  else if (type === 'NOVA_BOMB') color = 0xf43f5e;
  else if (type === 'REPAIR_HULL') color = 0x10b981;
  else if (type === 'CHRONO_SLOW') color = 0xa855f7;

  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.1,
  });

  const crystal = new THREE.Mesh(crystalGeo, mat);
  crystal.name = 'crystal';
  group.add(crystal);

  const ringGeo = new THREE.TorusGeometry(1.6, 0.06, 8, 24);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color }));
  ring.name = 'ring';
  group.add(ring);

  return group;
}
