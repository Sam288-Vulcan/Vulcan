import React, { useRef, useState } from 'react';
import {
  Download,
  Trophy,
  Flame,
  Clock,
  Dumbbell,
  Sparkles,
  Share2,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { DailyWorkout } from '../types/workout.ts';

interface WorkoutSummaryShareCardProps {
  dailyWorkout: DailyWorkout;
  userName: string;
  durationSeconds: number;
  totalVolumeKg: number;
  totalCalories: number;
  totalSets: number;
  prsAchieved?: string[];
}

export const WorkoutSummaryShareCard: React.FC<WorkoutSummaryShareCardProps> = ({
  dailyWorkout,
  userName,
  durationSeconds,
  totalVolumeKg,
  totalCalories,
  totalSets,
  prsAchieved = [],
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const formatStopwatch = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    setDownloadSuccess(false);

    try {
      // Use html-to-image to generate high-resolution PNG
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // High resolution for mobile retina displays
        backgroundColor: '#121212',
      });

      const downloadLink = document.createElement('a');
      downloadLink.download = `vulcan-workout-${dailyWorkout.date}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to export share card as PNG image', err);
      // Fallback: draw basic canvas if html-to-image throws
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 700;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#121212';
          ctx.fillRect(0, 0, 600, 700);
          ctx.fillStyle = '#bb86fc';
          ctx.font = 'bold 28px sans-serif';
          ctx.fillText('VULCAN - GYM TRACKER', 30, 50);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px sans-serif';
          ctx.fillText(`Workout Session: ${dailyWorkout.date} (${dailyWorkout.split})`, 30, 85);
          ctx.fillText(`Duration: ${formatStopwatch(durationSeconds)}`, 30, 130);
          ctx.fillText(`Total Volume: ${totalVolumeKg.toLocaleString()} kg`, 30, 160);
          ctx.fillText(`Sets Completed: ${totalSets}`, 30, 190);
          ctx.fillText(`Energy: ${Math.round(totalCalories)} kcal`, 30, 220);
          const fallbackUrl = canvas.toDataURL('image/png');
          const fallbackLink = document.createElement('a');
          fallbackLink.download = `vulcan-workout-${dailyWorkout.date}.png`;
          fallbackLink.href = fallbackUrl;
          fallbackLink.click();
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 4000);
        }
      } catch (canvasErr) {
        console.error('Canvas fallback export also failed', canvasErr);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Visual Share Card Container (Captured by html-to-image) */}
      <div
        ref={cardRef}
        id="vulcan-share-card"
        className="w-full bg-[#181818] border-2 border-zinc-800 rounded-[20px] p-6 sm:p-7 shadow-2xl relative overflow-hidden"
        style={{
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 35px rgba(187,134,252,0.12)',
        }}
      >
        {/* Subtle background glow accents */}
        <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-[#bb86fc]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 rounded-full bg-[#03dac6]/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/90 pb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#bb86fc]" />
              <h4 className="text-xl sm:text-2xl font-black tracking-wider text-white font-mono uppercase">
                VULCAN
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#03dac6]/20 text-[#03dac6] border border-[#03dac6]/30 uppercase tracking-widest">
                VERIFIED LOG
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium tracking-wide mt-0.5">
              Forging Peak Strength & Progressive Growth
            </p>
          </div>

          <div className="text-right">
            <span className="font-mono text-xs font-bold text-[#bb86fc] block">
              {dailyWorkout.date}
            </span>
            <span className="text-[11px] text-zinc-400 font-semibold">{dailyWorkout.split} Split</span>
          </div>
        </div>

        {/* PR Celebrations Banner inside Share Card if any */}
        {prsAchieved.length > 0 && (
          <div className="mt-4 p-3 rounded-[12px] bg-gradient-to-r from-amber-500/20 via-[#bb86fc]/20 to-amber-500/10 border border-amber-500/40 relative z-10">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0 animate-bounce" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Personal Records Broken ({prsAchieved.length})
              </span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {prsAchieved.map((pr, idx) => (
                <li key={idx} className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-amber-400">★</span>
                  <span>{pr}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4 Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 relative z-10">
          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">
              Time
            </span>
            <span className="font-mono text-base sm:text-lg font-black text-[#03dac6] mt-0.5 block">
              {formatStopwatch(durationSeconds)}
            </span>
            <span className="text-[9px] text-zinc-500">Duration</span>
          </div>

          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">
              Volume
            </span>
            <span className="font-mono text-base sm:text-lg font-black text-[#bb86fc] mt-0.5 block">
              {totalVolumeKg.toLocaleString()}
            </span>
            <span className="text-[9px] text-zinc-500">kg lifted</span>
          </div>

          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">
              Sets
            </span>
            <span className="font-mono text-base sm:text-lg font-black text-white mt-0.5 block">
              {totalSets}
            </span>
            <span className="text-[9px] text-zinc-500">Working sets</span>
          </div>

          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">
              Energy
            </span>
            <span className="font-mono text-base sm:text-lg font-black text-[#03dac6] mt-0.5 block">
              {Math.round(totalCalories)}
            </span>
            <span className="text-[9px] text-zinc-500">kcal burned</span>
          </div>
        </div>

        {/* Key Exercises Summary List */}
        <div className="mt-4 space-y-2 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
            Movement Highlights
          </span>
          <div className="space-y-1.5 max-h-40 overflow-hidden">
            {dailyWorkout.weightliftingEntries.slice(0, 4).map((entry) => (
              <div
                key={entry.id}
                className="p-2 rounded-lg bg-[#121212] border border-zinc-800/80 text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <Dumbbell className="w-3.5 h-3.5 text-[#bb86fc] flex-shrink-0" />
                  <span className="font-bold text-zinc-200 truncate">{entry.exerciseName}</span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                  <span className="text-white font-bold">{entry.sets}×{entry.reps}</span> @{' '}
                  <span className="text-[#03dac6] font-bold">{entry.weightKg}kg</span>
                </div>
              </div>
            ))}

            {dailyWorkout.cardioEntries.slice(0, 2).map((c) => (
              <div
                key={c.id}
                className="p-2 rounded-lg bg-[#121212] border border-zinc-800/80 text-xs flex items-center justify-between"
              >
                <span className="font-bold text-zinc-200">{c.cardioType}</span>
                <span className="font-mono text-[11px] text-[#03dac6] font-bold">
                  {c.durationMins}m @ {c.speedKmh} km/h
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card Footer Tagline */}
        <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 relative z-10">
          <span>Athlete: <strong className="text-zinc-300">{userName || 'Blesson'}</strong></span>
          <span className="font-mono text-[#bb86fc]">#ProgressiveOverload #Vulcan</span>
        </div>
      </div>

      {/* Export Action Button */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={isExporting}
          className="flex-1 py-3 px-4 rounded-[12px] bg-gradient-to-r from-[#bb86fc] to-[#03dac6] hover:brightness-110 active:scale-95 text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-[#bb86fc]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          aria-label="Download Workout Share Card PNG"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Generating High-Res PNG...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>Share Card Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download Share Card (PNG)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
