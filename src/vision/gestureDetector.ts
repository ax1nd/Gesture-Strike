/**
 * Enhanced Computer Vision & Multi-Hand Gesture Detection Engine
 * Integrates MediaPipe Tasks Vision for dual-hand 21-point 3D tracking,
 * lighting auto-analysis & adaptive thresholding, roll angle estimation,
 * hand depth inference, and multi-gesture classification (Pinch, Finger Gun, Fist, Palm, Peace).
 */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandGestureData, SingleHandData, GestureType } from '../types/game';

export type GestureCallback = (data: HandGestureData) => void;

export class GestureDetector {
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private onGestureCallback: GestureCallback | null = null;

  // Smoothing filters for jitter reduction & velocity tracking
  private smoothedAimX: number = 0.5;
  private smoothedAimY: number = 0.5;
  private smoothedDepth: number = 0.5;
  private smoothedRoll: number = 0;
  private fistHoldTime: number = 0;

  // Secondary hand smoothing
  private secSmoothedAimX: number = 0.2;
  private secSmoothedAimY: number = 0.5;

  // State flags
  public isModelLoaded: boolean = false;
  public isCameraActive: boolean = false;
  public cameraError: string | null = null;

  // Lighting & Sensing Performance Telemetry
  private lastFpsTime: number = performance.now();
  private frameCount: number = 0;
  private currentFps: number = 60;
  private averageLuma: number = 128;
  private lightingCondition: 'OPTIMAL' | 'DIM' | 'LOW_LIGHT' = 'OPTIMAL';

  // Fallback canvas for pixel-based skin/motion tracking and luminance analysis
  private lumaCanvas: HTMLCanvasElement;
  private lumaCtx: CanvasRenderingContext2D | null;

  constructor() {
    this.lumaCanvas = document.createElement('canvas');
    this.lumaCanvas.width = 160;
    this.lumaCanvas.height = 120;
    this.lumaCtx = this.lumaCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Initializes MediaPipe HandLandmarker with GPU delegate and CPU fallback
   */
  public async initModel(): Promise<boolean> {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.45,
        minHandPresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });

