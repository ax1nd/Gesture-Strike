/**
 * Production-Grade 3D WebGL Game Engine for GestureStrike
 * Features 45-degree top-down perspective, 2.5x colossal enemy scales,
 * space asteroid obstacles, AAA cinematic camera pan, and challenging bullet salvos.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Enemy3D,
  Obstacle3D,
  Bullet3D,
  Particle3D,
  Powerup3D,
  GameStats,
  GameMode,
  HandGestureData,
  PowerupType,
} from '../types/game';
import { soundManager } from '../audio/soundManager';
import {
  createPlayerFighterMesh,
  createScoutDroneMesh,
  createCorruptedCoreMesh,
  createVoidStrikerMesh,
  createTitanDreadnoughtMesh,
  createAsteroidMesh,
  createPowerupMesh,
  materials3D,
} from './models3d';

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: GameStats) => void;
  onGameOver: (finalStats: GameStats) => void;
  onVictory: (finalStats: GameStats) => void;
  onWaveStart: (wave: number, title: string) => void;
}

export class GameEngine3D {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private isSoftwareGl: boolean = false;

  private frameId: number = 0;
  private isRunning: boolean = false;
  private lastTime: number = 0;

  // Game Mode
  public mode: GameMode = 'TITLE';

  // Game Stats
  public stats: GameStats = {
    score: 0,
    highScore: 0,
    wave: 1,
    hull: 100,
    maxHull: 100,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    novaBombs: 2,
    maxNovaBombs: 3,
    enemiesDefeated: 0,
    shotsFired: 0,
    shotsHit: 0,
    powerupsCollected: 0,
    activeBuff: null,
    buffTimer: 0,
    chronoSlowActive: false,
  };

  // Player 3D Interceptor State (Operates on the 45-degree arena floor)
  public player = {
    position: new THREE.Vector3(0, 0, 8),
    targetPos: new THREE.Vector3(0, 0, 8),
    rotation: new THREE.Euler(0, 0, 0),
    meshGroup: null as THREE.Group | null,
    reticleRing: null as THREE.Mesh | null,
    shieldMesh: null as THREE.Mesh | null,
    isShieldActive: false,
    recoil: 0,
    roll: 0,
  };

  // 3D Scene Entities
  private enemies: Enemy3D[] = [];
  private obstacles: Obstacle3D[] = [];
  private bullets: Bullet3D[] = [];
  private particles: Particle3D[] = [];
  private powerups: Powerup3D[] = [];

  // Background 3D Elements
  private starfield: THREE.Points | null = null;
  private starGeo: THREE.BufferGeometry | null = null;
  private arenaFloorGrid: THREE.GridHelper | null = null;

  // Wave Director & Obstacle Spawner
  private waveState: 'INTERMISSION' | 'ACTIVE' | 'BOSS' = 'INTERMISSION';
  private waveEnemiesToSpawn: number = 0;
  private waveSpawnTimer: number = 0;
  private obstacleSpawnTimer: number = 2.0;
  private bossSpawned: boolean = false;

  // Camera Setup: 45-Degree Angle from Top
  // deltaY = 32, deltaZ = 32 -> arctan(32/32) = 45 degrees exactly!
  private baseCameraPos = new THREE.Vector3(0, 32, 24);
  private cameraLookTarget = new THREE.Vector3(0, 0, -8);
  private titleOrbitAngle: number = 0;
  private trauma: number = 0;
  private hitstopRemaining: number = 0;

  // Input & Shooting State
  private shootCooldown: number = 0;
  private wasPinchingLastFrame: boolean = false;
  private lastGestureData: HandGestureData | null = null;
  private callbacks: GameEngineCallbacks | null = null;
  private lastStatsReportTime: number = 0;

  constructor() {
    const saved = localStorage.getItem('gesture_strike_highscore');
    if (saved) {
      this.stats.highScore = parseInt(saved, 10) || 0;
    }
  }

  public init(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js WebGLRenderer
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Initialize Scene & 45-degree Perspective Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);
    this.scene.fog = new THREE.FogExp2(0x020617, 0.009);

    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 1000);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(this.cameraLookTarget);

    // 4. Procedural Studio Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Studio Lighting Rig
    this.setupLighting();

    // 6. Build Starfield & Minimalist Arena Floor Grid
    this.setupStarfield();
    this.setupArenaGrid();

    // 7. Assemble Player Interceptor Ship
    this.player.meshGroup = createPlayerFighterMesh();
    this.player.meshGroup.position.copy(this.player.position);
    this.player.reticleRing = this.player.meshGroup.getObjectByName('reticleRing') as THREE.Mesh;
    this.player.shieldMesh = this.player.meshGroup.getObjectByName('energyShield') as THREE.Mesh;
    this.scene.add(this.player.meshGroup);

    // Start 60fps Loop
    this.startLoop();
  }

  private setupLighting() {
    if (!this.scene) return;

    // Key Directional Light (Warm Specular)
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.0);
    keyLight.position.set(15, 35, 20);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 120;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // Cool Cyber Fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 0.85);
    this.scene.add(hemiLight);

    // Sharp Cyber Blue Rim
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.8);
    rimLight.position.set(-20, 10, -30);
    this.scene.add(rimLight);
  }

  private setupStarfield() {
    if (!this.scene) return;
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 220;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 2] = -Math.random() * 300;

      const r = Math.random();
      if (r > 0.8) {
        colors[i * 3] = 0.22;
        colors[i * 3 + 1] = 0.74;
        colors[i * 3 + 2] = 0.97;
      } else if (r > 0.6) {
        colors[i * 3] = 0.96;
        colors[i * 3 + 1] = 0.25;
        colors[i * 3 + 2] = 0.37;
      } else {
        colors[i * 3] = 0.85;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.95;
      }
    }

    this.starGeo = new THREE.BufferGeometry();
    this.starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.starfield = new THREE.Points(this.starGeo, starMat);
    this.scene.add(this.starfield);
  }

  private setupArenaGrid() {
    if (!this.scene) return;
    // Sleek dark floor grid without congested ceiling cages
    this.arenaFloorGrid = new THREE.GridHelper(300, 60, 0x06b6d4, 0x0f172a);
    this.arenaFloorGrid.position.set(0, -2, -30);
    this.scene.add(this.arenaFloorGrid);
  }

  public resize() {
    if (!this.renderer || !this.camera) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public startGame() {
    this.mode = 'PLAYING';
    this.stats.score = 0;
    this.stats.hull = this.stats.maxHull;
    this.stats.wave = 1;
    this.stats.combo = 0;
    this.stats.maxCombo = 0;
    this.stats.novaBombs = 2;
    this.stats.enemiesDefeated = 0;
    this.stats.shotsFired = 0;
    this.stats.shotsHit = 0;
    this.stats.powerupsCollected = 0;
    this.stats.activeBuff = null;
    this.stats.buffTimer = 0;
    this.stats.chronoSlowActive = false;

    // Reset camera to standard 45-degree angle
    if (this.camera) {
      this.camera.position.copy(this.baseCameraPos);
      this.camera.lookAt(this.cameraLookTarget);
    }

    this.clearAllEntities();
    this.startWave(1);
  }

  public pauseGame() {
    if (this.mode === 'PLAYING') {
      this.mode = 'PAUSED';
    }
  }

  public resumeGame() {
    if (this.mode === 'PAUSED') {
      this.mode = 'PLAYING';
      this.lastTime = performance.now();
    }
  }

  /**
   * 45-Degree Top-Down Mouse Aim Mapping
   */
  public setMouseAim(clientX: number, clientY: number) {
    const nx = (clientX / window.innerWidth) * 2 - 1;
    const ny = -(clientY / window.innerHeight) * 2 + 1;

    // Horizontal aim: X spans -18 to +18
    this.player.targetPos.x = nx * 18;
    // Vertical screen drag moves along Z axis (-2 to +14) on the 45° ground plane
    this.player.targetPos.z = 6 - ny * 8;
  }

  public triggerMouseShoot() {
    if (this.mode !== 'PLAYING') return;
    this.fireWeapon();
  }

  public triggerNovaBomb() {
    if (this.mode !== 'PLAYING' || this.stats.novaBombs <= 0) return;
    this.stats.novaBombs--;
    this.addTrauma(0.85);
    this.hitstopRemaining = 0.08;
    soundManager.playNovaBomb();

    this.spawnShockwave(this.player.position.x, this.player.position.y, this.player.position.z);

    // Damage all enemies
    this.enemies.forEach((enemy) => {
      enemy.hp -= 300;
      enemy.hitFlashTimer = 0.25;
      this.spawnExplosion(enemy.position.x, enemy.position.y, enemy.position.z, 0xf43f5e, 35);
    });

    // Destroy all nearby obstacles
    this.obstacles.forEach((obs) => {
      obs.hp -= 200;
      this.spawnExplosion(obs.position.x, obs.position.y, obs.position.z, 0x475569, 20);
    });

    // Wipe enemy bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (!this.bullets[i].isPlayer) {
        if (this.bullets[i].mesh && this.scene) this.scene.remove(this.bullets[i].mesh!);
        this.bullets.splice(i, 1);
      }
    }

    this.reportStats(true);
  }

  /**
   * Updates real-time gesture input from vision detector
   */
  public updateGesture(data: HandGestureData) {
    this.lastGestureData = data;

    if (!data.detected) {
      this.player.isShieldActive = false;
      if (this.player.shieldMesh) this.player.shieldMesh.visible = false;
      this.wasPinchingLastFrame = false;
      return;
    }

    // Map hand coordinates into 45-degree top-down space:
    // X spans -18 to +18
    const targetX = (data.aimX - 0.5) * 36;
    // Aim Y drives forward/backward positioning on the combat plane (Z: -2 to +14)
    const targetZ = 6 + (data.aimY - 0.5) * 16;

    this.player.targetPos.set(targetX, 0, targetZ);
    this.player.roll = -data.rollAngle;

    // Open Palm triggers 3D Holographic Energy Shield
    this.player.isShieldActive = data.isOpenPalm;
    if (this.player.shieldMesh) {
      this.player.shieldMesh.visible = data.isOpenPalm;
    }

    // Clenched fist triggers Nova Bomb
    if (data.fistCharge >= 1.0 && this.stats.novaBombs > 0) {
      this.triggerNovaBomb();
    }

    // Pinch or Finger Gun triggers Weapon
    const isTriggering = data.isPinching || (data.isFingerGun && data.pinchDistance < 0.38);

    if (isTriggering) {
      if (!this.wasPinchingLastFrame) {
        soundManager.playPinchChirp();
        this.fireWeapon();
      } else {
        const canRapid = this.stats.activeBuff === 'RAPID_FIRE' || this.shootCooldown <= 0;
        if (canRapid && this.shootCooldown <= 0) {
          this.fireWeapon();
        }
      }
    }

    this.wasPinchingLastFrame = isTriggering;
  }

  private fireWeapon() {
    if (this.shootCooldown > 0 || !this.scene) return;

    this.stats.shotsFired++;
    this.player.recoil = 0.8;
    this.addTrauma(0.12);

    const isRapid = this.stats.activeBuff === 'RAPID_FIRE';
    const isSpread = this.stats.activeBuff === 'SPREAD_SHOT';
    this.shootCooldown = isRapid ? 0.08 : isSpread ? 0.22 : 0.16;

    // Large glowing laser cylinder
    const laserGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8);
    laserGeo.rotateX(Math.PI / 2);

    if (isSpread) {
      soundManager.playShoot('SPREAD');
      const angles = [-0.18, 0, 0.18];
      angles.forEach((ang) => {
        const mesh = new THREE.Mesh(laserGeo, materials3D.glowCyan);
        mesh.position.copy(this.player.position);
        mesh.rotation.y = ang;
        this.scene?.add(mesh);

        const speed = 140;
        this.bullets.push({
          id: Math.random().toString(),
          position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
          velocity: { x: Math.sin(ang) * speed, y: 0, z: -Math.cos(ang) * speed },
          radius: 1.2,
          color: '#38bdf8',
          damage: 42,
          isPlayer: true,
          life: 0,
          maxLife: 2.0,
          mesh,
        });
      });
    } else if (isRapid) {
      soundManager.playShoot('RAPID');
      const mesh = new THREE.Mesh(laserGeo, materials3D.glowAmber);
      mesh.position.copy(this.player.position);
      this.scene?.add(mesh);

      this.bullets.push({
        id: Math.random().toString(),
        position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
        velocity: { x: (Math.random() - 0.5) * 5, y: 0, z: -160 },
        radius: 0.9,
        color: '#f59e0b',
        damage: 32,
        isPlayer: true,
        life: 0,
        maxLife: 1.8,
        mesh,
      });
    } else {
      soundManager.playShoot('NORMAL');
      const mesh = new THREE.Mesh(laserGeo, materials3D.glowCyan);
      mesh.position.copy(this.player.position);
      this.scene?.add(mesh);

      this.bullets.push({
        id: Math.random().toString(),
        position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
        velocity: { x: 0, y: 0, z: -150 },
        radius: 1.0,
        color: '#06b6d4',
        damage: 55,
        isPlayer: true,
        life: 0,
        maxLife: 2.0,
        mesh,
      });
    }
  }

  public addTrauma(amount: number) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  private startWave(waveNum: number) {
    this.stats.wave = waveNum;
    this.waveState = 'ACTIVE';
    this.bossSpawned = false;

    let waveName = `SECTOR ${waveNum}: RECON WING`;
    if (waveNum === 2) waveName = 'SECTOR 2: CORRUPTED CORE SWARM';
    if (waveNum === 3) waveName = 'SECTOR 3: HEAVY VOID BOMBERS';
    if (waveNum === 4) waveName = 'SECTOR 4: ASTEROID CROSSFIRE';
    if (waveNum === 5) waveName = 'SECTOR 5: TITAN DREADNOUGHT';
    if (waveNum > 5) waveName = `SECTOR ${waveNum}: APOCALYPSE FLEET`;

    this.callbacks?.onWaveStart(waveNum, waveName);

    // Number of enemies scales smoothly
    this.waveEnemiesToSpawn = 7 + waveNum * 4;
    this.waveSpawnTimer = 0.5;

    if (waveNum % 5 === 0) {
      this.waveState = 'BOSS';
      soundManager.playWarning();
    }
  }

  private spawnAsteroid() {
    if (!this.scene) return;
    const x = (Math.random() - 0.5) * 32;
    const z = -90;
    const size = Math.random() * 1.5 + 2.2;
    const meshGroup = createAsteroidMesh(size);
    meshGroup.position.set(x, 0, z);
    this.scene.add(meshGroup);

    this.obstacles.push({
      id: Math.random().toString(),
      position: { x, y: 0, z },
      velocity: { x: (Math.random() - 0.5) * 4, y: 0, z: 18 + this.stats.wave * 1.5 },
      rotation: { x: 0, y: 0, z: 0 },
      rotSpeed: {
        x: (Math.random() - 0.5) * 1.8,
        y: (Math.random() - 0.5) * 1.8,
        z: (Math.random() - 0.5) * 1.8,
      },
      radius: size * 1.2,
      hp: 120 + this.stats.wave * 25,
      maxHp: 120 + this.stats.wave * 25,
      meshGroup,
    });
  }

  private spawnEnemy3D() {
    if (this.waveEnemiesToSpawn <= 0 || !this.scene) return;
    this.waveEnemiesToSpawn--;

    const wave = this.stats.wave;
    const x = (Math.random() - 0.5) * 28;
    const z = -95;

    const roll = Math.random();
    let type: Enemy3D['type'] = 'SCOUT';
    let hp = 70 + wave * 18;
    let radius = 2.8;
    let score = 200;
    let meshGroup = createScoutDroneMesh();

    if (wave >= 2 && roll > 0.6) {
      type = 'CORRUPTED_CORE';
      hp = 110 + wave * 22;
      radius = 3.4;
      score = 350;
      meshGroup = createCorruptedCoreMesh();
    } else if (wave >= 3 && roll > 0.8) {
      type = 'VOID_STRIKER';
      hp = 180 + wave * 30;
      radius = 4.8;
      score = 600;
      meshGroup = createVoidStrikerMesh();
    }

    meshGroup.position.set(x, 0, z);
    this.scene.add(meshGroup);

    this.enemies.push({
      id: Math.random().toString(),
      type,
      position: { x, y: 0, z },
      velocity: { x: (Math.random() - 0.5) * 8, y: 0, z: 24 + wave * 2 },
      rotation: { x: 0, y: 0, z: 0 },
      rotSpeed: { x: 0, y: 0, z: 0 },
      radius,
      hp,
      maxHp: hp,
      scoreValue: score,
      color: '#38bdf8',
      glowColor: '#38bdf8',
      shootCooldown: Math.max(0.9, 2.2 - wave * 0.15),
      shootTimer: Math.random() * 1.2,
      patternTimer: Math.random() * 10,
      hitFlashTimer: 0,
      meshGroup,
    });
  }

  private spawnBoss3D() {
    if (!this.scene) return;
    this.bossSpawned = true;
    const hp = 1500 + this.stats.wave * 450;

    const meshGroup = createTitanDreadnoughtMesh();
    meshGroup.position.set(0, 0, -85);
    this.scene.add(meshGroup);

    this.enemies.push({
      id: 'titan_boss_' + this.stats.wave,
      type: 'DREADNOUGHT_BOSS',
      position: { x: 0, y: 0, z: -85 },
      velocity: { x: 5, y: 0, z: 12 },
      rotation: { x: 0, y: 0, z: 0 },
      rotSpeed: { x: 0, y: 0, z: 0 },
      radius: 9.5,
      hp,
      maxHp: hp,
      scoreValue: 8000,
      color: '#f43f5e',
      glowColor: '#fb7185',
      shootCooldown: 0.95,
      shootTimer: 0.5,
      patternTimer: 0,
      hitFlashTimer: 0,
      shieldHp: 500,
      maxShieldHp: 500,
      meshGroup,
    });
  }

  private spawnExplosion(x: number, y: number, z: number, colorHex: number, count: number = 22) {
    if (!this.scene) return;

    const sparkGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const sparkMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = Math.random() * 32 + 10;

      this.particles.push({
        position: { x, y, z },
        velocity: {
          x: Math.sin(phi) * Math.cos(theta) * speed,
          y: Math.sin(phi) * Math.sin(theta) * speed * 0.4, // Flatter explosion on 45° floor
          z: Math.cos(phi) * speed,
        },
        size: 0.25,
        color: '#' + colorHex.toString(16),
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 0.45 + 0.35,
        type: 'SPARK',
        mesh,
      });
    }
  }

  private spawnShockwave(x: number, y: number, z: number) {
    if (!this.scene) return;
    const ringGeo = new THREE.TorusGeometry(2.0, 0.25, 12, 32);
    ringGeo.rotateX(Math.PI / 2); // Lay flat on floor
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.particles.push({
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: 0 },
      size: 2.0,
      color: '#38bdf8',
      alpha: 1,
      life: 0,
      maxLife: 0.85,
      type: 'SHOCKWAVE',
      mesh,
    });
  }

  private dropPowerup3D(x: number, y: number, z: number) {
    if (Math.random() > 0.45 || !this.scene) return;

    const types: PowerupType[] = ['SPREAD_SHOT', 'RAPID_FIRE', 'NOVA_BOMB', 'REPAIR_HULL', 'CHRONO_SLOW'];
    const selected = types[Math.floor(Math.random() * types.length)];

    const meshGroup = createPowerupMesh(selected);
    meshGroup.position.set(x, 0, z);
    this.scene.add(meshGroup);

    this.powerups.push({
      id: Math.random().toString(),
      type: selected,
      position: { x, y: 0, z },
      velocity: { x: (Math.random() - 0.5) * 3, y: 0, z: 12 },
      radius: 2.0,
      life: 0,
      pulseTimer: 0,
      meshGroup,
    });
  }

  private clearAllEntities() {
    if (!this.scene) return;

    this.enemies.forEach((e) => {
      if (e.meshGroup) this.scene?.remove(e.meshGroup);
    });
    this.enemies = [];

    this.obstacles.forEach((o) => {
      if (o.meshGroup) this.scene?.remove(o.meshGroup);
    });
    this.obstacles = [];

    this.bullets.forEach((b) => {
      if (b.mesh) this.scene?.remove(b.mesh);
    });
    this.bullets = [];

    this.particles.forEach((p) => {
      if (p.mesh) this.scene?.remove(p.mesh);
    });
    this.particles = [];

    this.powerups.forEach((pw) => {
      if (pw.meshGroup) this.scene?.remove(pw.meshGroup);
    });
    this.powerups = [];
  }

  private startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const afterDraw = (cb: () => void) => {
      if (!this.renderer) return;
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (!this.isRunning) return;

      const currentTime = performance.now();
      const rawDt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      const dt = Math.min(rawDt, 0.05);

      if (this.mode === 'PLAYING') {
        if (this.hitstopRemaining > 0) {
          this.hitstopRemaining -= dt;
        } else {
          this.update3D(dt);
        }
      } else if (this.mode === 'TITLE') {
        this.updateTitleAtmosphere(dt);
      } else {
        this.updateBackground3D(dt);
      }

      this.render3D();

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  public stopLoop() {
    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    }
  }

  /**
   * AAA Title Screen 3D Cinematic Atmosphere
   */
  private updateTitleAtmosphere(dt: number) {
    this.titleOrbitAngle += dt * 0.35;
    this.updateBackground3D(dt * 0.4);

    // Gently glide the 3D camera in an elevated orbit
    if (this.camera) {
      const radius = 34;
      this.camera.position.x = Math.sin(this.titleOrbitAngle) * (radius * 0.4);
      this.camera.position.y = 30 + Math.sin(this.titleOrbitAngle * 0.5) * 3;
      this.camera.position.z = 24 + Math.cos(this.titleOrbitAngle) * 5;
      this.camera.lookAt(0, 0, -4);
    }

    if (this.player.meshGroup) {
      this.player.meshGroup.position.set(0, Math.sin(this.titleOrbitAngle * 1.5) * 0.5, 4);
      this.player.meshGroup.rotation.y = Math.sin(this.titleOrbitAngle * 0.8) * 0.3;
      this.player.meshGroup.rotation.z = Math.cos(this.titleOrbitAngle * 0.8) * 0.15;
    }
  }

  /**
   * Main 60fps 3D Simulation
   */
  private update3D(dt: number) {
    const timeScale = this.stats.chronoSlowActive ? 0.35 : 1.0;
    const simDt = dt * timeScale;

    // Smooth Player Damping toward target
    const lerpRate = 16;
    this.player.position.x += (this.player.targetPos.x - this.player.position.x) * Math.min(1, dt * lerpRate);
    this.player.position.z += (this.player.targetPos.z - this.player.position.z) * Math.min(1, dt * lerpRate);

    // Apply Bank Roll and Recoil
    this.player.recoil = Math.max(0, this.player.recoil - dt * 4.0);
    if (this.player.meshGroup) {
      this.player.meshGroup.position.set(
        this.player.position.x,
        0,
        this.player.position.z + this.player.recoil
      );
      this.player.meshGroup.rotation.z =
        this.player.roll + (this.player.targetPos.x - this.player.position.x) * -0.05;
      this.player.meshGroup.rotation.x =
        (this.player.targetPos.z - this.player.position.z) * -0.04;

      if (this.player.isShieldActive && this.player.shieldMesh) {
        this.player.shieldMesh.rotation.y += dt * 3.5;
      }
    }

    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    // Buff Timer
    if (this.stats.buffTimer > 0) {
      this.stats.buffTimer -= dt;
      if (this.stats.buffTimer <= 0) {
        this.stats.activeBuff = null;
        this.stats.chronoSlowActive = false;
      }
    }

    // Combo Timer Decay
    if (this.stats.combo > 0) {
      this.stats.comboTimer -= dt;
      if (this.stats.comboTimer <= 0) {
        this.stats.combo = 0;
        this.reportStats();
      }
    }

    // Camera Trauma Shake
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 2.0);
      const shakeMag = this.trauma * this.trauma * 0.8;
      if (this.camera) {
        this.camera.position.x = this.baseCameraPos.x + (Math.random() - 0.5) * shakeMag;
        this.camera.position.y = this.baseCameraPos.y + (Math.random() - 0.5) * shakeMag;
        this.camera.lookAt(this.cameraLookTarget);
      }
    } else if (this.camera) {
      this.camera.position.copy(this.baseCameraPos);
      this.camera.lookAt(this.cameraLookTarget);
    }

    // Starfield & Ground Flow
    this.updateBackground3D(dt);

    // Update 3D Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life += dt;
      b.position.x += b.velocity.x * dt;
      b.position.z += b.velocity.z * dt;

      if (b.mesh) {
        b.mesh.position.set(b.position.x, 0, b.position.z);
      }

      if (b.life >= b.maxLife || b.position.z < -130 || b.position.z > 30) {
        if (b.mesh && this.scene) this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
        continue;
      }

      // Player Bullets vs Asteroid Obstacles
      if (b.isPlayer) {
        for (let k = this.obstacles.length - 1; k >= 0; k--) {
          const obs = this.obstacles[k];
          const dist = Math.hypot(b.position.x - obs.position.x, b.position.z - obs.position.z);
          if (dist < b.radius + obs.radius) {
            obs.hp -= b.damage;
            this.spawnExplosion(b.position.x, 0, b.position.z, 0x06b6d4, 8);
            if (!b.penetrating) {
              if (b.mesh && this.scene) this.scene.remove(b.mesh);
              this.bullets.splice(i, 1);
            }
            if (obs.hp <= 0) {
              this.handleObstacleDestroyed(obs, k);
            }
            break;
          }
        }
      }

      // Player Bullets vs Enemies
      if (b.isPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dist = Math.hypot(
            b.position.x - enemy.position.x,
            b.position.z - enemy.position.z
          );

          if (dist < b.radius + enemy.radius) {
            this.stats.shotsHit++;
            enemy.hitFlashTimer = 0.12;
            this.addTrauma(0.08);

            if (enemy.shieldHp && enemy.shieldHp > 0) {
              enemy.shieldHp -= b.damage;
              soundManager.playShieldDeflect();
              this.spawnExplosion(b.position.x, 0, b.position.z, 0x38bdf8, 10);
            } else {
              enemy.hp -= b.damage;
              soundManager.playExplosion('SMALL');
              this.spawnExplosion(b.position.x, 0, b.position.z, 0xf43f5e, 14);
            }

            if (!b.penetrating) {
              if (b.mesh && this.scene) this.scene.remove(b.mesh);
              this.bullets.splice(i, 1);
            }

            if (enemy.hp <= 0) {
              this.handleEnemyDefeated(enemy, j);
            }
            break;
          }
        }
      } else {
        // Enemy Bullets vs Player
        const distToPlayer = Math.hypot(
          b.position.x - this.player.position.x,
          b.position.z - this.player.position.z
        );

        // Shield Deflection
        if (this.player.isShieldActive && distToPlayer < 4.2) {
          soundManager.playShieldDeflect();
          this.addTrauma(0.08);
          b.isPlayer = true;
          b.velocity.z = -Math.abs(b.velocity.z) * 1.5;
          b.velocity.x = (b.position.x - this.player.position.x) * 4;
          b.damage = 75;
          if (b.mesh) (b.mesh as THREE.Mesh).material = materials3D.glowCyan;
          continue;
        }

        // Damage Player Hull
        if (distToPlayer < 2.0) {
          this.stats.hull = Math.max(0, this.stats.hull - b.damage);
          soundManager.playPlayerHit();
          this.addTrauma(0.45);
          this.hitstopRemaining = 0.05;

          if (b.mesh && this.scene) this.scene.remove(b.mesh);
          this.bullets.splice(i, 1);
          this.reportStats(true);

          if (this.stats.hull <= 0) {
            this.handleGameOver();
            return;
          }
          continue;
        }
      }
    }

    // Update Obstacles (Asteroids)
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.position.z += obs.velocity.z * simDt;
      obs.position.x += obs.velocity.x * simDt;
      obs.rotation.x += obs.rotSpeed.x * simDt;
      obs.rotation.y += obs.rotSpeed.y * simDt;

      if (obs.meshGroup) {
        obs.meshGroup.position.set(obs.position.x, 0, obs.position.z);
        obs.meshGroup.rotation.set(obs.rotation.x, obs.rotation.y, obs.rotation.z);
      }

      // Check collision with player
      const distToPlayer = Math.hypot(
        obs.position.x - this.player.position.x,
        obs.position.z - this.player.position.z
      );

      if (distToPlayer < obs.radius + 1.8) {
        this.stats.hull = Math.max(0, this.stats.hull - 25);
        soundManager.playPlayerHit();
        this.addTrauma(0.5);
        this.handleObstacleDestroyed(obs, i);
        if (this.stats.hull <= 0) {
          this.handleGameOver();
          return;
        }
        continue;
      }

      if (obs.position.z > 25) {
        if (obs.meshGroup && this.scene) this.scene.remove(obs.meshGroup);
        this.obstacles.splice(i, 1);
      }
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.patternTimer += simDt;

      if (enemy.type === 'SCOUT') {
        enemy.position.z += enemy.velocity.z * simDt;
        enemy.position.x += Math.sin(enemy.patternTimer * 3.2) * 12 * simDt;
      } else if (enemy.type === 'CORRUPTED_CORE') {
        enemy.position.z += enemy.velocity.z * simDt;
        enemy.rotation.y += simDt * 1.5;
      } else if (enemy.type === 'VOID_STRIKER') {
        if (enemy.position.z < -20) {
          enemy.position.z += enemy.velocity.z * simDt;
        } else {
          enemy.position.x += Math.cos(enemy.patternTimer * 2.2) * 14 * simDt;
        }
      } else if (enemy.type === 'DREADNOUGHT_BOSS') {
        if (enemy.position.z < -24) {
          enemy.position.z += enemy.velocity.z * simDt;
        } else {
          enemy.position.x += enemy.velocity.x * simDt;
          if (enemy.position.x > 14) enemy.velocity.x = -Math.abs(enemy.velocity.x);
          else if (enemy.position.x < -14) enemy.velocity.x = Math.abs(enemy.velocity.x);

          const ring = enemy.meshGroup?.getObjectByName('bossShieldRing');
          if (ring) ring.rotation.z += dt * 2.5;
        }
      }

      if (enemy.meshGroup) {
        enemy.meshGroup.position.set(enemy.position.x, 0, enemy.position.z);
        enemy.meshGroup.rotation.set(enemy.rotation.x, enemy.rotation.y, enemy.rotation.z);
      }

      // Shoot Attacks
      enemy.shootTimer += simDt;
      if (enemy.shootTimer >= enemy.shootCooldown && enemy.position.z < -2) {
        enemy.shootTimer = 0;
        this.enemyShoot3D(enemy);
      }

      if (enemy.position.z > 25) {
        if (enemy.meshGroup && this.scene) this.scene.remove(enemy.meshGroup);
        this.enemies.splice(i, 1);
      }
    }

    // Spawning Director
    if (this.waveState === 'ACTIVE') {
      this.waveSpawnTimer -= dt;
      if (this.waveSpawnTimer <= 0) {
        if (this.waveEnemiesToSpawn > 0) {
          this.spawnEnemy3D();
          this.waveSpawnTimer = Math.max(0.6, 1.8 - this.stats.wave * 0.15);
        } else if (this.enemies.length === 0) {
          this.waveComplete();
        }
      }

      // Obstacle Asteroid Spawner
      this.obstacleSpawnTimer -= dt;
      if (this.obstacleSpawnTimer <= 0) {
        this.spawnAsteroid();
        this.obstacleSpawnTimer = Math.random() * 3.0 + 2.5;
      }
    } else if (this.waveState === 'BOSS') {
      if (!this.bossSpawned) {
        this.spawnBoss3D();
      } else if (this.enemies.length === 0) {
        this.waveComplete();
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        if (p.mesh && this.scene) this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.alpha = 1 - p.life / p.maxLife;

      if (p.type === 'SHOCKWAVE' && p.mesh) {
        const scale = 1 + (p.life / p.maxLife) * 20;
        p.mesh.scale.set(scale, scale, scale);
        const mat = (p.mesh as THREE.Mesh).material;
        if (mat && !Array.isArray(mat)) (mat as THREE.Material).opacity = p.alpha;
      } else {
        p.position.x += p.velocity.x * dt;
        p.position.z += p.velocity.z * dt;
        if (p.mesh) {
          p.mesh.position.set(p.position.x, 0, p.position.z);
          const mat = (p.mesh as THREE.Mesh).material;
          if (mat && !Array.isArray(mat)) (mat as THREE.Material).opacity = p.alpha;
        }
      }
    }

    // Update Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pw = this.powerups[i];
      pw.position.z += pw.velocity.z * dt;
      pw.pulseTimer += dt * 3.5;

      if (pw.meshGroup) {
        pw.meshGroup.position.set(pw.position.x, 0, pw.position.z);
        pw.meshGroup.rotation.y += dt * 2.5;
      }

      const dist = Math.hypot(
        pw.position.x - this.player.position.x,
        pw.position.z - this.player.position.z
      );

      if (dist < 3.2) {
        this.collectPowerup(pw);
        if (pw.meshGroup && this.scene) this.scene.remove(pw.meshGroup);
        this.powerups.splice(i, 1);
        continue;
      }

      if (pw.position.z > 25) {
        if (pw.meshGroup && this.scene) this.scene.remove(pw.meshGroup);
        this.powerups.splice(i, 1);
      }
    }

    const now = performance.now();
    if (now - this.lastStatsReportTime > 120) {
      this.lastStatsReportTime = now;
      this.reportStats();
    }
  }

  /**
   * Challenging Enemy Bullet Barrages
   */
  private enemyShoot3D(enemy: Enemy3D) {
    if (!this.scene) return;
    const speed = this.stats.chronoSlowActive ? 28 : 55;

    const laserGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.0, 6);
    laserGeo.rotateX(Math.PI / 2);

    if (enemy.type === 'SCOUT') {
      // Twin rapid lasers
      [-0.8, 0.8].forEach((offset) => {
        const mesh = new THREE.Mesh(laserGeo, materials3D.glowRose);
        mesh.position.set(enemy.position.x + offset, 0, enemy.position.z);
        this.scene?.add(mesh);

        this.bullets.push({
          id: Math.random().toString(),
          position: { x: enemy.position.x + offset, y: 0, z: enemy.position.z },
          velocity: { x: 0, y: 0, z: speed },
          radius: 0.9,
          color: '#f43f5e',
          damage: 15,
          isPlayer: false,
          life: 0,
          maxLife: 4,
          mesh,
        });
      });
    } else if (enemy.type === 'CORRUPTED_CORE') {
      // 5-way spiraling spread
      [-0.32, -0.16, 0, 0.16, 0.32].forEach((ang) => {
        const mesh = new THREE.Mesh(laserGeo, materials3D.glowAmber);
        mesh.position.set(enemy.position.x, 0, enemy.position.z);
        mesh.rotation.y = ang;
        this.scene?.add(mesh);

        this.bullets.push({
          id: Math.random().toString(),
          position: { x: enemy.position.x, y: 0, z: enemy.position.z },
          velocity: { x: Math.sin(ang) * speed, y: 0, z: Math.cos(ang) * speed },
          radius: 1.0,
          color: '#fb923c',
          damage: 18,
          isPlayer: false,
          life: 0,
          maxLife: 4,
          mesh,
        });
      });
    } else if (enemy.type === 'VOID_STRIKER') {
      // Aimed sniper shot toward player
      const dx = this.player.position.x - enemy.position.x;
      const dz = this.player.position.z - enemy.position.z;
      const angle = Math.atan2(dx, dz);

      const mesh = new THREE.Mesh(laserGeo, materials3D.glowPurple);
      mesh.position.set(enemy.position.x, 0, enemy.position.z);
      mesh.rotation.y = angle;
      this.scene?.add(mesh);

      this.bullets.push({
        id: Math.random().toString(),
        position: { x: enemy.position.x, y: 0, z: enemy.position.z },
        velocity: { x: Math.sin(angle) * (speed * 1.3), y: 0, z: Math.cos(angle) * (speed * 1.3) },
        radius: 1.2,
        color: '#c084fc',
        damage: 28,
        isPlayer: false,
        life: 0,
        maxLife: 5,
        mesh,
      });
    } else if (enemy.type === 'DREADNOUGHT_BOSS') {
      // Sweeping 7-way curtain of death
      [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45].forEach((ang) => {
        const mesh = new THREE.Mesh(laserGeo, materials3D.glowRose);
        mesh.position.set(enemy.position.x, 0, enemy.position.z);
        mesh.rotation.y = ang;
        this.scene?.add(mesh);

        this.bullets.push({
          id: Math.random().toString(),
          position: { x: enemy.position.x, y: 0, z: enemy.position.z },
          velocity: { x: Math.sin(ang) * speed, y: 0, z: Math.cos(ang) * speed },
          radius: 1.2,
          color: '#f43f5e',
          damage: 26,
          isPlayer: false,
          life: 0,
          maxLife: 5,
          mesh,
        });
      });
    }
  }

  private handleObstacleDestroyed(obs: Obstacle3D, index: number) {
    if (obs.meshGroup && this.scene) {
      this.scene.remove(obs.meshGroup);
    }
    this.obstacles.splice(index, 1);
    soundManager.playExplosion('MEDIUM');
    this.spawnExplosion(obs.position.x, 0, obs.position.z, 0x64748b, 30);
    this.stats.score += 250;
    this.dropPowerup3D(obs.position.x, 0, obs.position.z);
    this.reportStats(true);
  }

  private handleEnemyDefeated(enemy: Enemy3D, index: number) {
    if (enemy.meshGroup && this.scene) {
      this.scene.remove(enemy.meshGroup);
    }
    this.enemies.splice(index, 1);
    this.stats.enemiesDefeated++;

    this.stats.combo++;
    this.stats.comboTimer = 2.8;
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }

    soundManager.playCombo(this.stats.combo);
    soundManager.playExplosion(enemy.type === 'DREADNOUGHT_BOSS' ? 'LARGE' : 'MEDIUM');

    const multiplier = 1 + Math.min(10, Math.floor(this.stats.combo / 3));
    const addedScore = enemy.scoreValue * multiplier;
    this.stats.score += addedScore;

    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      localStorage.setItem('gesture_strike_highscore', String(this.stats.highScore));
    }

    this.addTrauma(enemy.type === 'DREADNOUGHT_BOSS' ? 0.7 : 0.25);
    this.hitstopRemaining = enemy.type === 'DREADNOUGHT_BOSS' ? 0.08 : 0.04;

    this.spawnExplosion(
      enemy.position.x,
      0,
      enemy.position.z,
      enemy.type === 'DREADNOUGHT_BOSS' ? 0xf43f5e : 0x06b6d4,
      enemy.type === 'DREADNOUGHT_BOSS' ? 55 : 28
    );

    this.dropPowerup3D(enemy.position.x, 0, enemy.position.z);
    this.reportStats(true);
  }

  private collectPowerup(pw: Powerup3D) {
    this.stats.powerupsCollected++;
    soundManager.playPowerup();
    this.addTrauma(0.15);

    if (pw.type === 'SPREAD_SHOT') {
      this.stats.activeBuff = 'SPREAD_SHOT';
      this.stats.buffTimer = 10;
    } else if (pw.type === 'RAPID_FIRE') {
      this.stats.activeBuff = 'RAPID_FIRE';
      this.stats.buffTimer = 8;
    } else if (pw.type === 'NOVA_BOMB') {
      this.stats.novaBombs = Math.min(this.stats.maxNovaBombs, this.stats.novaBombs + 1);
    } else if (pw.type === 'REPAIR_HULL') {
      this.stats.hull = Math.min(this.stats.maxHull, this.stats.hull + 35);
    } else if (pw.type === 'CHRONO_SLOW') {
      this.stats.activeBuff = 'CHRONO_SLOW';
      this.stats.chronoSlowActive = true;
      this.stats.buffTimer = 6;
    }

    this.reportStats(true);
  }

  private waveComplete() {
    this.waveState = 'INTERMISSION';
    this.stats.score += this.stats.wave * 1200;

    if (this.stats.wave >= 10) {
      this.mode = 'VICTORY';
      this.callbacks?.onVictory(this.stats);
      return;
    }

    setTimeout(() => {
      if (this.mode === 'PLAYING') {
        this.startWave(this.stats.wave + 1);
      }
    }, 2200);
  }

  private handleGameOver() {
    this.mode = 'GAMEOVER';
    this.addTrauma(0.8);
    soundManager.playExplosion('LARGE');
    this.spawnExplosion(this.player.position.x, 0, this.player.position.z, 0xf43f5e, 45);
    this.callbacks?.onGameOver(this.stats);
  }

  private reportStats(immediate: boolean = false) {
    if (immediate || this.callbacks) {
      this.callbacks?.onStatsUpdate({ ...this.stats });
    }
  }

  private updateBackground3D(dt: number) {
    if (this.starGeo) {
      const posAttr = this.starGeo.getAttribute('position') as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;
      const starSpeed = this.stats.chronoSlowActive ? 50 : 140;

      for (let i = 2; i < array.length; i += 3) {
        array[i] += starSpeed * dt;
        if (array[i] > 30) {
          array[i] = -270;
        }
      }
      posAttr.needsUpdate = true;
    }

    if (this.arenaFloorGrid) {
      this.arenaFloorGrid.position.z = ((this.arenaFloorGrid.position.z + dt * 35) % 20) - 30;
    }
  }

  private render3D() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }
}

export const gameEngine3D = new GameEngine3D();
