import React, { useEffect } from 'react';
import { HandGestureData } from '../types/game';
import { Volume2, VolumeX, Camera, VideoOff, Crosshair, Zap, Shield, Sparkles } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  highScore: number;
  cameraActive: boolean;
  modelLoaded: boolean;
  cameraError: string | null;
  onToggleCamera: () => void;
  gestureData: HandGestureData | null;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  highScore,
  cameraActive,
  modelLoaded,
  cameraError,
  onToggleCamera,
  gestureData,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onStart();
      } else if (e.code === 'KeyM') {
        onToggleMute();
      } else if (e.code === 'KeyC') {
        onToggleCamera();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, onToggleMute, onToggleCamera]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-8 md:p-14 pointer-events-none select-none overflow-hidden">
      {/* Top AAA Telemetry Bar - Zero Boxes, Pure Micro-Typography */}
      <div className="w-full flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.25em] text-cyan-400 font-bold uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
            <span>SYS.VER 5.5 // SECTOR_ORBITAL_DEFENSE</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
            45° TOP-DOWN TACTICAL INTERCEPTOR
          </div>
        </div>

        <div className="flex items-center gap-6 pointer-events-auto">
          {highScore > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                RECORD HIGH SCORE
              </span>
              <span className="font-mono font-black text-amber-400 tabular-nums text-lg drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                {highScore.toLocaleString()}
              </span>
            </div>
          )}

          <button
            onClick={onToggleMute}
            className="p-2 rounded hover:text-cyan-400 text-slate-400 transition-colors cursor-pointer"
            title="Toggle Audio (M)"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece - Monolithic AAA Typography Over 3D Scene */}
      <div className="my-auto max-w-4xl flex flex-col items-start pl-2">
        <div className="text-xs font-mono font-bold tracking-[0.4em] text-cyan-400/90 uppercase mb-2">
          TACTICAL RAIL DEFENSE SIMULATION
        </div>

        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black font-mono tracking-tighter text-white leading-none mb-3 drop-shadow-[0_0_40px_rgba(6,182,212,0.5)]">
          GESTURE<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-rose-400">STRIKE</span>
        </h1>

        <div className="flex items-center gap-3 text-xs md:text-sm font-mono tracking-[0.25em] text-slate-400 uppercase mb-8">
          <span>45° ELEVATED TACTICAL RETICLE</span>
          <span className="text-cyan-500 font-bold">/</span>
          <span>COLOSSAL ENEMY FLEETS</span>
        </div>

        {/* Camera Power Switch & Floating Gesture Feedback */}
        <div className="flex flex-wrap items-center gap-6 mb-10 pointer-events-auto">
          {/* Explicit Camera ON/OFF Switch */}
          <button
            onClick={onToggleCamera}
            className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              cameraActive
                ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-400/70 shadow-[0_0_18px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-500'
            }`}
            title="Switch webcam on or off anytime (Hotkey: C)"
          >
            {cameraActive ? (
              <>
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>CAMERA: ON (CLICK TO TURN OFF)</span>
              </>
            ) : (
              <>
                <VideoOff className="w-4 h-4 text-slate-400" />
                <span>CAMERA: OFF (CLICK TO TURN ON)</span>
              </>
            )}
          </button>

          {/* Floating Live Gesture / Input Indicators */}
          {cameraActive ? (
            <div className="flex items-center gap-4 text-xs font-mono">
              <span
                className={`flex items-center gap-1.5 transition-colors ${
                  gestureData?.detected ? 'text-cyan-300 font-bold drop-shadow-[0_0_8px_#22d3ee]' : 'text-slate-600'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>POINT AIM</span>
              </span>

              <span className="text-slate-700">·</span>

              <span
                className={`flex items-center gap-1.5 transition-colors ${
                  gestureData?.isPinching ? 'text-rose-400 font-bold drop-shadow-[0_0_10px_#f43f5e]' : 'text-slate-600'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>PINCH FIRE</span>
              </span>

              <span className="text-slate-700">·</span>

              <span
                className={`flex items-center gap-1.5 transition-colors ${
                  gestureData?.isOpenPalm ? 'text-blue-400 font-bold drop-shadow-[0_0_10px_#60a5fa]' : 'text-slate-600'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>PALM SHIELD</span>
              </span>

              <span className="text-slate-700">·</span>

              <span
                className={`flex items-center gap-1.5 transition-colors ${
                  (gestureData?.fistCharge || 0) > 0.4
                    ? 'text-amber-400 font-bold drop-shadow-[0_0_10px_#fbbf24]'
                    : 'text-slate-600'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>FIST NOVA</span>
              </span>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>MOUSE & TOUCH AIM ACTIVE (CAMERA IS OPTIONAL)</span>
            </div>
          )}
        </div>

        {/* Primary AAA Engagement Prompt */}
        <div className="pointer-events-auto flex items-center gap-4">
          <button
            onClick={onStart}
            className="group relative px-10 py-4 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-black tracking-[0.15em] text-base uppercase shadow-[0_0_35px_rgba(6,182,212,0.7)] transition-all hover:scale-102 active:scale-98 flex items-center gap-3 cursor-pointer"
          >
            <Crosshair className="w-5 h-5 text-slate-950 group-hover:rotate-45 transition-transform duration-300" />
            <span>DEPLOY INTERCEPTOR</span>
            <span className="text-xs px-2 py-0.5 rounded bg-black/15 text-slate-900 border border-slate-950/20 font-bold">
              SPACE / ENTER
            </span>
          </button>
        </div>
      </div>

      {/* Flat Bottom Line - Clean AAA Control Hint */}
      <div className="w-full flex flex-wrap items-center justify-between text-xs font-mono text-slate-500 tracking-widest uppercase">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-bold">CONTROL GUIDE:</span>
          <span className="text-slate-400">
            {cameraActive
              ? 'Point to Aim · Pinch to Fire · Open Palm for Shield · Clench Fist for Nova Bomb · C to Turn Camera Off'
              : 'Mouse/Touch to Aim & Click to Fire · B for Nova Bomb · C to Turn Camera On Anytime'}
          </span>
        </div>
        <div>THREE.JS WEBGL · 45° TOP-DOWN VIEW</div>
      </div>
    </div>
  );
};