      this.isModelLoaded = true;
      return true;
    } catch (err) {
      console.warn('Failed GPU delegate for MediaPipe, switching to CPU mode...', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
        this.isModelLoaded = true;
        return true;
      } catch (cpuErr) {
        console.error('MediaPipe landmarker initialization failed:', cpuErr);
        return false;
      }
    }
  }

  /**
   * Starts camera stream and binds to video element
   */
  public async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    this.videoElement = videoElement;
    this.cameraError = null;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser.');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      this.videoElement.srcObject = this.stream;
      await new Promise<void>((resolve) => {
        if (!this.videoElement) return resolve();
        this.videoElement.onloadedmetadata = () => {
          this.videoElement?.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.isCameraActive = true;
      this.startLoop();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera';
      this.cameraError = msg;
      this.isCameraActive = false;
      return false;
    }
  }

  public stopCamera() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.isCameraActive = false;

    // Reset gesture detection data to inactive
    if (this.onGestureCallback) {
      this.onGestureCallback({
        detected: false,
        handCount: 0,
        aimX: this.smoothedAimX,
        aimY: this.smoothedAimY,
        gesture: 'NONE',
        pinchDistance: 1.0,
        isPinching: false,
        isFist: false,
        isOpenPalm: false,
        isFingerGun: false,
        isPeace: false,
        fistCharge: 0,
        confidence: 0,
        handDepth: 0.5,
        rollAngle: 0,
        lightingCondition: this.lightingCondition,
        averageLuma: this.averageLuma,
        sensingFps: 0,
      });
    }
  }

  public setOnGesture(callback: GestureCallback) {
    this.onGestureCallback = callback;
  }

  private startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    let lastVideoTime = -1;

    const frameLoop = () => {
      if (!this.isRunning) return;

      if (this.videoElement && this.videoElement.readyState >= 2) {
        const currentTime = this.videoElement.currentTime;

        // Measure sensing FPS
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsTime >= 1000) {
          this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
          this.frameCount = 0;
          this.lastFpsTime = now;
        }

        if (currentTime !== lastVideoTime) {
          lastVideoTime = currentTime;

          // Analyze scene lighting
          this.analyzeLighting();

          if (this.handLandmarker && this.isModelLoaded) {
            try {
              const startTimeMs = performance.now();
              const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
              this.processLandmarks(results);
            } catch {
              this.fallbackProcess();
            }
          } else {
            this.fallbackProcess();
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(frameLoop);
    };

    this.animationFrameId = requestAnimationFrame(frameLoop);
  }

  /**
   * Fast real-time scene lighting and contrast measurement
   */
  private analyzeLighting() {
    if (!this.videoElement || !this.lumaCtx) return;
    const w = this.lumaCanvas.width;
    const h = this.lumaCanvas.height;

    this.lumaCtx.drawImage(this.videoElement, 0, 0, w, h);
    const imgData = this.lumaCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let totalLuma = 0;
    const sampleStep = 32; // Fast stride
    let samples = 0;

    for (let i = 0; i < data.length; i += sampleStep * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // ITU-R BT.601 luma formula
      totalLuma += 0.299 * r + 0.587 * g + 0.114 * b;
      samples++;
    }

    this.averageLuma = samples > 0 ? Math.round(totalLuma / samples) : 128;
    if (this.averageLuma < 50) {
      this.lightingCondition = 'LOW_LIGHT';
    } else if (this.averageLuma < 90) {
      this.lightingCondition = 'DIM';
    } else {
      this.lightingCondition = 'OPTIMAL';
    }
  }

  /**
   * Single Hand Feature Extraction
   */
  private extractHandFeatures(landmarks: { x: number; y: number; z: number }[]): SingleHandData {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexMcp = landmarks[5];
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Hand scale invariant
    const handScale = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y) || 0.2;

    // Mirrored Aim
    const rawAimX = 1 - indexTip.x;
    const rawAimY = indexTip.y;

    // Depth estimate (larger hand on screen = closer to camera)
    const rawDepth = Math.max(0.2, Math.min(1.2, 0.45 / (handScale * 2.5)));

    // Roll angle (radians): angle of wrist-to-index knuckle
    const rollAngle = Math.atan2(indexMcp.y - wrist.y, indexMcp.x - wrist.x) - Math.PI / 2;

    // 1. Pinch Detection
    const pinchDistRaw = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const normalizedPinchDist = pinchDistRaw / handScale;
    const isPinching = normalizedPinchDist < 0.38;

    // 2. Fist Detection
    const indexCurled = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) < handScale * 1.1;
    const middleCurled = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y) < handScale * 1.1;
    const ringCurled = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y) < handScale * 1.1;
    const pinkyCurled = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y) < handScale * 1.1;
    const isFist = indexCurled && middleCurled && ringCurled && pinkyCurled;

    // 3. Finger Gun
    const indexExtended = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) > handScale * 1.45;
    const isFingerGun = indexExtended && middleCurled && ringCurled && pinkyCurled && !isPinching;

    // 4. Open Palm
    const middleExtended = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y) > handScale * 1.4;
    const ringExtended = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y) > handScale * 1.35;
    const pinkyExtended = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y) > handScale * 1.25;
    const isOpenPalm = indexExtended && middleExtended && ringExtended && pinkyExtended && !isPinching;

    // 5. Peace Sign / V Gesture (Index and middle extended, others curled)
    const isPeace = indexExtended && middleExtended && ringCurled && pinkyCurled && !isPinching;

    let gesture: GestureType = 'POINT';
    if (isPinching) gesture = 'PINCH';
    else if (isFist) gesture = 'FIST';
    else if (isOpenPalm) gesture = 'OPEN_PALM';
    else if (isPeace) gesture = 'PEACE';
    else if (isFingerGun) gesture = 'FINGER_GUN';

    return {
      aimX: rawAimX,
      aimY: rawAimY,
      gesture,
      pinchDistance: Math.min(1.0, normalizedPinchDist),
      isPinching,
      isFist,
      isOpenPalm,
      isFingerGun,
      isPeace,
      fistCharge: isFist ? 1 : 0,
      confidence: 0.95,
      handDepth: rawDepth,
      rollAngle,
      rawLandmarks: landmarks,
    };
  }

  /**
   * Process 21-point 3D hand landmarks for Primary and Secondary Hands
   */
  private processLandmarks(results: {
    landmarks: { x: number; y: number; z: number }[][];
  }) {
    if (!results.landmarks || results.landmarks.length === 0) {
      this.fistHoldTime = Math.max(0, this.fistHoldTime - 0.08);

      if (this.onGestureCallback) {
        this.onGestureCallback({
          detected: false,
          handCount: 0,
          aimX: this.smoothedAimX,
          aimY: this.smoothedAimY,
          gesture: 'NONE',
          pinchDistance: 1.0,
          isPinching: false,
          isFist: false,
          isOpenPalm: false,
          isFingerGun: false,
          isPeace: false,
          fistCharge: 0,
          confidence: 0,
          handDepth: 0.5,
          rollAngle: 0,
          lightingCondition: this.lightingCondition,
          averageLuma: this.averageLuma,
          sensingFps: this.currentFps,
        });
      }
      return;
    }

    // Primary Hand
    const primaryRaw = this.extractHandFeatures(results.landmarks[0]);

    // Exponential smoothing (alpha = 0.65)
    const alpha = 0.68;
    this.smoothedAimX = this.smoothedAimX * (1 - alpha) + primaryRaw.aimX * alpha;
    this.smoothedAimY = this.smoothedAimY * (1 - alpha) + primaryRaw.aimY * alpha;
    this.smoothedDepth = this.smoothedDepth * 0.8 + primaryRaw.handDepth * 0.2;
    this.smoothedRoll = this.smoothedRoll * 0.75 + primaryRaw.rollAngle * 0.25;

    if (primaryRaw.isFist) {
      this.fistHoldTime = Math.min(1.0, this.fistHoldTime + 0.06);
    } else {
      this.fistHoldTime = Math.max(0, this.fistHoldTime - 0.09);
    }

    // Secondary Hand if available
    let secondaryHand: SingleHandData | undefined;
    if (results.landmarks.length > 1) {
      const secRaw = this.extractHandFeatures(results.landmarks[1]);
      this.secSmoothedAimX = this.secSmoothedAimX * 0.7 + secRaw.aimX * 0.3;
      this.secSmoothedAimY = this.secSmoothedAimY * 0.7 + secRaw.aimY * 0.3;
      secondaryHand = {
        ...secRaw,
        aimX: this.secSmoothedAimX,
        aimY: this.secSmoothedAimY,
      };
    }

    // If secondary hand is making open palm, it can trigger shield too!
    const effectiveOpenPalm = primaryRaw.isOpenPalm || Boolean(secondaryHand?.isOpenPalm);
    const effectiveFist = primaryRaw.isFist || Boolean(secondaryHand?.isFist);

    if (this.onGestureCallback) {
      this.onGestureCallback({
        detected: true,
        handCount: results.landmarks.length,
        aimX: Math.max(0.02, Math.min(0.98, this.smoothedAimX)),
        aimY: Math.max(0.02, Math.min(0.98, this.smoothedAimY)),
        gesture: primaryRaw.gesture,
        pinchDistance: primaryRaw.pinchDistance,
        isPinching: primaryRaw.isPinching,
        isFist: effectiveFist,
        isOpenPalm: effectiveOpenPalm,
        isFingerGun: primaryRaw.isFingerGun,
        isPeace: primaryRaw.isPeace,
        fistCharge: this.fistHoldTime,
        confidence: 0.95,
        handDepth: this.smoothedDepth,
        rollAngle: this.smoothedRoll,
        rawLandmarks: primaryRaw.rawLandmarks,
        secondaryHand,
        lightingCondition: this.lightingCondition,
        averageLuma: this.averageLuma,
        sensingFps: this.currentFps,
        isFallbackCV: false,
      });
    }
  }

  /**
   * Adaptive Fallback CV using dynamic luminance thresholding
   */
  private fallbackProcess() {
    if (!this.videoElement || !this.lumaCtx) return;
    const w = this.lumaCanvas.width;
    const h = this.lumaCanvas.height;

    this.lumaCtx.drawImage(this.videoElement, 0, 0, w, h);
    const frame = this.lumaCtx.getImageData(0, 0, w, h);
    const data = frame.data;

    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;

    // Adaptive threshold based on average scene luma
    const minRed = this.lightingCondition === 'LOW_LIGHT' ? 50 : 85;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const isSkin = r > minRed && g > 30 && b > 15 && r > g && Math.abs(r - g) > 10;
      if (isSkin) {
        const pixelIndex = i / 4;
        sumX += pixelIndex % w;
        sumY += Math.floor(pixelIndex / w);
        totalWeight++;
      }
    }

    if (totalWeight > 60) {
      const avgX = 1 - sumX / totalWeight / w;
      const avgY = sumY / totalWeight / h;

      this.smoothedAimX = this.smoothedAimX * 0.75 + avgX * 0.25;
      this.smoothedAimY = this.smoothedAimY * 0.75 + avgY * 0.25;

      if (this.onGestureCallback) {
        this.onGestureCallback({
          detected: true,
          handCount: 1,
          aimX: Math.max(0.05, Math.min(0.95, this.smoothedAimX)),
          aimY: Math.max(0.05, Math.min(0.95, this.smoothedAimY)),
          gesture: 'POINT',
          pinchDistance: 0.6,
          isPinching: false,
          isFist: false,
          isOpenPalm: false,
          isFingerGun: false,
          isPeace: false,
          fistCharge: 0,
          confidence: 0.7,
          handDepth: 0.5,
          rollAngle: 0,
          lightingCondition: this.lightingCondition,
          averageLuma: this.averageLuma,
          sensingFps: this.currentFps,
          isFallbackCV: true,
        });
      }
    }
  }

  /**
   * Draws futuristic cyber hand skeleton onto canvas
   */
  public drawSkeleton(
    ctx: CanvasRenderingContext2D,
    landmarks: { x: number; y: number }[] | undefined,
    width: number,
    height: number,
    isPinching: boolean,
    isFist: boolean,
    isOpenPalm: boolean,
    isPeace?: boolean
  ) {
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 21) {
      return;
    }

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];

    const boneColor = isPinching
      ? '#f43f5e'
      : isFist
      ? '#f59e0b'
      : isOpenPalm
      ? '#3b82f6'
      : isPeace
      ? '#a855f7'
      : '#06b6d4';

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = boneColor;
    ctx.shadowColor = boneColor;
    ctx.shadowBlur = 8;

    connections.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      const x1 = (1 - p1.x) * width;
      const y1 = p1.y * height;
      const x2 = (1 - p2.x) * width;
      const y2 = p2.y * height;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    landmarks.forEach((p, idx) => {
      const x = (1 - p.x) * width;
      const y = p.y * height;
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      const isPinchJoint = idx === 4 || idx === 8;

      ctx.beginPath();
      ctx.arc(x, y, isPinchJoint ? 5 : isTip ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isPinchJoint && isPinching ? '#ffffff' : boneColor;
      ctx.shadowBlur = 10;
      ctx.fill();

      if (idx === 8) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 0;
  }
}

export const gestureDetector = new GestureDetector();
