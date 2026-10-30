import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Timer as TimerIcon, Sparkles } from 'lucide-react';
import { playTimerTick, playTimerWhoosh, playTimerBeep } from '../utils/audio.ts';

interface RestTimerProps {
  onFinish?: () => void;
  autoStartTrigger?: number;
  presetDuration?: number; // Exercise-specific rest timer preset
  onTick?: (timeLeft: number, isRunning: boolean) => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  onFinish,
  autoStartTrigger,
  presetDuration,
  onTick,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(presetDuration || 90);
  const [timeLeft, setTimeLeft] = useState<number>(presetDuration || 90);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with exercise-specific presetDuration when switching exercises
  const prevPresetRef = useRef<number | undefined>(presetDuration);
  useEffect(() => {
    if (presetDuration && presetDuration > 0 && presetDuration !== prevPresetRef.current) {
      prevPresetRef.current = presetDuration;
      setSelectedDuration(presetDuration);
      if (!isRunning) {
        setTimeLeft(presetDuration);
        setHasStarted(false);
      }
    }
  }, [presetDuration, isRunning]);

  // Auto-start when autoStartTrigger prop increments (e.g. set logged)
  const prevTriggerRef = useRef<number | undefined>(autoStartTrigger);
  useEffect(() => {
    if (autoStartTrigger !== undefined && autoStartTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = autoStartTrigger;
      if (autoStartTrigger > 0) {
        setTimeLeft(selectedDuration);
        setHasStarted(true);
        setIsRunning(true);
        if (soundEnabled) {
          playTimerTick();
        }
      }
    }
  }, [autoStartTrigger, selectedDuration, soundEnabled]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          // 1. Subtle, continuous 'tick' sound on each second
          if (soundEnabled && next > 0) {
            playTimerTick();
          }
          return next;
        });
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      setHasStarted(false);
      // 3. Distinct, loud 'beep' sound when reaching zero
      if (soundEnabled) {
        playTimerBeep();
      }
      if (onFinish) onFinish();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, timeLeft, soundEnabled, onFinish]);

  useEffect(() => {
    if (onTick) {
      onTick(timeLeft, isRunning);
    }
  }, [timeLeft, isRunning, onTick]);

  const handleStart = () => {
    if (!hasStarted) {
      setTimeLeft(selectedDuration);
      setHasStarted(true);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    // 2. 'Whoosh' sound when manually paused
    if (soundEnabled) {
      playTimerWhoosh();
    }
  };

  const handleReset = () => {
    const wasActive = isRunning || hasStarted;
    setIsRunning(false);
    setHasStarted(false);
    setTimeLeft(selectedDuration);
    // 2. 'Whoosh' sound when manually stopped / reset
    if (soundEnabled && wasActive) {
      playTimerWhoosh();
    }
  };

  const handleDurationChange = (newDuration: number) => {
    setSelectedDuration(newDuration);
    if (!isRunning) {
      setTimeLeft(newDuration);
      setHasStarted(false);
    }
  };

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / (selectedDuration || 1)) * 100));

  return (
    <div
      className={`sticky top-0 z-30 rounded-[14px] p-3.5 mb-6 transition-all duration-300 shadow-xl ${
        isRunning
          ? 'bg-gradient-to-r from-[#21142e] via-[#1a1226] to-[#21142e] border-2 border-[#bb86fc] shadow-[0_0_30px_rgba(187,134,252,0.4)] ring-2 ring-[#bb86fc]/40'
          : 'bg-[#1e1e1e]/95 backdrop-blur-md border border-zinc-800/80 shadow-black/40'
      }`}
      aria-label="Universal Rest Timer"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl transition-all ${
              isRunning
                ? 'bg-[#bb86fc] text-black shadow-lg shadow-[#bb86fc]/40 animate-pulse'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            <TimerIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Universal Rest Timer
              </span>
              {isRunning ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#bb86fc] text-black shadow-md shadow-[#bb86fc]/30 animate-pulse">
                  <Sparkles className="w-3 h-3 fill-black text-black" />
                  REST ACTIVE
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono">Idle</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-2xl sm:text-3xl font-black tracking-tight transition-colors ${
                  isRunning ? 'text-[#bb86fc] drop-shadow-[0_0_12px_rgba(187,134,252,0.5)]' : 'text-white'
                }`}
              >
                {formattedTime}
              </span>
              {timeLeft === 0 && (
                <span className="text-xs text-[#03dac6] font-sans font-extrabold animate-bounce bg-[#03dac6]/20 px-2 py-0.5 rounded border border-[#03dac6]/40">
                  Rest Finished!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Duration Dropdown & Audio controls */}
        <div className="flex items-center gap-2">
          <label htmlFor="rest-duration" className="sr-only">
            Rest Duration
          </label>
          <select
            id="rest-duration"
            value={selectedDuration}
            disabled={isRunning}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
            className={`text-sm font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors disabled:opacity-60 ${
              isRunning
                ? 'bg-zinc-900/90 text-[#bb86fc] border border-[#bb86fc]/50'
                : 'bg-[#121212] text-zinc-200 border border-zinc-700 focus:border-[#bb86fc]'
            }`}
            aria-label="Select Rest Duration"
          >
            <option value={45}>45s (Quick Circuit)</option>
            <option value={60}>60s (Hypertrophy)</option>
            <option value={90}>90s (Standard)</option>
            <option value={120}>120s (Strength)</option>
            <option value={180}>180s (Compound Heavy)</option>
            <option value={240}>240s (Powerlifting)</option>
          </select>

          {/* Sound Toggle Button (Ticks, Whoosh, Beep) */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-zinc-800 text-[#03dac6] border-[#03dac6]/40 hover:bg-zinc-700'
                : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'
            }`}
            title={soundEnabled ? 'Audio Active (Ticks, Whoosh, Beep)' : 'Audio Muted'}
            aria-label={soundEnabled ? 'Mute timer audio' : 'Unmute timer audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#bb86fc] text-black font-extrabold text-sm hover:bg-[#c99eff] active:scale-95 transition-all shadow-md shadow-[#bb86fc]/30"
              aria-label="Start Timer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{hasStarted ? 'Resume' : 'Start'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold text-sm hover:bg-amber-500/30 active:scale-95 transition-all shadow-sm"
              aria-label="Pause Timer"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white active:scale-95 transition-all"
            title="Reset / Stop Timer"
            aria-label="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar with glowing highlight when running */}
      <div className="w-full bg-zinc-800/90 h-1.5 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isRunning
              ? 'bg-gradient-to-r from-[#bb86fc] via-[#c99eff] to-[#03dac6] shadow-[0_0_12px_#bb86fc]'
              : 'bg-gradient-to-r from-[#bb86fc] to-[#03dac6]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
