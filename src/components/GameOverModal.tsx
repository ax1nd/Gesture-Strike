import React, { useEffect } from 'react';
import { GameStats } from '../types/game';
import { RotateCcw, Home, Skull, Target, Zap, Trophy, Camera, VideoOff } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  cameraActive: boolean;
  onToggleCameraPower: () => void;
  onRetry: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  cameraActive,
  onToggleCameraPower,
  onRetry,
  onHome,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onRetry();
      } else if (e.code === 'Escape') {
        onHome();
      } else if (e.code === 'KeyC') {
        onToggleCameraPower();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onRetry, onHome, onToggleCameraPower]);

  const accuracy =
    stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
  const isNewHighScore = stats.score >= stats.highScore && stats.score > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 select-none">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        {/* Glowing Skull Glyph */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 text-rose-500 drop-shadow-[0_0_20px_#f43f5e]">
          <Skull className="w-9 h-9" />
        </div>

        <h2 className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white mb-1 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]">
          HULL BREACHED
        </h2>
        <p className="text-slate-400 text-xs font-mono uppercase tracking-[0.25em] mb-6">
          ENGAGEMENT TERMINATED // SECTOR 0{stats.wave}
        </p>

        {/* Large Clean Score Readout */}
        <div className="mb-6">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">
            FINAL SCORE
          </div>
          <div className="text-5xl md:text-6xl font-mono font-black text-cyan-400 tabular-nums drop-shadow-[0_0_25px_rgba(6,182,212,0.7)]">
            {stats.score.toLocaleString()}
          </div>
          {isNewHighScore && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-amber-300 text-xs font-mono font-bold tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              RECORD HIGH SCORE SECURED
            </div>
          )}
        </div>

        {/* Minimal Performance Stats */}
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
              <Skull className="w-3 h-3 text-rose-400" />
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

        {/* Camera Power Quick Toggle after game */}
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

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-4">
          <button
            onClick={onRetry}
            className="flex-1 py-3.5 px-6 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REDEPLOY (SPACE)</span>
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
