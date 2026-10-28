import React, { useState, useEffect } from 'react';
import { Clock, Calendar as CalendarIcon, CheckCircle2, ChevronRight, X, Sparkles, Dumbbell } from 'lucide-react';
import { DAY_OF_WEEK_SPLITS, DailyWorkout } from '../types/workout.ts';
import { formatDateKey } from '../utils/storage.ts';

interface QuickActionModalProps {
  todayWorkout?: DailyWorkout;
  onOpenDailyLogForDate: (date: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  todayWorkout,
  onOpenDailyLogForDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = formatDateKey(currentTime);
  const dayOfWeekIndex = currentTime.getDay();
  const dayName = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const dateFormatted = currentTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const scheduledSplit = DAY_OF_WEEK_SPLITS[dayOfWeekIndex] || 'Push';
  const hasExercisesLogged =
    todayWorkout &&
    (todayWorkout.weightliftingEntries.length > 0 || todayWorkout.cardioEntries.length > 0);

  const totalExercises =
    (todayWorkout?.weightliftingEntries.length || 0) + (todayWorkout?.cardioEntries.length || 0);

  return (
    <>
      {/* Quick-action outline button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-3.5 rounded-[12px] border border-[#bb86fc]/40 hover:border-[#bb86fc] bg-[#1e1e1e] hover:bg-[#bb86fc]/10 text-left transition-all duration-200 group shadow-sm"
        aria-label="Today's Schedule & Routine Status"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#bb86fc]/20 text-[#bb86fc] group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {dayName} • {timeFormatted}
              </span>
              {hasExercisesLogged ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#03dac6]/20 text-[#03dac6]">
                  Active Routine
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                  Ready to Train
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <span>Today's Split:</span>
              <span className="text-[#03dac6] font-extrabold">{todayWorkout?.split || scheduledSplit}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#bb86fc]">
          <span className="hidden sm:inline">View Details</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* Detail Modal / Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-[#1e1e1e] border border-zinc-800 rounded-[12px] p-5 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-routine-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#bb86fc]" />
                <h3 id="quick-routine-title" className="text-base font-bold text-white">
                  Today's Live Routine & Time
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Clock Card */}
            <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Current Time</p>
                <p className="font-mono text-2xl font-black text-[#03dac6] mt-0.5">{timeFormatted}</p>
                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5" /> {dayName}, {dateFormatted}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Assigned Split</p>
                <span className="inline-block mt-1 px-3 py-1 bg-[#bb86fc]/20 text-[#bb86fc] font-bold rounded-lg text-sm">
                  {todayWorkout?.split || scheduledSplit}
                </span>
              </div>
            </div>

            {/* Routine Status */}
            <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Saved Routine for Today:</span>
                {hasExercisesLogged ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[#03dac6] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {totalExercises} Exercise{totalExercises > 1 ? 's' : ''} Logged
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 font-medium">No sets logged yet today</span>
                )}
              </div>

              {hasExercisesLogged ? (
                <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {todayWorkout?.weightliftingEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="text-xs p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                    >
                      <span className="font-medium text-zinc-200">{entry.exerciseName}</span>
                      <span className="font-mono text-zinc-400">
                        {entry.sets}×{entry.reps} @ {entry.weightKg}kg
                      </span>
                    </div>
                  ))}
                  {todayWorkout?.cardioEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="text-xs p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                    >
                      <span className="font-medium text-zinc-200">{entry.cardioType}</span>
                      <span className="font-mono text-zinc-400">
                        {entry.durationMins}m @ {entry.speedKmh}km/h
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  Target muscle group: <strong className="text-white">{scheduledSplit}</strong>. Open the daily log to record sets, reps, weight, and cardio.
                </p>
              )}
            </div>

            {/* Action button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenDailyLogForDate(todayKey);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[12px] bg-[#bb86fc] text-black font-bold text-sm hover:bg-[#c99eff] transition-all shadow-md shadow-[#bb86fc]/20"
              >
                <Dumbbell className="w-4 h-4" />
                <span>Go to Today's Daily Log ({todayKey})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
