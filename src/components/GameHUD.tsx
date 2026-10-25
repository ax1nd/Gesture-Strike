import React, { useState } from 'react';
import { GameStats, HandGestureData } from '../types/game';
import { Shield, Sparkles, Volume2, VolumeX, Pause, Camera, Zap, ChevronDown, ChevronUp, VideoOff } from 'lucide-react';

interface GameHUDProps {
  stats: GameStats;
  gestureData: HandGestureData | null;
  cameraActive: boolean;
  onToggleCameraPower: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleCameraPIP: () => void;
  isCameraPIPOpen: boolean;
  onPause: () => void;
  onTriggerNova: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  gestureData,
  cameraActive,
  onToggleCameraPower,
  isMuted,
  onToggleMute,
  onToggleCameraPIP,
  isCameraPIPOpen,
  onPause,
  onTriggerNova,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const comboMultiplier = 1 + Math.min(10, Math.floor(stats.combo / 3));
  const hullPercent = Math.max(0, Math.min(100, (stats.hull / stats.maxHull) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-6 md:p-8 overflow-hidden">
      {/* TOP PERIMETER: Completely Box-Free Floating AAA Telemetry */}
      <div className="w-full flex items-start justify-between">
        {/* Top-Left: Minimalist Sector & High-Score Floating Readout */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
            <span>SECTOR 0{stats.wave}</span>
            {stats.chronoSlowActive && (
              <span className="text-purple-400 tracking-wider">· CHRONO MATRIX</span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl md:text-6xl font-black tracking-tight text-white tabular-nums drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
              {stats.score.toLocaleString()}
            </span>
            <span className="font-mono text-xs uppercase text-slate-400 font-bold tracking-widest">
              PTS
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 tracking-wider flex items-center gap-1.5">
            <span>RECORD:</span>
            <span className="text-amber-400 font-bold tabular-nums">
              {Math.max(stats.score, stats.highScore).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Top-Right: Dynamic Combo Streak & Floating Gesture/Mouse Status */}
        <div className="flex flex-col items-end gap-1.5">
          {stats.combo > 1 && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-amber-400 font-mono font-black text-xl tracking-wider drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                <Zap className="w-5 h-5 fill-current" />
                <span>COMBO x{stats.combo}</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold ml-1">
                  {comboMultiplier}X
                </span>
              </div>
              <div className="w-32 h-1 bg-slate-800/80 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-100 ease-linear shadow-[0_0_6px_#fbbf24]"
                  style={{ width: `${Math.min(100, (stats.comboTimer / 2.8) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {stats.activeBuff && stats.buffTimer > 0 && (
            <div className="flex items-center gap-1.5 text-purple-300 font-mono text-xs font-bold tracking-wider drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>
                {stats.activeBuff === 'SPREAD_SHOT'
                  ? 'TRIPLE SPREAD'
                  : stats.activeBuff === 'RAPID_FIRE'
                  ? 'HYPER RAPID'
                  : 'CHRONO SLOW'}{' '}
                ({stats.buffTimer.toFixed(1)}s)
              </span>
            </div>
          )}

          {/* Floating Control Status Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider pt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                cameraActive
                  ? gestureData?.detected
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-400">CONTROL:</span>
            {cameraActive ? (
              <span
                className={`font-bold ${
                  gestureData?.isPinching
                    ? 'text-rose-400 drop-shadow-[0_0_8px_#f43f5e]'
                    : gestureData?.isOpenPalm
                    ? 'text-blue-400 drop-shadow-[0_0_8px_#60a5fa]'
                    : gestureData?.detected
                    ? 'text-cyan-300'
                    : 'text-amber-400'
                }`}
              >
                {gestureData?.isPinching
                  ? 'PINCH (FIRING)'
                  : gestureData?.isOpenPalm
                  ? 'PALM (DEFLECTING)'
                  : gestureData?.detected
                  ? 'OPTICAL HAND ACTIVE'
                  : 'SEARCHING HAND...'}
              </span>
            ) : (
              <span className="font-bold text-slate-300">MOUSE / TOUCH AIM</span>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM PERIMETER: Sleek Floating Hull Line & Controls */}
      <div className="w-full flex flex-col items-center pointer-events-auto">
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="mb-1 text-slate-500 hover:text-cyan-400 text-[10px] font-mono tracking-widest uppercase flex items-center gap-1 transition-colors cursor-pointer"
        >
          {isDockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isDockCollapsed ? 'EXPAND CONTROLS' : 'HIDE CONTROLS'}</span>
        </button>

        {!isDockCollapsed && (
          <div className="w-full max-w-3xl flex items-center justify-between gap-6 px-4 py-2">
            {/* Sleek Floating Hull Bar */}
            <div className="w-56 sm:w-64 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 font-bold tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  HULL
                </span>
                <span
                  className={`font-black tabular-nums ${
                    hullPercent > 50
                      ? 'text-cyan-400'
                      : hullPercent > 25
                      ? 'text-amber-400'
                      : 'text-rose-500 animate-pulse'
                  }`}
                >
                  {Math.round(hullPercent)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    hullPercent > 50
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-400 shadow-[0_0_10px_#06b6d4]'
                      : hullPercent > 25
                      ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'
                      : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                  }`}
                  style={{ width: `${hullPercent}%` }}
                />
              </div>
            </div>

            {/* Nova Bomb Control */}
            <button
              onClick={onTriggerNova}
              disabled={stats.novaBombs <= 0}
              className={`px-4 py-2 rounded font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all ${
                stats.novaBombs > 0
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95'
                  : 'bg-slate-900 text-slate-600 cursor-not-allowed'
              }`}
              title="Detonate Nova Bomb (Clench Fist or Click)"
            >
              <Sparkles className="w-4 h-4" />
              <span>NOVA BOMB</span>
              <div className="flex gap-1 ml-1">
                {Array.from({ length: stats.maxNovaBombs }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < stats.novaBombs ? 'bg-slate-950' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </button>

            {/* Utility Floating Controls: Camera Power Switch (C), Audio (M), Pause (Esc) */}
            <div className="flex items-center gap-3 text-slate-400">
              {/* Direct Camera Power ON/OFF Toggle */}
              <button
                onClick={onToggleCameraPower}
                className={`px-3 py-1.5 rounded font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  cameraActive
                    ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title="Switch Camera ON or OFF (Hotkey: C)"
              >
                {cameraActive ? <Camera className="w-4 h-4 text-cyan-400" /> : <VideoOff className="w-4 h-4 text-slate-400" />}
                <span className="hidden sm:inline">
                  {cameraActive ? 'CAM ON (C)' : 'CAM OFF (C)'}
                </span>
              </button>

              <button
                onClick={onToggleMute}
                className="p-2 rounded hover:text-cyan-300 transition-colors cursor-pointer"
                title="Toggle Mute (M)"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
              </button>

              <button
                onClick={onPause}
                className="p-2 rounded hover:text-cyan-300 transition-colors cursor-pointer"
                title="Pause (Esc)"
              >
                <Pause className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
