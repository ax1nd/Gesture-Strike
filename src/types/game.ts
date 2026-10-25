import type * as THREE from 'three';

export type GameMode = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type GestureType = 'NONE' | 'POINT' | 'PINCH' | 'FINGER_GUN' | 'FIST' | 'OPEN_PALM' | 'PEACE';

export interface SingleHandData {
  aimX: number; // 0..1 mirrored
  aimY: number; // 0..1
  gesture: GestureType;
  pinchDistance: number; // 0..1 normalized
  isPinching: boolean;
  isFist: boolean;
  isOpenPalm: boolean;
  isFingerGun: boolean;
  isPeace: boolean;
  fistCharge: number; // 0..1
  confidence: number;
  handDepth: number; // Estimated 0.2..1.5m
  rollAngle: number; // Hand roll rotation radians
  rawLandmarks?: { x: number; y: number; z: number }[];
}

export interface HandGestureData extends SingleHandData {
  detected: boolean;
  handCount: number;
  secondaryHand?: SingleHandData;
  lightingCondition: 'OPTIMAL' | 'DIM' | 'LOW_LIGHT';
  averageLuma: number; // 0..255
  sensingFps: number;
  isFallbackCV?: boolean;
}

export type EnemyType = 'SCOUT' | 'CORRUPTED_CORE' | 'VOID_STRIKER' | 'STEALTH_PHANTOM' | 'DREADNOUGHT_BOSS';

export interface Enemy3D {
  id: string;
  type: EnemyType;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  rotSpeed: { x: number; y: number; z: number };
  radius: number;
  hp: number;
  maxHp: number;
  scoreValue: number;
  color: string;
  glowColor: string;
  shootCooldown: number;
  shootTimer: number;
  patternTimer: number;
  hitFlashTimer: number;
  shieldHp?: number;
  maxShieldHp?: number;
  meshGroup?: THREE.Group;
}

export interface Obstacle3D {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  rotSpeed: { x: number; y: number; z: number };
  radius: number;
  hp: number;
  maxHp: number;
  meshGroup?: THREE.Group;
}

export interface Bullet3D {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  radius: number;
  color: string;
  damage: number;
  isPlayer: boolean;
  life: number;
  maxLife: number;
  mesh?: THREE.Mesh | THREE.Group;
  penetrating?: boolean;
}

export interface Particle3D {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'SPARK' | 'RING' | 'DEBRIS' | 'SHOCKWAVE' | 'VORTEX';
  scale?: number;
  mesh?: THREE.Object3D;
}

export type PowerupType = 'SPREAD_SHOT' | 'RAPID_FIRE' | 'NOVA_BOMB' | 'REPAIR_HULL' | 'CHRONO_SLOW';

export interface Powerup3D {
  id: string;
  type: PowerupType;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  radius: number;
  life: number;
  pulseTimer: number;
  meshGroup?: THREE.Group;
}

export interface GameStats {
  score: number;
  highScore: number;
  wave: number;
  hull: number;
  maxHull: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  novaBombs: number;
  maxNovaBombs: number;
  enemiesDefeated: number;
  shotsFired: number;
  shotsHit: number;
  powerupsCollected: number;
  activeBuff: PowerupType | null;
  buffTimer: number;
  chronoSlowActive: boolean;
}
