import React from 'react';
import { Clock, Dumbbell, Timer as TimerIcon, ChevronUp, Sparkles } from 'lucide-react';

interface FloatingActiveWorkoutDockProps {
  isVisible: boolean;
  stopwatchSeconds: number;
  currentExerciseName: string;
  restTimerSeconds?: number;
  isRestTimerRunning?: boolean;
  onReturnToWorkout: () => void;
}

export const FloatingActiveWorkoutDock: React.FC<FloatingActiveWorkoutDockProps> = ({
  isVisible,
  stopwatchSeconds,
  currentExerciseName,
  restTimerSeconds = 0,
  isRestTimerRunning = false,
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
    return `${mins}:${String(remainder).padStart(2, '0')}`;
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
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg cursor-pointer select-none transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] focus:outline-none"
      aria-label="Active Workout Running. Click to return to workout session."
    >
      <div className="bg-[#1a1524]/95 backdrop-blur-xl border-2 border-[#bb86fc]/60 rounded-[16px] p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(187,134,252,0.35)] flex items-center justify-between gap-3 text-white">
        {/* Left: Stopwatch & Live status */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#bb86fc] text-black shadow-md shadow-[#bb86fc]/40 flex items-center justify-center animate-pulse">
            <Clock className="w-5 h-5 fill-black stroke-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#03dac6] animate-ping" />
              <span className="text-[10px] uppercase font-extrabold text-[#03dac6] tracking-wider">
                Workout Active
              </span>
            </div>
            <div className="font-mono text-lg sm:text-xl font-black text-white tracking-wider">
              {formatStopwatch(stopwatchSeconds)}
            </div>
          </div>
        </div>

        {/* Center: Current Exercise & Rest Timer Indicator */}
        <div className="flex-1 min-w-0 px-2 text-left hidden sm:block">
          <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1 truncate">
            <Dumbbell className="w-3 h-3 text-[#bb86fc]" />
            <span className="truncate">{currentExerciseName || 'Active Session'}</span>
          </div>

          {isRestTimerRunning && restTimerSeconds > 0 ? (
            <div className="inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full bg-[#bb86fc]/20 text-[#bb86fc] border border-[#bb86fc]/40 text-xs font-mono font-bold animate-pulse">
              <TimerIcon className="w-3 h-3" />
              <span>Rest: {formatRest(restTimerSeconds)}</span>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-500 font-mono">Rest idle</span>
          )}
        </div>

        {/* Right: Return CTA Button */}
        <div className="flex items-center gap-2">
          {isRestTimerRunning && restTimerSeconds > 0 && (
            <div className="sm:hidden px-2 py-0.5 rounded-full bg-[#bb86fc]/20 text-[#bb86fc] border border-[#bb86fc]/40 text-[10px] font-mono font-bold">
              {formatRest(restTimerSeconds)}
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#bb86fc] to-[#03dac6] text-black font-extrabold text-xs shadow-md">
            <span>Resume</span>
            <ChevronUp className="w-4 h-4 stroke-[3]" />
          </div>
        </div>
      </div>
    </div>
  );
};
