import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gameEngine3D } from './game/engine3d';
import { gestureDetector } from './vision/gestureDetector';
import { soundManager } from './audio/soundManager';
import { GameMode, GameStats, HandGestureData } from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { WebcamPIP } from './components/WebcamPIP';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // React State for UI
  const [gameMode, setGameMode] = useState<GameMode>('TITLE');
  const [stats, setStats] = useState<GameStats>(gameEngine3D.stats);
  const [gestureData, setGestureData] = useState<HandGestureData | null>(null);

  // Camera Power State (OFF by default - user explicitly toggles on/off)
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraPIPOpen, setIsCameraPIPOpen] = useState<boolean>(false);
  const [cameraNotification, setCameraNotification] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  // Initialize 3D Engine and Vision Detector
  useEffect(() => {
    if (!canvasRef.current) return;

    gameEngine3D.init(canvasRef.current, {
      onStatsUpdate: (updatedStats) => {
        setStats(updatedStats);
      },
      onGameOver: (finalStats) => {
        setStats(finalStats);
        setGameMode('GAMEOVER');
      },
      onVictory: (finalStats) => {
        setStats(finalStats);
        setGameMode('VICTORY');
      },
      onWaveStart: () => {},
    });

    const handleResize = () => gameEngine3D.resize();
    window.addEventListener('resize', handleResize);

    // Setup Gesture detector listener
    gestureDetector.setOnGesture((data) => {
      setGestureData(data);
      gameEngine3D.updateGesture(data);
    });

    // Start background model loading (lightweight WASM preparation)
    gestureDetector.initModel().then((loaded) => {
      setModelLoaded(loaded);
    });

    // NOTE: Camera starts OFF by default as requested. Does NOT auto-capture webcam.

    return () => {
      window.removeEventListener('resize', handleResize);
      gestureDetector.stopCamera();
      gameEngine3D.stopLoop();
    };
  }, []);

  // Instant Camera Power Toggle (Turn ON or OFF anytime)
  const handleToggleCameraPower = useCallback(async () => {
    if (cameraActive) {
      // Turn OFF camera
      gestureDetector.stopCamera();
      setCameraActive(false);
      setIsCameraPIPOpen(false);
      setCameraNotification('CAMERA TURNED OFF · MOUSE / TOUCH ACTIVE');
    } else {
      // Turn ON camera
      if (!videoRef.current) return;
      const success = await gestureDetector.startCamera(videoRef.current);
      setCameraActive(success);
      if (success) {
        setCameraError(null);
        setIsCameraPIPOpen(true);
        setCameraNotification('CAMERA TURNED ON · OPTICAL HAND TRACKING ACTIVE');
      } else {
        setCameraError(gestureDetector.cameraError);
        setCameraNotification('CAMERA UNAVAILABLE · MOUSE ACTIVE');
      }
    }

    setTimeout(() => {
      setCameraNotification(null);
    }, 3200);
  }, [cameraActive]);

  const handleStartGame = useCallback(() => {
    setGameMode('PLAYING');
    gameEngine3D.startGame();
  }, []);

  const handlePause = useCallback(() => {
    setGameMode('PAUSED');
    gameEngine3D.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    setGameMode('PLAYING');
    gameEngine3D.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    setGameMode('PLAYING');
    gameEngine3D.startGame();
  }, []);

  const handleHome = useCallback(() => {
    setGameMode('TITLE');
    gameEngine3D.mode = 'TITLE';
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleToggleCameraPIP = useCallback(() => {
    setIsCameraPIPOpen((prev) => !prev);
  }, []);

  const handleTriggerNova = useCallback(() => {
    gameEngine3D.triggerNovaBomb();
  }, []);

  // Global Keydown Router for hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (gameMode === 'PLAYING') {
          handlePause();
        } else if (gameMode === 'PAUSED') {
          handleResume();
        }
      } else if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'KeyC') {
        // Toggle camera power with C hotkey
        handleToggleCameraPower();
      } else if (e.code === 'KeyB' || e.code === 'KeyN') {
        if (gameMode === 'PLAYING') {
          handleTriggerNova();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, handlePause, handleResume, handleToggleMute, handleToggleCameraPower, handleTriggerNova]);

  // Pointer event listeners on 3D canvas for mouse/touch fallback
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    gameEngine3D.setMouseAim(e.clientX, e.clientY);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameMode === 'PLAYING') {
      gameEngine3D.triggerMouseShoot();
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Three.js Isolated Canvas Container */}
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className="absolute inset-0 w-full h-full cursor-crosshair block"
      />

      {/* Hidden Master Video Element for Webcam Capture */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
      />

      {/* Camera Power Status Toast Notification */}
      {cameraNotification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-slate-950/90 border border-cyan-400/60 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-2.5 text-xs font-mono font-bold tracking-wider text-cyan-300">
            <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span>{cameraNotification}</span>
          </div>
        </div>
      )}

      {/* GAME SHELL SCREENS & MODALS */}
      {gameMode === 'TITLE' && (
        <TitleScreen
          onStart={handleStartGame}
          highScore={stats.highScore}
          cameraActive={cameraActive}
          modelLoaded={modelLoaded}
          cameraError={cameraError}
          onToggleCamera={handleToggleCameraPower}
          gestureData={gestureData}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameMode === 'PLAYING' && (
        <>
          <GameHUD
            stats={stats}
            gestureData={gestureData}
            cameraActive={cameraActive}
            onToggleCameraPower={handleToggleCameraPower}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onToggleCameraPIP={handleToggleCameraPIP}
            isCameraPIPOpen={isCameraPIPOpen}
            onPause={handlePause}
            onTriggerNova={handleTriggerNova}
          />
          {cameraActive && (
            <WebcamPIP
              videoRef={videoRef}
              gestureData={gestureData}
              isOpen={isCameraPIPOpen}
              onToggle={handleToggleCameraPIP}
            />
          )}
        </>
      )}

      {gameMode === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onHome={handleHome}
          cameraActive={cameraActive}
          onToggleCameraPower={handleToggleCameraPower}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameMode === 'GAMEOVER' && (
        <GameOverModal
          stats={stats}
          cameraActive={cameraActive}
          onToggleCameraPower={handleToggleCameraPower}
          onRetry={handleRestart}
          onHome={handleHome}
        />
      )}

      {gameMode === 'VICTORY' && (
        <VictoryModal
          stats={stats}
          cameraActive={cameraActive}
          onToggleCameraPower={handleToggleCameraPower}
          onContinue={handleRestart}
          onHome={handleHome}
        />
      )}
    </main>
  );
}
