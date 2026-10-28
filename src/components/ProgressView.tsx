import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  Award,
  Zap,
  Calendar,
  Filter,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { DailyWorkout } from '../types/workout.ts';

// Register Chart.js components
Chart.register(...registerables);

interface ProgressViewProps {
  dailyWorkouts: Record<string, DailyWorkout>;
}

export const ProgressView: React.FC<ProgressViewProps> = ({ dailyWorkouts }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Filter mode: 'ALL' (Total Daily Volume) or specific exercise
  const [selectedExerciseFilter, setSelectedExerciseFilter] = useState<string>('ALL');

  // Extract all distinct exercises ever logged across history
  const allLoggedExercises = useMemo(() => {
    const set = new Set<string>();
    Object.values(dailyWorkouts).forEach((w) => {
      w.weightliftingEntries.forEach((e) => set.add(e.exerciseName));
    });
    return Array.from(set).sort();
  }, [dailyWorkouts]);

  // Aggregate data points sorted by date
  const chartDataPoints = useMemo(() => {
    const dates = Object.keys(dailyWorkouts).sort((a, b) => a.localeCompare(b));

    const points: Array<{ date: string; volumeKg: number; workoutCount: number }> = [];

    dates.forEach((dateStr) => {
      const workout = dailyWorkouts[dateStr];
      if (!workout) return;

      let volume = 0;
      if (selectedExerciseFilter === 'ALL') {
        volume = workout.weightliftingEntries.reduce((sum, e) => sum + e.volumeKg, 0);
      } else {
        volume = workout.weightliftingEntries
          .filter((e) => e.exerciseName === selectedExerciseFilter)
          .reduce((sum, e) => sum + e.volumeKg, 0);
      }

      // Only include dates where there is workout activity
      if (
        (selectedExerciseFilter === 'ALL' &&
          (workout.weightliftingEntries.length > 0 || workout.cardioEntries.length > 0)) ||
        (selectedExerciseFilter !== 'ALL' && volume > 0)
      ) {
        points.push({
          date: dateStr,
          volumeKg: Math.round(volume),
          workoutCount: workout.weightliftingEntries.length,
        });
      }
    });

    return points;
  }, [dailyWorkouts, selectedExerciseFilter]);

  // Calculate high-level summary metrics
  const totalVolumeAllTime = useMemo(() => {
    return chartDataPoints.reduce((acc, p) => acc + p.volumeKg, 0);
  }, [chartDataPoints]);

  const maxVolumeDay = useMemo(() => {
    if (chartDataPoints.length === 0) return null;
    return [...chartDataPoints].sort((a, b) => b.volumeKg - a.volumeKg)[0];
  }, [chartDataPoints]);

  const avgVolumePerSession = useMemo(() => {
    if (chartDataPoints.length === 0) return 0;
    return Math.round(totalVolumeAllTime / chartDataPoints.length);
  }, [chartDataPoints, totalVolumeAllTime]);

  // Render Chart.js line chart
  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Create purple to dark gradient for line area fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(187, 134, 252, 0.35)');
    gradient.addColorStop(0.7, 'rgba(187, 134, 252, 0.05)');
    gradient.addColorStop(1, 'rgba(18, 18, 18, 0)');

    const labels = chartDataPoints.map((p) => p.date);
    const dataValues = chartDataPoints.map((p) => p.volumeKg);

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [
          {
            label:
              selectedExerciseFilter === 'ALL'
                ? 'Total Daily Volume (kg)'
                : `${selectedExerciseFilter} Volume (kg)`,
            data: dataValues.length > 0 ? dataValues : [0],
            borderColor: '#bb86fc',
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#03dac6',
            pointBorderColor: '#121212',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#03dac6',
            pointHoverBorderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#1e1e1e',
            titleColor: '#ffffff',
            titleFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 13,
              weight: 'bold',
            },
            bodyColor: '#bb86fc',
            bodyFont: {
              family: "'JetBrains Mono', monospace",
              size: 14,
              weight: 'bold',
            },
            borderColor: '#3f3f46',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const val = context.parsed.y ?? 0;
                return `Volume: ${val.toLocaleString()} kg`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
            },
            ticks: {
              color: '#a1a1aa',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
              },
              maxRotation: 45,
              minRotation: 0,
            },
            title: {
              display: true,
              text: 'Date',
              color: '#71717a',
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 12,
                weight: 'bold',
              },
            },
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.07)',
            },
            ticks: {
              color: '#a1a1aa',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
              },
              callback: (value) => `${Number(value).toLocaleString()} kg`,
            },
            title: {
              display: true,
              text: 'Total Daily Volume (kg)',
              color: '#71717a',
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 12,
                weight: 'bold',
              },
            },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartDataPoints, selectedExerciseFilter]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-[#bb86fc]/20 to-[#03dac6]/20 text-[#bb86fc]">
              <LineChartIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Progressive Overload Analytics
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                Tracking Total Daily Volume (kg) vs Date across your workout history
              </p>
            </div>
          </div>

          {/* Exercise Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <label htmlFor="filter-exercise" className="sr-only">
              Filter by Exercise
            </label>
            <select
              id="filter-exercise"
              value={selectedExerciseFilter}
              onChange={(e) => setSelectedExerciseFilter(e.target.value)}
              className="bg-[#121212] text-xs font-semibold text-zinc-200 border border-zinc-700 rounded-lg px-3 py-2 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Filter Progressive Overload by Exercise"
            >
              <option value="ALL">All Exercises (Total Volume)</option>
              {allLoggedExercises.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Analytics KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-zinc-800">
          {/* Total Cumulative Volume */}
          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800/90">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#bb86fc]" /> Total Volume Lifted
            </span>
            <p className="font-mono text-2xl font-extrabold text-white mt-1">
              {totalVolumeAllTime.toLocaleString()}{' '}
              <span className="text-xs font-sans text-zinc-400">kg</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Cumulative overload across {chartDataPoints.length} logged sessions
            </p>
          </div>

          {/* Average Session Volume */}
          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800/90">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#03dac6]" /> Avg Volume / Session
            </span>
            <p className="font-mono text-2xl font-extrabold text-[#03dac6] mt-1">
              {avgVolumePerSession.toLocaleString()}{' '}
              <span className="text-xs font-sans text-zinc-400">kg</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Consistent working volume per day</p>
          </div>

          {/* Peak Volume Record */}
          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800/90">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Peak Volume Day
            </span>
            <p className="font-mono text-2xl font-extrabold text-amber-300 mt-1">
              {maxVolumeDay ? `${maxVolumeDay.volumeKg.toLocaleString()} kg` : '0 kg'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {maxVolumeDay ? `Achieved on ${maxVolumeDay.date}` : 'Log more sessions'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart.js Line Chart Card */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#bb86fc]" />
              <span>Progressive Overload Curve</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Y-Axis: Total Daily Volume (kg) • X-Axis: Date
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#bb86fc] rounded" />
              <span className="text-zinc-300">Volume (kg)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#03dac6]" />
              <span className="text-zinc-300">Workout Date</span>
            </div>
          </div>
        </div>

        {/* Canvas container with guaranteed responsive height */}
        <div className="w-full h-[320px] sm:h-[380px] relative">
          {chartDataPoints.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <LineChartIcon className="w-10 h-10 mb-2 opacity-40 text-zinc-600" />
              <p className="text-sm">No workout volume recorded yet.</p>
              <p className="text-xs text-zinc-600 mt-1">Log exercises in the Daily Log to view your trend curve.</p>
            </div>
          ) : (
            <canvas ref={canvasRef} aria-label="Progressive Overload Chart" />
          )}
        </div>
      </div>

      {/* Progressive Overload Formula & Rules Reference Guide */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-[#03dac6]" />
          <span>Progressive Overload Rules & Formulas</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-300">
          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800 space-y-1">
            <span className="font-bold text-[#bb86fc] block">Double Progression Rule</span>
            <p className="text-zinc-400 leading-relaxed">
              Target 12 reps on all sets. Once achieved, bump load by +2.5 kg and repeat cycle from 8 reps.
            </p>
          </div>
          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800 space-y-1">
            <span className="font-bold text-[#03dac6] block">Total Volume Equation</span>
            <p className="text-zinc-400 leading-relaxed font-mono">
              Volume = Sets × Reps × Weight × (Unilateral ? 2 : 1)
            </p>
          </div>
          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800 space-y-1">
            <span className="font-bold text-amber-300 block">Metabolic Caloric Formula</span>
            <p className="text-zinc-400 leading-relaxed font-mono">
              6.0 METs × Weight (kg) × (Duration / 60)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
