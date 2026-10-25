import React, { useEffect } from 'react';
import { GameStats } from '../types/game';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Target, Sparkles, Zap, Camera, VideoOff } from 'lucide-react';

interface VictoryModalProps {
  stats: GameStats;
  cameraActive: boolean;
  onToggleCameraPower: () => void;
  onContinue: () => void;
  onHome: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  cameraActive,
  onToggleCameraPower,
  onContinue,
  onHome,
}) => {
  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#f43f5e', '#facc15', '#a855f7'],
    });

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onContinue();
      } else if (e.code === 'KeyC') {
        onToggleCameraPower();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onContinue, onToggleCameraPower]);

  const accuracy =
    stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 select-none">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 text-amber-400 drop-shadow-[0_0_20px_#f59e0b]">
          <Trophy className="w-10 h-10" />
        </div>

        <h2 className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white mb-1 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">
          SECTORS LIBERATED
        </h2>
        <p className="text-cyan-400 text-xs font-mono uppercase tracking-[0.25em] mb-6">
          TITAN DREADNOUGHT ANNIHILATED // S-RANK
        </p>

        <div className="mb-6">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">
            TOTAL SCORE
          </div>
          <div className="text-5xl md:text-6xl font-mono font-black text-amber-400 tabular-nums drop-shadow-[0_0_25px_rgba(250,204,21,0.7)]">
            {stats.score.toLocaleString()}
          </div>
        </div>

        <div className="w-full flex items-center justify-around py-4 border-y border-slate-800/80 mb-6 font-mono">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Target className="w-3 h-3 text-cyan-400" />
              ACCURACY
            </span>
            <span className="text-xl font-bold text-white tabular-nums">{accuracy}%</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-400" />
              WIPED
            </span>
            <span className="text-xl font-bold text-white tabular-nums">{stats.enemiesDefeated}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              MAX COMBO
            </span>
            <span className="text-xl font-bold text-amber-400 tabular-nums">x{stats.maxCombo}</span>
          </div>
        </div>

        {/* Camera Power Switch */}
        <div className="w-full mb-6 flex justify-center">
          <button
            onClick={onToggleCameraPower}
            className={`px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              cameraActive
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {cameraActive ? (
              <>
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>CAMERA: ON (CLICK TO TURN OFF)</span>
              </>
            ) : (
              <>
                <VideoOff className="w-3.5 h-3.5 text-slate-400" />
                <span>CAMERA: OFF (CLICK TO TURN ON)</span>
              </>
            )}
          </button>
        </div>

        <div className="w-full flex items-center gap-4">
          <button
            onClick={onContinue}
            className="flex-1 py-3.5 px-6 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ENDLESS OVERDRIVE (SPACE)</span>
          </button>

          <button
            onClick={onHome}
            className="py-3.5 px-5 rounded text-slate-400 hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
