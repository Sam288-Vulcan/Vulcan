import React, { useState } from 'react';
import {
  X,
  Dumbbell,
  HeartPulse,
  Clock,
  Flame,
  Scale,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  FileText,
  ExternalLink,
  Award,
} from 'lucide-react';
import { DailyWorkout, UserProfile } from '../types/workout.ts';
import { parseDateKey } from '../utils/storage.ts';

interface DayWorkoutSummaryModalProps {
  isOpen: boolean;
  date: string;
  workout?: DailyWorkout | null;
  userProfile: UserProfile;
  onClose: () => void;
  onEditSession: (date: string) => void;
  onOpenDailyLog: (date: string) => void;
  onDeleteSession?: (date: string) => void;
}

export const DayWorkoutSummaryModal: React.FC<DayWorkoutSummaryModalProps> = ({
  isOpen,
  date,
  workout,
  userProfile,
  onClose,
  onEditSession,
  onOpenDailyLog,
  onDeleteSession,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  const dateObj = parseDateKey(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const hasWorkout =
    workout && (workout.weightliftingEntries.length > 0 || workout.cardioEntries.length > 0);

  const totalVolume = workout
    ? workout.weightliftingEntries.reduce((sum, e) => sum + e.volumeKg, 0)
    : 0;

  const liftingCalories = workout
    ? workout.weightliftingEntries.reduce((sum, e) => sum + e.caloriesBurned, 0)
    : 0;

  const cardioCalories = workout
    ? workout.cardioEntries.reduce((sum, e) => sum + e.caloriesBurned, 0)
    : 0;

  const totalCalories = liftingCalories + cardioCalories;

  const totalSets = workout
    ? workout.weightliftingEntries.reduce((sum, e) => sum + e.sets, 0)
    : 0;

  const sessionWeight =
    workout?.sessionBodyWeightKg || userProfile.bodyWeightKg || 75.0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-summary-title"
    >
      <div className="w-full max-w-2xl bg-[#1e1e1e] border border-zinc-800 rounded-[16px] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#bb86fc]/20 text-[#bb86fc] border border-[#bb86fc]/30">
                {workout?.split || 'Logged Session'}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {sessionWeight} kg Session Weight
              </span>
            </div>
            <h3 id="day-summary-title" className="text-xl sm:text-2xl font-black text-white mt-1">
              {formattedDate}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close summary modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!hasWorkout ? (
          <div className="text-center py-10 text-zinc-500 space-y-3">
            <Dumbbell className="w-10 h-10 mx-auto text-zinc-600 opacity-50" />
            <p className="text-sm">No workout recorded yet for {date}.</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDailyLog(date);
                }}
                className="px-4 py-2 bg-[#bb86fc] text-black font-bold text-xs rounded-lg hover:bg-[#c99eff]"
              >
                Start Workout Tracker
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditSession(date);
                }}
                className="px-4 py-2 bg-zinc-800 text-zinc-200 font-semibold text-xs rounded-lg hover:bg-zinc-700 border border-zinc-700"
              >
                Log Past Workout
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#121212] rounded-[12px] border border-zinc-800 text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Total Volume
                </span>
                <span className="text-lg font-black text-[#bb86fc] font-mono mt-0.5 block">
                  {totalVolume.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500">kg lifted</span>
              </div>

              <div className="p-3 bg-[#121212] rounded-[12px] border border-zinc-800 text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Energy Burned
                </span>
                <span className="text-lg font-black text-[#03dac6] font-mono mt-0.5 block">
                  {Math.round(totalCalories)}
                </span>
                <span className="text-[10px] text-zinc-500">kcal total</span>
              </div>

              <div className="p-3 bg-[#121212] rounded-[12px] border border-zinc-800 text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Sets Logged
                </span>
                <span className="text-lg font-black text-white font-mono mt-0.5 block">
                  {totalSets}
                </span>
                <span className="text-[10px] text-zinc-500">completed</span>
              </div>

              <div className="p-3 bg-[#121212] rounded-[12px] border border-zinc-800 text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Duration
                </span>
                <span className="text-lg font-black text-zinc-200 font-mono mt-0.5 block">
                  {workout?.durationMinutes
                    ? `${workout.durationMinutes}m`
                    : workout?.startTime && workout?.endTime
                    ? `${workout.startTime}-${workout.endTime}`
                    : `${workout?.weightliftingEntries.reduce((a, b) => a + (b.durationMins || 10), 0)}m`}
                </span>
                <span className="text-[10px] text-zinc-500">session time</span>
              </div>
            </div>

            {/* Exercise Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[#bb86fc]" />
                <span>Weightlifting Exercises ({workout?.weightliftingEntries.length || 0})</span>
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {workout?.weightliftingEntries.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-[12px] bg-[#141414] border border-zinc-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{e.exerciseName}</span>
                        {e.isUnilateral && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-normal">
                            Unilateral (×2)
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-400 font-mono text-[11px]">
                        {e.sets} sets × {e.reps} reps @ {e.weightKg} kg
                      </div>
                      {e.notes && (
                        <p className="text-[11px] text-zinc-400 italic bg-zinc-900/80 p-1.5 rounded border border-zinc-800">
                          {e.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right font-mono flex-shrink-0">
                      <span className="text-[#bb86fc] font-bold block">{e.volumeKg.toLocaleString()} kg</span>
                      <span className="text-[#03dac6] text-[10px]">{e.caloriesBurned} kcal</span>
                    </div>
                  </div>
                ))}

                {workout?.weightliftingEntries.length === 0 && (
                  <p className="text-xs text-zinc-500 italic">No weightlifting exercises logged.</p>
                )}
              </div>
            </div>

            {/* Cardio Breakdown */}
            {workout?.cardioEntries && workout.cardioEntries.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-[#03dac6]" />
                  <span>Cardio Activities ({workout.cardioEntries.length})</span>
                </h4>
                <div className="space-y-2">
                  {workout.cardioEntries.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-[12px] bg-[#141414] border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{c.cardioType}</span>
                        <div className="text-zinc-400 font-mono text-[11px] mt-0.5">
                          {c.durationMins}m @ {c.speedKmh} km/h • {c.inclinePercent}% incline
                        </div>
                      </div>
                      <span className="text-[#03dac6] font-mono font-bold">{c.caloriesBurned} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              {onDeleteSession && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 font-medium">Delete this workout?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteSession(date);
                        setShowDeleteConfirm(false);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Session</span>
                  </button>
                )
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditSession(date);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-[#bb86fc] text-black font-extrabold text-xs sm:text-sm hover:bg-[#c99eff] transition-all shadow-md shadow-[#bb86fc]/20"
                  aria-label="Edit Session"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Session</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDailyLog(date);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm transition-all"
                  aria-label="Open Daily Log Tracker"
                >
                  <ExternalLink className="w-4 h-4 text-[#03dac6]" />
                  <span>Open Daily Log</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
