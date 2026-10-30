import React from 'react';
import { Dumbbell, Clock, Timer, ChevronRight, Zap } from 'lucide-react';

interface ActiveWorkoutDockProps {
  isVisible: boolean;
  stopwatchSeconds: number;
  currentExerciseName: string;
  restTimeLeft?: number;
  isRestRunning?: boolean;
  onReturnToWorkout: () => void;
}

export const ActiveWorkoutDock: React.FC<ActiveWorkoutDockProps> = ({
  isVisible,
  stopwatchSeconds,
  currentExerciseName,
  restTimeLeft = 0,
  isRestRunning = false,
  onReturnToWorkout,
}) => {
  if (!isVisible) return null;

  const formatStopwatch = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatRest = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  return (
    <div
      onClick={onReturnToWorkout}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onReturnToWorkout();
        }
      }}
      aria-label="Active Workout Running. Click to return to Daily Log"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg cursor-pointer select-none group"
    >
      <div className="bg-[#1a1523]/95 hover:bg-[#201830] backdrop-blur-md border-2 border-[#bb86fc] rounded-[16px] p-3.5 shadow-[0_0_25px_rgba(187,134,252,0.45)] transition-all duration-300 transform group-hover:scale-[1.01] flex items-center justify-between gap-3">
        {/* Left: Stopwatch & Pulse */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#bb86fc] text-black flex items-center justify-center flex-shrink-0 shadow-md shadow-[#bb86fc]/40">
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#03dac6] animate-pulse flex-shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#03dac6]">
                Workout in Progress
              </span>
            </div>
            <div className="font-mono text-base sm:text-lg font-black text-white tracking-wide truncate">
              {formatStopwatch(stopwatchSeconds)}
            </div>
            <p className="text-[11px] text-zinc-300 truncate font-semibold">
              {currentExerciseName ? currentExerciseName : 'Active Session'}
            </p>
          </div>
        </div>

        {/* Center/Right: Rest Timer status & Return prompt */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {isRestRunning && restTimeLeft > 0 ? (
            <div className="px-2.5 py-1 rounded-lg bg-[#bb86fc]/20 border border-[#bb86fc]/60 text-[#bb86fc] flex items-center gap-1.5 animate-pulse">
              <Timer className="w-3.5 h-3.5" />
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold block leading-none">Rest</span>
                <span className="font-mono font-black text-xs leading-tight">
                  {formatRest(restTimeLeft)}
                </span>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 font-mono bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800">
              <Timer className="w-3 h-3 text-zinc-500" />
              <span>Rest Idle</span>
            </div>
          )}

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#bb86fc] to-[#03dac6] text-black font-extrabold text-xs shadow-md shadow-[#bb86fc]/20 group-hover:brightness-110 transition-all">
            <span>Resume</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[3] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
