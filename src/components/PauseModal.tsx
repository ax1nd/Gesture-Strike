import React, { useEffect } from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Camera, VideoOff } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  cameraActive: boolean;
  onToggleCameraPower: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  cameraActive,
  onToggleCameraPower,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        onResume();
      } else if (e.code === 'KeyC') {
        onToggleCameraPower();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onResume, onToggleCameraPower]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 select-none">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <h3 className="text-3xl font-mono font-black text-white tracking-widest mb-1 uppercase drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
          PAUSED
        </h3>
        <p className="text-xs font-mono text-cyan-400 uppercase tracking-[0.25em] mb-6">
          TACTICAL PROTOCOL SUSPENDED
        </p>

        {/* Minimal Control Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-6 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-black text-sm tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME (ESC)</span>
          </button>

          {/* Camera Power Switch Button */}
          <button
            onClick={onToggleCameraPower}
            className={`w-full py-2.5 px-4 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              cameraActive
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-900/90 text-slate-400 border border-slate-800 hover:text-white'
            }`}
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

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onToggleMute}
              className="py-3 px-3 rounded text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
            </button>

            <button
              onClick={onRestart}
              className="py-3 px-3 rounded text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART</span>
            </button>
          </div>

          <button
            onClick={onHome}
            className="w-full py-2.5 text-slate-500 hover:text-slate-300 font-mono text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>ABORT TO TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
