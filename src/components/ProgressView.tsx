import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  Award,
  Zap,
  Calendar,
  Filter,
  Flame,
  ArrowUpRight,
  Scale,
  Dumbbell,
  Percent,
  Activity,
  PlusCircle,
} from 'lucide-react';
import { DailyWorkout, AccuniqMetric } from '../types/workout.ts';
import { getAccuniqMetrics, parseDateKey } from '../utils/storage.ts';

// Register Chart.js components
Chart.register(...registerables);

type ChartViewTab = 'volume' | 'weight_trend';

interface ProgressViewProps {
  dailyWorkouts: Record<string, DailyWorkout>;
  accuniqMetrics?: AccuniqMetric[];
  onNavigateToAccuniq?: () => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  dailyWorkouts,
  accuniqMetrics,
  onNavigateToAccuniq,
}) => {
  const [activeTab, setActiveTab] = useState<ChartViewTab>('volume');

  // -------------------------------------------------------------
  // TAB 1: DAILY LIFTING VOLUME CHART (Chart.js)
  // -------------------------------------------------------------
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

  // Aggregate lifting data points sorted by date
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

  // High-level lifting volume summary metrics
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

  // Render Chart.js line chart for Volume
  useEffect(() => {
    if (activeTab !== 'volume') return;
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

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
  }, [chartDataPoints, selectedExerciseFilter, activeTab]);

  // -------------------------------------------------------------
  // TAB 2: ACCUNIQ BODY WEIGHT TREND CHART (Recharts)
  // -------------------------------------------------------------
  const metricsSource = accuniqMetrics || getAccuniqMetrics();

  // Chronologically sorted Accuniq scan records
  const weightTrendData = useMemo(() => {
    const sorted = [...metricsSource].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((record) => {
      const dateObj = parseDateKey(record.date);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const fullDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return {
        ...record,
        formattedDate,
        fullDate,
      };
    });
  }, [metricsSource]);

  // Dynamic Y-Axis Domain calculation for Weight Trend
  const weightDomain = useMemo(() => {
    if (weightTrendData.length === 0) return [60, 90];
    const weights = weightTrendData.map((d) => d.bodyWeightKg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return [Math.max(0, Math.floor(min - 2)), Math.ceil(max + 2)];
  }, [weightTrendData]);

  // Weight Trend KPI highlights
  const weightTrendKPIs = useMemo(() => {
    if (weightTrendData.length === 0) return null;
    const latest = weightTrendData[weightTrendData.length - 1];
    const initial = weightTrendData[0];
    const delta = Math.round((latest.bodyWeightKg - initial.bodyWeightKg) * 10) / 10;
    return {
      currentWeight: latest.bodyWeightKg,
      currentBodyFat: latest.bodyFatPercent,
      currentSMM: latest.skeletalMuscleMassKg,
      delta,
      totalScans: weightTrendData.length,
      latestDate: latest.formattedDate,
    };
  }, [weightTrendData]);

  // Custom Dark-Themed Recharts Tooltip
  const CustomWeightTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1e1e1e] border border-zinc-700/90 p-3.5 rounded-xl shadow-2xl space-y-2 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#03dac6]" />
            <span className="font-bold text-white text-xs">{data.fullDate}</span>
          </div>
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between gap-5">
              <span className="text-zinc-400 font-sans">Body Weight:</span>
              <span className="font-extrabold text-[#bb86fc] text-sm">
                {data.bodyWeightKg} kg
              </span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="text-zinc-400 font-sans">Body Fat %:</span>
              <span className="font-bold text-[#03dac6]">
                {data.bodyFatPercent}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="text-zinc-400 font-sans">Skeletal Muscle (SMM):</span>
              <span className="font-bold text-amber-300">
                {data.skeletalMuscleMassKg} kg
              </span>
            </div>
            {data.bmi && (
              <div className="flex items-center justify-between gap-5 pt-1.5 border-t border-zinc-800/80 text-[11px]">
                <span className="text-zinc-500 font-sans">BMI / BMR:</span>
                <span className="text-zinc-300">
                  {data.bmi} • {data.bmr ? `${data.bmr} kcal` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Primary Header */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-[#bb86fc]/20 to-[#03dac6]/20 text-[#bb86fc]">
              <LineChartIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Progress & Overload Analytics
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                Multi-metric performance tracking: lifting volume curves and Accuniq body weight trends.
              </p>
            </div>
          </div>
        </div>

        {/* Chart View Segmented Switcher (Requirement 1: Controls) */}
        <div className="mt-5 pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-[#121212] p-1 border border-zinc-800 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('volume')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'volume'
                  ? 'bg-[#bb86fc] text-black shadow-md shadow-[#bb86fc]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              aria-label="Daily Lifting Volume Chart Tab"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Daily Lifting Volume Chart</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('weight_trend')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'weight_trend'
                  ? 'bg-gradient-to-r from-[#bb86fc] to-[#03dac6] text-black shadow-md shadow-[#03dac6]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              aria-label="Accuniq Body Weight Trend Chart Tab"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Accuniq Body Weight Trend Chart</span>
            </button>
          </div>

          {/* Contextual Filter for Volume Tab */}
          {activeTab === 'volume' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <label htmlFor="filter-exercise" className="sr-only">
                Filter by Exercise
              </label>
              <select
                id="filter-exercise"
                value={selectedExerciseFilter}
                onChange={(e) => setSelectedExerciseFilter(e.target.value)}
                className="bg-[#121212] text-xs font-semibold text-zinc-200 border border-zinc-700 rounded-lg px-3 py-1.5 focus:border-[#bb86fc] focus:outline-none"
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
          )}
        </div>

        {/* Contextual KPIs: Lifting Volume Mode */}
        {activeTab === 'volume' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800/60 animate-fade-in">
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
        )}

        {/* Contextual KPIs: Accuniq Weight Trend Mode */}
        {activeTab === 'weight_trend' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800/60 animate-fade-in">
            <div className="bg-[#121212] p-3.5 rounded-[12px] border border-zinc-800/90">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#bb86fc]" /> Current Weight
              </span>
              <p className="font-mono text-xl sm:text-2xl font-black text-white mt-1">
                {weightTrendKPIs ? `${weightTrendKPIs.currentWeight} kg` : '—'}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">
                {weightTrendKPIs?.latestDate ? `Latest: ${weightTrendKPIs.latestDate}` : 'No scans yet'}
              </span>
            </div>

            <div className="bg-[#121212] p-3.5 rounded-[12px] border border-zinc-800/90">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#03dac6]" /> Net Weight Delta
              </span>
              <p className="font-mono text-xl sm:text-2xl font-black text-[#03dac6] mt-1">
                {weightTrendKPIs
                  ? `${weightTrendKPIs.delta > 0 ? '+' : ''}${weightTrendKPIs.delta} kg`
                  : '—'}
              </p>
              <span className="text-[10px] text-zinc-500">Since first baseline scan</span>
            </div>

            <div className="bg-[#121212] p-3.5 rounded-[12px] border border-zinc-800/90">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#03dac6]" /> Current Body Fat
              </span>
              <p className="font-mono text-xl sm:text-2xl font-black text-[#03dac6] mt-1">
                {weightTrendKPIs ? `${weightTrendKPIs.currentBodyFat}%` : '—'}
              </p>
              <span className="text-[10px] text-zinc-500">Body composition</span>
            </div>

            <div className="bg-[#121212] p-3.5 rounded-[12px] border border-zinc-800/90">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Skeletal Muscle
              </span>
              <p className="font-mono text-xl sm:text-2xl font-black text-amber-300 mt-1">
                {weightTrendKPIs ? `${weightTrendKPIs.currentSMM} kg` : '—'}
              </p>
              <span className="text-[10px] text-zinc-500">Active lean mass</span>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------- */}
      {/* TAB 1 CONTENT: Daily Lifting Volume Chart (Chart.js)      */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'volume' && (
        <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4 animate-fade-in">
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

          <div className="w-full h-[320px] sm:h-[380px] relative">
            {chartDataPoints.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <LineChartIcon className="w-10 h-10 mb-2 opacity-40 text-zinc-600" />
                <p className="text-sm">No workout volume recorded yet.</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Log exercises in the Daily Log to view your trend curve.
                </p>
              </div>
            ) : (
              <canvas ref={canvasRef} aria-label="Progressive Overload Chart" />
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* TAB 2 CONTENT: Accuniq Body Weight Trend Chart (Recharts)  */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'weight_trend' && (
        <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#bb86fc]" />
                <span>Accuniq Body Weight Trend & Body Composition</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Y-Axis: Body Weight (kg) [Dynamic domain] • X-Axis: Chronological Scan Dates
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#bb86fc] rounded" />
                <span className="text-zinc-300">Weight Trend Line</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#03dac6]" />
                <span className="text-zinc-300">Scan Data Points</span>
              </div>
            </div>
          </div>

          {weightTrendData.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                <Scale className="w-10 h-10" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-base font-bold text-white">No Accuniq Body Scans Recorded Yet</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Log your body weight, body fat %, and skeletal muscle mass scans in the Accuniq tab to populate this interactive trend chart.
                </p>
              </div>
              {onNavigateToAccuniq && (
                <button
                  type="button"
                  onClick={onNavigateToAccuniq}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#bb86fc] to-[#03dac6] text-black font-extrabold text-xs shadow-md shadow-[#bb86fc]/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Open Accuniq Scanner</span>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full h-[340px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={weightTrendData}
                  margin={{ top: 20, right: 25, left: 0, bottom: 20 }}
                >
                  <defs>
                    {/* Glowing primary purple semi-transparent area fill */}
                    <linearGradient id="weightTrendGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#bb86fc" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#bb86fc" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#121212" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#27272a"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  {/* X-Axis: Chronologically sorted scan dates */}
                  <XAxis
                    dataKey="formattedDate"
                    stroke="#71717a"
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                    tickLine={{ stroke: '#3f3f46' }}
                    axisLine={{ stroke: '#3f3f46' }}
                  />

                  {/* Y-Axis: Dynamic domain scaled to min/max recorded values */}
                  <YAxis
                    domain={weightDomain}
                    stroke="#71717a"
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                    tickLine={{ stroke: '#3f3f46' }}
                    axisLine={{ stroke: '#3f3f46' }}
                    unit=" kg"
                  />

                  {/* Interactive Custom Dark Tooltip */}
                  <Tooltip content={<CustomWeightTooltip />} />

                  {/* Weight Trend Curve Line with Glowing Area & Teal Data Points */}
                  <Area
                    type="monotone"
                    dataKey="bodyWeightKg"
                    stroke="#bb86fc"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#weightTrendGlow)"
                    dot={{
                      r: 5,
                      fill: '#03dac6',
                      stroke: '#121212',
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 7,
                      fill: '#03dac6',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                      className: 'drop-shadow-[0_0_10px_#03dac6]',
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

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
