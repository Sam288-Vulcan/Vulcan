import React from 'react';
import {
  X,
  History,
  TrendingUp,
  Trophy,
  Dumbbell,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DailyWorkout } from '../types/workout.ts';
import { getExerciseHistorySessions } from '../utils/storage.ts';
import { calculateHistoricalExercisePR } from '../utils/calculations.ts';

interface ExerciseHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  allWorkouts: Record<string, DailyWorkout>;
}

export const ExerciseHistoryDrawer: React.FC<ExerciseHistoryDrawerProps> = ({
  isOpen,
  onClose,
  exerciseName,
  allWorkouts,
}) => {
  if (!isOpen || !exerciseName) return null;

  // Retrieve last 5 sessions
  const lastSessions = getExerciseHistorySessions(exerciseName, allWorkouts, 5);

  // Compute all-time PR stats
  const prStats = calculateHistoricalExercisePR(exerciseName, allWorkouts);

  // Prepare chart data (chronological order: oldest to newest)
  const chartData = [...lastSessions]
    .reverse()
    .map((item) => {
      const [y, m, d] = item.date.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const shortDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return {
        date: shortDate,
        fullDate: item.date,
        est1RM: item.estimated1RM,
        weightKg: item.entry.weightKg,
        reps: item.entry.reps,
      };
    });

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm animate-fade-in flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-lg bg-[#181818] border-l border-zinc-800 text-zinc-100 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-[#1e1e1e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#bb86fc]/20 text-[#bb86fc]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Exercise History & 1RM Progression
              </span>
              <h3 id="drawer-title" className="text-lg font-black text-white flex items-center gap-2">
                <span>{exerciseName}</span>
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close Exercise History Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* All-Time Best Card */}
          <div className="grid grid-cols-3 gap-2.5 bg-[#121212] p-3.5 rounded-[12px] border border-zinc-800">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                All-Time 1RM
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-[#bb86fc] mt-0.5 block">
                {prStats.max1RM > 0 ? `${prStats.max1RM} kg` : '—'}
              </span>
              <span className="text-[10px] text-zinc-500">Epley formula</span>
            </div>

            <div className="text-center border-x border-zinc-800 px-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                Max Weight
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-[#03dac6] mt-0.5 block">
                {prStats.maxWeightKg > 0 ? `${prStats.maxWeightKg} kg` : '—'}
              </span>
              <span className="text-[10px] text-zinc-500">Heaviest</span>
            </div>

            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                Max Reps
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-white mt-0.5 block">
                {prStats.maxReps > 0 ? `${prStats.maxReps} reps` : '—'}
              </span>
              <span className="text-[10px] text-zinc-500">Single set</span>
            </div>
          </div>

          {/* 1RM Progression Chart */}
          <div className="bg-[#1e1e1e] p-4 rounded-[12px] border border-zinc-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#bb86fc]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Estimated 1RM Trend
                </h4>
              </div>
              <span className="text-[10px] font-mono text-[#03dac6] bg-[#03dac6]/10 px-2 py-0.5 rounded border border-[#03dac6]/20">
                Progression Curve
              </span>
            </div>

            {chartData.length < 2 ? (
              <div className="h-36 flex flex-col items-center justify-center text-center p-4 bg-[#121212]/60 rounded-lg border border-dashed border-zinc-800 text-zinc-500 text-xs">
                <TrendingUp className="w-5 h-5 mb-1 opacity-40 text-zinc-500" />
                <p>Need at least 2 sessions to chart 1RM trend.</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Logged sessions will automatically plot your strength curve here.
                </p>
              </div>
            ) : (
              <div className="h-44 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#3f3f46' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#3f3f46' }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                      unit="kg"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#121212] border border-[#bb86fc]/60 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-bold text-white">{data.fullDate}</p>
                              <p className="text-[#bb86fc] font-mono font-bold">
                                Est. 1RM: {data.est1RM} kg
                              </p>
                              <p className="text-zinc-400 font-mono text-[11px]">
                                {data.weightKg} kg × {data.reps} reps
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="est1RM"
                      stroke="#bb86fc"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#03dac6', stroke: '#121212', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#bb86fc', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Last 5 Sessions Detailed Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Last 5 Recorded Sessions</span>
              <span className="text-[10px] font-mono text-zinc-500">
                {lastSessions.length} available
              </span>
            </h4>

            {lastSessions.length === 0 ? (
              <div className="p-6 text-center bg-[#121212]/50 rounded-[12px] border border-dashed border-zinc-800 text-zinc-500 text-xs">
                <Dumbbell className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <p>No previous history recorded for {exerciseName}.</p>
                <p className="text-zinc-600 text-[11px] mt-0.5">
                  Complete today's session to initiate your progressive overload tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lastSessions.map((session, sIdx) => {
                  const entry = session.entry;
                  return (
                    <div
                      key={`${session.date}-${sIdx}`}
                      className="p-3.5 rounded-[12px] bg-[#1e1e1e] border border-zinc-800 hover:border-zinc-700 transition-all space-y-2.5"
                    >
                      {/* Session Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#bb86fc]/15 text-[#bb86fc] border border-[#bb86fc]/30">
                            {session.date}
                          </span>
                          {sIdx === 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-[#03dac6]/20 text-[#03dac6]">
                              Most Recent
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-mono font-bold text-[#bb86fc]">
                            Est. 1RM: {session.estimated1RM} kg
                          </span>
                        </div>
                      </div>

                      {/* Sets list */}
                      {entry.setRecords && entry.setRecords.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {entry.setRecords.map((set) => {
                            const badgeColor =
                              set.setType === 'W'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : set.setType === 'D'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : set.setType === 'F'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700';

                            const typeLabel =
                              set.setType === 'W'
                                ? 'Warm'
                                : set.setType === 'D'
                                ? 'Drop'
                                : set.setType === 'F'
                                ? 'Fail'
                                : 'Work';

                            return (
                              <div
                                key={set.setNumber}
                                className="p-1.5 rounded-lg bg-[#121212] border border-zinc-800/90 text-xs flex items-center justify-between"
                              >
                                <span className="font-mono text-zinc-400 text-[11px]">
                                  #{set.setNumber}
                                </span>
                                <span className="font-mono font-bold text-white text-[11px]">
                                  {set.weightKg}k × {set.reps}
                                </span>
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded font-bold border ${badgeColor}`}
                                >
                                  {typeLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-zinc-300 bg-[#121212] p-2 rounded-lg border border-zinc-800 flex items-center justify-between">
                          <span>
                            {entry.sets} sets × {entry.reps} reps @ {entry.weightKg} kg
                          </span>
                          <span className="text-[#03dac6] font-bold">
                            {entry.volumeKg.toLocaleString()} kg volume
                          </span>
                        </div>
                      )}

                      {/* Notes if any */}
                      {entry.notes && (
                        <p className="text-[11px] text-zinc-400 italic bg-zinc-900/90 p-2 rounded border border-zinc-800/80">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#1e1e1e] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-all"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
