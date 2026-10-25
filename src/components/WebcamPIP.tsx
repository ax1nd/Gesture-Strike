import React, { useRef, useEffect } from 'react';
import { HandGestureData } from '../types/game';
import { gestureDetector } from '../vision/gestureDetector';
import { Eye, EyeOff, Sun, Moon, Gauge } from 'lucide-react';

interface WebcamPIPProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  gestureData: HandGestureData | null;
  isOpen: boolean;
  onToggle: () => void;
}

export const WebcamPIP: React.FC<WebcamPIPProps> = ({
  videoRef,
  gestureData,
  isOpen,
  onToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const render = () => {
      if (isOpen && canvasRef.current && gestureData) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          gestureDetector.drawSkeleton(
            ctx,
            gestureData.rawLandmarks,
            canvasRef.current.width,
            canvasRef.current.height,
            gestureData.isPinching,
            gestureData.isFist,
            gestureData.isOpenPalm,
            gestureData.isPeace
          );
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, gestureData]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-20 right-4 z-40 bg-slate-950/95 border border-slate-700 hover:border-cyan-400 text-slate-300 p-2.5 rounded shadow-xl text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
        title="Open Camera PIP"
      >
        <Eye className="w-4 h-4 text-cyan-400" />
        <span>CV CAM</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-56 md:w-64 bg-slate-950/95 border border-cyan-500/40 rounded-lg overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.3)] select-none">
      {/* Header Bar */}
      <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              gestureData?.detected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-200 font-bold text-[10px] tracking-wider uppercase">
            3D OPTICAL SENSOR
          </span>
        </div>

        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
          title="Minimize PIP"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video & Skeleton Canvas */}
      <div className="relative w-full aspect-[4/3] bg-black overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-70"
          playsInline
          muted
          autoPlay
        />

        <canvas
          ref={canvasRef}
          width={256}
          height={192}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Real-time Gesture Badge */}
        <div className="absolute top-2 left-2 z-10">
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded font-black uppercase tracking-wider ${
              gestureData?.isPinching
                ? 'bg-rose-500 text-white shadow-[0_0_8px_#f43f5e]'
                : gestureData?.isOpenPalm
                ? 'bg-blue-500 text-white shadow-[0_0_8px_#3b82f6]'
                : gestureData?.isPeace
                ? 'bg-purple-500 text-white shadow-[0_0_8px_#a855f7]'
                : gestureData?.isFist
                ? 'bg-amber-500 text-slate-950'
                : gestureData?.detected
                ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/50'
                : 'bg-black/70 text-slate-400'
            }`}
          >
            {gestureData?.isPinching
              ? 'PINCH (SHOOT)'
              : gestureData?.isOpenPalm
              ? 'SHIELD ACTIVE'
              : gestureData?.isPeace
              ? 'PEACE (OVERDRIVE)'
              : gestureData?.isFist
              ? 'FIST (NOVA CHARGE)'
              : gestureData?.detected
              ? 'POINTING (3D AIM)'
              : 'ACQUIRING TARGET...'}
          </span>
        </div>

        {/* Hands Count Badge */}
        {gestureData && gestureData.handCount > 1 && (
          <div className="absolute top-2 right-2 z-10 text-[9px] font-mono bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 px-1.5 py-0.5 rounded font-bold">
            DUAL HAND
          </div>
        )}
      </div>

      {/* Enhanced Telemetry Footer */}
      <div className="p-2.5 bg-slate-950 flex flex-col gap-1.5 text-[10px] font-mono border-t border-slate-800">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>Pinch Proximity:</span>
          </span>
          <span className="text-cyan-300 font-bold tabular-nums">
            {gestureData?.detected ? `${Math.round((1 - gestureData.pinchDistance) * 100)}%` : '--'}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1">
            {gestureData?.lightingCondition === 'OPTIMAL' ? (
              <Sun className="w-3 h-3 text-amber-400" />
            ) : (
              <Moon className="w-3 h-3 text-cyan-400" />
            )}
            <span>Lighting & Luma:</span>
          </span>
          <span className="text-slate-200 font-semibold">
            {gestureData?.lightingCondition || 'OPTIMAL'} ({gestureData?.averageLuma || 128})
          </span>
        </div>

        {/* Nova Fist Charge Progress */}
        {(gestureData?.fistCharge || 0) > 0 && (
          <div className="w-full mt-1">
            <div className="flex justify-between text-amber-400 text-[9px] mb-0.5 font-bold">
              <span>NOVA BOMB CHARGE</span>
              <span>{Math.round((gestureData?.fistCharge || 0) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${(gestureData?.fistCharge || 0) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
