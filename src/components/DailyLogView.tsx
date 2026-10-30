import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Dumbbell,
  HeartPulse,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  Layers,
  Repeat,
  Scale,
  BookOpen,
  AlertCircle,
  ExternalLink,
  FileText,
  Play,
  CheckCircle2,
  Trophy,
  Flame,
  Check,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  Zap,
  History,
  Award,
} from 'lucide-react';
import {
  DailyWorkout,
  SplitType,
  WeightliftingEntry,
  CardioEntry,
  DAY_OF_WEEK_SPLITS,
  CustomExercise,
  UserProfile,
  SetType,
  SetRecord,
} from '../types/workout.ts';
import {
  calculateWeightliftingVolume,
  calculateWeightliftingCalories,
  calculateCardioCalories,
  predictProgressiveOverload,
  calculate1RM,
  calculateHistoricalExercisePR,
  evaluateSetPR,
  calculateAggregateSetsVolume,
} from '../utils/calculations.ts';
import {
  getLastSessionForExercise,
  parseDateKey,
} from '../utils/storage.ts';
import { RestTimer } from './RestTimer.tsx';
import { ExerciseHistoryDrawer } from './ExerciseHistoryDrawer.tsx';
import { WorkoutSummaryShareCard } from './WorkoutSummaryShareCard.tsx';

interface DailyLogViewProps {
  selectedDate: string;
  dailyWorkout: DailyWorkout;
  exerciseLibrary: CustomExercise[];
  userProfile: UserProfile;
  allWorkouts?: Record<string, DailyWorkout>;
  onSaveDailyWorkout: (workout: DailyWorkout) => void;
  onBackToCalendar: () => void;
  onNavigateToExerciseLibrary: () => void;
  onActiveSessionUpdate?: (state: {
    isActive: boolean;
    stopwatchSeconds: number;
    activeExerciseName: string;
    restTimeLeft: number;
    isRestRunning: boolean;
  }) => void;
}

// Active set tracking item with SetType and real-time PR badges
interface ActiveSetItem {
  setNumber: number;
  weightKg: number;
  reps: number;
  setType: SetType; // 'N': Normal, 'W': Warm-Up, 'D': Drop Set, 'F': Failure
  isCompleted: boolean;
  completedAt?: number;
  isPr?: boolean;
  badgeLabel?: string;
  estimated1RM?: number;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  selectedDate,
  dailyWorkout,
  exerciseLibrary,
  userProfile,
  allWorkouts = {},
  onSaveDailyWorkout,
  onBackToCalendar,
  onNavigateToExerciseLibrary,
  onActiveSessionUpdate,
}) => {
  // ----------------------------------------------------
  // WORKFLOW PHASES: 'setup' (Phase A) | 'active' (Phase B) | 'summary' (Phase C)
  // ----------------------------------------------------
  const [phase, setPhase] = useState<'setup' | 'active' | 'summary'>('setup');

  // Dynamic Session Body Weight (pre-filled from workout, profile, or 75kg default)
  const [sessionWeight, setSessionWeight] = useState<number>(() => {
    return dailyWorkout.sessionBodyWeightKg && dailyWorkout.sessionBodyWeightKg > 0
      ? dailyWorkout.sessionBodyWeightKg
      : userProfile.bodyWeightKg > 0
      ? userProfile.bodyWeightKg
      : 75.0;
  });

  // Keep state updated if dailyWorkout changes (e.g. date switch)
  useEffect(() => {
    if (dailyWorkout.sessionBodyWeightKg && dailyWorkout.sessionBodyWeightKg > 0) {
      setSessionWeight(dailyWorkout.sessionBodyWeightKg);
    } else if (userProfile.bodyWeightKg > 0) {
      setSessionWeight(userProfile.bodyWeightKg);
    }
  }, [dailyWorkout.date, dailyWorkout.sessionBodyWeightKg, userProfile.bodyWeightKg]);

  const handleSessionWeightChange = (newWeight: number) => {
    setSessionWeight(newWeight);
    onSaveDailyWorkout({
      ...dailyWorkout,
      sessionBodyWeightKg: newWeight,
    });
  };

  // Split selector: auto-select based on day of week if not set
  const dateObj = useMemo(() => parseDateKey(selectedDate), [selectedDate]);
  const dayOfWeekIndex = dateObj.getDay();
  const dayOfWeekName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const autoSplit = DAY_OF_WEEK_SPLITS[dayOfWeekIndex] || 'Push';

  const [activeSplit, setActiveSplit] = useState<SplitType>(dailyWorkout.split || autoSplit);

  // Available exercises ONLY from LocalStorage Exercise Library matching activeSplit
  const splitExercises = useMemo(() => {
    return exerciseLibrary.filter((e) => e.split === activeSplit);
  }, [exerciseLibrary, activeSplit]);

  // Update split in storage if user changes it
  const handleSplitChange = (newSplit: SplitType) => {
    setActiveSplit(newSplit);
    onSaveDailyWorkout({
      ...dailyWorkout,
      split: newSplit,
    });
  };

  // ----------------------------------------------------
  // GLOBAL WORKOUT STOPWATCH (Phase B Tracking)
  // ----------------------------------------------------
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    }
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [isStopwatchRunning]);

  const formatStopwatch = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // UNIVERSAL REST TIMER TRIGGER & REAL-TIME STATE
  // ----------------------------------------------------
  const [restTimerTrigger, setRestTimerTrigger] = useState<number>(0);
  const [restToast, setRestToast] = useState<string | null>(null);
  const [restTimerState, setRestTimerState] = useState<{ timeLeft: number; isRunning: boolean }>({
    timeLeft: 90,
    isRunning: false,
  });

  const triggerAutoRest = (msg?: string) => {
    setRestTimerTrigger(Date.now());
    if (msg) {
      setRestToast(msg);
      setTimeout(() => setRestToast(null), 3500);
    }
  };

  // ----------------------------------------------------
  // REAL-TIME PR CELEBRATIONS & HISTORY DRAWER STATE
  // ----------------------------------------------------
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [activeExercisePrGlow, setActiveExercisePrGlow] = useState<string | null>(null);
  const [prsAchievedThisSession, setPrsAchievedThisSession] = useState<string[]>([]);

  // ----------------------------------------------------
  // PHASE B ACTIVE EXERCISE STATE & AUTOMATIC DURATION TRACKING
  // ----------------------------------------------------
  const [activeExerciseName, setActiveExerciseName] = useState<string>('');
  const [isUnilateral, setIsUnilateral] = useState<boolean>(false);
  const [exerciseNotes, setExerciseNotes] = useState<string>('');

  // Automatic exercise duration: track stopwatch timestamp when exercise starts
  const exerciseStartStopwatchSecondsRef = useRef<number>(0);

  // Set-by-set tracker with SetType (N: Normal, W: Warm-Up, D: Drop Set, F: Failure)
  const [activeSets, setActiveSets] = useState<ActiveSetItem[]>([
    { setNumber: 1, weightKg: 60, reps: 10, setType: 'N', isCompleted: false },
    { setNumber: 2, weightKg: 60, reps: 10, setType: 'N', isCompleted: false },
    { setNumber: 3, weightKg: 60, reps: 10, setType: 'N', isCompleted: false },
  ]);

  // Synchronize initial active exercise selection with split exercises
  useEffect(() => {
    if (splitExercises.length > 0) {
      if (!activeExerciseName || !splitExercises.some((e) => e.name === activeExerciseName)) {
        setActiveExerciseName(splitExercises[0].name);
      }
    } else {
      setActiveExerciseName('');
    }
  }, [splitExercises, activeExerciseName]);

  // Track exercise start stopwatch timestamp when active exercise changes
  useEffect(() => {
    exerciseStartStopwatchSecondsRef.current = stopwatchSeconds;
  }, [activeExerciseName]);

  // Active exercise object and exercise-specific rest preset
  const activeExerciseObj = useMemo(() => {
    return exerciseLibrary.find((e) => e.name === activeExerciseName);
  }, [exerciseLibrary, activeExerciseName]);

  const activeRestPreset = activeExerciseObj?.defaultRestSeconds || 90;

  // Load previous stats and progressive overload target when active exercise changes
  const lastSession = useMemo(() => {
    if (!activeExerciseName) return null;
    return getLastSessionForExercise(activeExerciseName, selectedDate);
  }, [activeExerciseName, selectedDate, dailyWorkout.weightliftingEntries.length]);

  // Historical PR stats across all workouts for real-time PR comparisons
  const exerciseHistoricalPR = useMemo(() => {
    if (!activeExerciseName) return { maxWeightKg: 0, maxReps: 0, max1RM: 0 };
    return calculateHistoricalExercisePR(
      activeExerciseName,
      allWorkouts,
      selectedDate,
      activeExerciseObj?.personalBest
    );
  }, [activeExerciseName, allWorkouts, selectedDate, activeExerciseObj?.personalBest]);

  const overloadSuggestion = useMemo(() => {
    return predictProgressiveOverload(lastSession);
  }, [lastSession]);

  // Notify parent of active session state changes for floating dock
  useEffect(() => {
    if (onActiveSessionUpdate) {
      onActiveSessionUpdate({
        isActive: phase === 'active',
        stopwatchSeconds,
        activeExerciseName,
        restTimeLeft: restTimerState.timeLeft,
        isRestRunning: restTimerState.isRunning,
      });
    }
  }, [phase, stopwatchSeconds, activeExerciseName, restTimerState, onActiveSessionUpdate]);

  // Pre-populate sets weights & reps based on progressive overload recommendation when switching exercises
  const lastInitializedExerciseRef = useRef<string>('');
  useEffect(() => {
    if (activeExerciseName && activeExerciseName !== lastInitializedExerciseRef.current) {
      lastInitializedExerciseRef.current = activeExerciseName;
      if (lastSession) {
        const defaultWeight = lastSession.weightKg + overloadSuggestion.suggestedWeightAdditionKg;
        const defaultReps = lastSession.reps || 10;
        setActiveSets([
          { setNumber: 1, weightKg: Math.max(20, defaultWeight - 15), reps: 12, setType: 'W', isCompleted: false },
          { setNumber: 2, weightKg: defaultWeight, reps: defaultReps, setType: 'N', isCompleted: false },
          { setNumber: 3, weightKg: defaultWeight, reps: defaultReps, setType: 'N', isCompleted: false },
        ]);
      } else {
        setActiveSets([
          { setNumber: 1, weightKg: 30, reps: 12, setType: 'W', isCompleted: false },
          { setNumber: 2, weightKg: 50, reps: 10, setType: 'N', isCompleted: false },
          { setNumber: 3, weightKg: 50, reps: 10, setType: 'N', isCompleted: false },
        ]);
      }
    }
  }, [activeExerciseName, lastSession, overloadSuggestion.suggestedWeightAdditionKg]);

  // 1-Tap Pre-fill from Last Session (Requirement 7)
  const handlePreFillLastSession = () => {
    if (!lastSession) {
      triggerAutoRest('No previous session found for this exercise.');
      return;
    }
    const count = Math.max(1, lastSession.sets || 3);
    const newSets: ActiveSetItem[] = [];
    for (let i = 1; i <= count; i++) {
      newSets.push({
        setNumber: i,
        weightKg: lastSession.weightKg,
        reps: lastSession.reps,
        setType: i === 1 ? 'W' : 'N',
        isCompleted: false,
      });
    }
    setActiveSets(newSets);
    setIsUnilateral(!!lastSession.isUnilateral);
    triggerAutoRest(
      `Pre-filled ${count} sets from last session (${lastSession.weightKg}kg × ${lastSession.reps} reps)! Fast adjust and crush it!`
    );
  };

  // Set-level management with real-time PR evaluation
  const handleUpdateSet = (index: number, field: 'weightKg' | 'reps', val: number) => {
    setActiveSets((prev) => {
      const copy = [...prev];
      const updatedSet = { ...copy[index], [field]: Math.max(0, val) };
      const prCheck = evaluateSetPR(
        field === 'weightKg' ? val : updatedSet.weightKg,
        field === 'reps' ? val : updatedSet.reps,
        updatedSet.setType || 'N',
        exerciseHistoricalPR,
        activeExerciseName
      );
      copy[index] = {
        ...updatedSet,
        isPr: prCheck.isPr,
        badgeLabel: prCheck.badgeLabel,
        estimated1RM: prCheck.estimated1RM,
      };
      return copy;
    });
  };

  const handleUpdateSetType = (index: number, newType: SetType) => {
    setActiveSets((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const prCheck = evaluateSetPR(
        target.weightKg,
        target.reps,
        newType,
        exerciseHistoricalPR,
        activeExerciseName
      );
      copy[index] = {
        ...target,
        setType: newType,
        isPr: prCheck.isPr,
        badgeLabel: prCheck.badgeLabel,
        estimated1RM: prCheck.estimated1RM,
      };
      return copy;
    });
  };

  const handleToggleCompleteSet = (index: number) => {
    let prToGlow: string | null = null;
    let prToRecord: string | null = null;
    let restMessage = '';

    setActiveSets((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const nextCompleted = !target.isCompleted;

      const prCheck = evaluateSetPR(
        target.weightKg,
        target.reps,
        target.setType || 'N',
        exerciseHistoricalPR,
        activeExerciseName
      );

      copy[index] = {
        ...target,
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? Date.now() : undefined,
        isPr: prCheck.isPr,
        badgeLabel: prCheck.badgeLabel,
        estimated1RM: prCheck.estimated1RM,
      };

      if (nextCompleted) {
        if (prCheck.isPr && target.setType !== 'W') {
          prToGlow =
            prCheck.celebrationMessage ||
            `🔥 NEW PERSONAL RECORD! ${target.weightKg} kg × ${target.reps} reps (Est. 1RM: ${prCheck.estimated1RM} kg)!`;
          prToRecord = `${activeExerciseName}: ${target.weightKg} kg × ${target.reps} reps (Est. 1RM: ${prCheck.estimated1RM} kg)`;
        }

        restMessage = `Set ${target.setNumber} logged (${target.weightKg}kg × ${target.reps} reps${
          target.setType === 'W' ? ' - Warmup' : ''
        }). Rest timer initiated!`;
      }
      return copy;
    });

    if (prToGlow) {
      setActiveExercisePrGlow(prToGlow);
    }
    if (prToRecord) {
      setPrsAchievedThisSession((prevPrs) =>
        prevPrs.includes(prToRecord!) ? prevPrs : [...prevPrs, prToRecord!]
      );
    }
    if (restMessage) {
      triggerAutoRest(restMessage);
    }
  };

  const handleAddSetRow = () => {
    setActiveSets((prev) => {
      const last = prev[prev.length - 1];
      const newSetNumber = prev.length + 1;
      return [
        ...prev,
        {
          setNumber: newSetNumber,
          weightKg: last ? last.weightKg : 50,
          reps: last ? last.reps : 10,
          setType: 'N',
          isCompleted: false,
        },
      ];
    });
  };

  const handleRemoveSetRow = (index: number) => {
    if (activeSets.length <= 1) return;
    setActiveSets((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    });
  };

  // Log active exercise into dailyWorkout with AUTOMATIC DURATION & WARM-UP EXCLUSION
  const handleCommitActiveExercise = () => {
    if (!activeExerciseName) return;

    // Filter sets to only completed sets, or all if none marked
    const setsToLog = activeSets.some((s) => s.isCompleted)
      ? activeSets.filter((s) => s.isCompleted)
      : activeSets;

    const completedCount = setsToLog.length;
    if (completedCount === 0) return;

    // Calculate aggregate volume: WARM-UP SETS STRICTLY EXCLUDED
    const totalVolume = calculateAggregateSetsVolume(setsToLog, isUnilateral);

    // Detailed set records
    const setRecords: SetRecord[] = setsToLog.map((s) => ({
      setNumber: s.setNumber,
      weightKg: s.weightKg,
      reps: s.reps,
      setType: s.setType || 'N',
      isCompleted: s.isCompleted,
      completedAt: s.completedAt,
      isPr: s.isPr,
      estimated1RM: s.estimated1RM,
    }));

    // Representative weight and reps for working sets
    const workingSets = setsToLog.filter((s) => s.setType !== 'W');
    const representativeSets = workingSets.length > 0 ? workingSets : setsToLog;
    const avgReps = Math.round(representativeSets.reduce((a, b) => a + b.reps, 0) / representativeSets.length);
    const maxWeight = Math.max(...representativeSets.map((s) => s.weightKg));

    // AUTOMATIC DURATION: elapsed stopwatch seconds between starting and finishing this exercise
    const elapsedSeconds = Math.max(30, stopwatchSeconds - exerciseStartStopwatchSecondsRef.current);
    const autoDurationMins = Math.max(1, Math.round(elapsedSeconds / 60));

    const caloriesBurned = calculateWeightliftingCalories(sessionWeight, autoDurationMins);

    const newEntry: WeightliftingEntry = {
      id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      exerciseName: activeExerciseName,
      split: activeSplit,
      sets: completedCount,
      reps: avgReps,
      weightKg: maxWeight,
      isUnilateral,
      durationMins: autoDurationMins,
      volumeKg: totalVolume,
      caloriesBurned,
      notes: exerciseNotes.trim() || undefined,
      setRecords,
      timestamp: Date.now(),
    };

    onSaveDailyWorkout({
      ...dailyWorkout,
      split: activeSplit,
      sessionBodyWeightKg: sessionWeight,
      weightliftingEntries: [...dailyWorkout.weightliftingEntries, newEntry],
    });

    // Reset notes and reset stopwatch baseline for next exercise
    setExerciseNotes('');
    exerciseStartStopwatchSecondsRef.current = stopwatchSeconds;
    setActiveSets((prev) =>
      prev.map((s) => ({
        ...s,
        isCompleted: false,
      }))
    );

    triggerAutoRest(`Recorded ${activeExerciseName} (${totalVolume.toLocaleString()} kg volume). Rest up!`);
  };

  // ----------------------------------------------------
  // CARDIO TRACKING STATE
  // ----------------------------------------------------
  const [cardioType, setCardioType] = useState<string>('Treadmill');
  const [cardioSpeedKmh, setCardioSpeedKmh] = useState<number>(6.0);
  const [cardioInclinePercent, setCardioInclinePercent] = useState<number>(4.0);
  const [cardioDurationMins, setCardioDurationMins] = useState<number>(20);

  const liveCardioCalories = calculateCardioCalories(
    cardioSpeedKmh,
    cardioInclinePercent,
    cardioDurationMins,
    sessionWeight
  );

  const handleAddCardio = () => {
    const newEntry: CardioEntry = {
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      cardioType,
      speedKmh: Number(cardioSpeedKmh),
      inclinePercent: Number(cardioInclinePercent),
      durationMins: Number(cardioDurationMins),
      caloriesBurned: liveCardioCalories,
      timestamp: Date.now(),
    };

    onSaveDailyWorkout({
      ...dailyWorkout,
      split: activeSplit,
      sessionBodyWeightKg: sessionWeight,
      cardioEntries: [...dailyWorkout.cardioEntries, newEntry],
    });

    triggerAutoRest(`Cardio logged: ${cardioType} (${liveCardioCalories} kcal burned)!`);
  };

  // Delete Individual Entry Handlers
  const handleDeleteWeightlifting = (id: string) => {
    onSaveDailyWorkout({
      ...dailyWorkout,
      weightliftingEntries: dailyWorkout.weightliftingEntries.filter((e) => e.id !== id),
    });
  };

  const handleDeleteCardio = (id: string) => {
    onSaveDailyWorkout({
      ...dailyWorkout,
      cardioEntries: dailyWorkout.cardioEntries.filter((e) => e.id !== id),
    });
  };

  // ----------------------------------------------------
  // AGGREGATE CALCULATIONS & TOTALS
  // ----------------------------------------------------
  const totalVolumeToday = dailyWorkout.weightliftingEntries.reduce(
    (acc, curr) => acc + curr.volumeKg,
    0
  );

  const totalCaloriesToday =
    dailyWorkout.weightliftingEntries.reduce((acc, curr) => acc + curr.caloriesBurned, 0) +
    dailyWorkout.cardioEntries.reduce((acc, curr) => acc + curr.caloriesBurned, 0);

  const totalSetsCompletedToday = dailyWorkout.weightliftingEntries.reduce(
    (acc, curr) => acc + curr.sets,
    0
  );

  // ----------------------------------------------------
  // PHASE TRANSITION HANDLERS
  // ----------------------------------------------------
  const handleStartWorkout = () => {
    setPhase('active');
    setIsStopwatchRunning(true);
    exerciseStartStopwatchSecondsRef.current = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishWorkout = () => {
    setIsStopwatchRunning(false);
    setPhase('summary');
  };

  const handleConfirmAndSaveWorkout = () => {
    // Save total duration and final workout state cleanly
    const totalMinutes = Math.max(1, Math.round(stopwatchSeconds / 60));
    onSaveDailyWorkout({
      ...dailyWorkout,
      split: activeSplit,
      sessionBodyWeightKg: sessionWeight,
      durationMinutes: totalMinutes,
      notes: dailyWorkout.notes,
    });
    setPhase('setup');
  };

  const handleResumeWorkout = () => {
    setPhase('active');
    setIsStopwatchRunning(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToCalendar}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-[#1e1e1e] border border-zinc-800 text-zinc-300 hover:text-white hover:border-[#bb86fc]/50 hover:bg-[#bb86fc]/10 transition-all font-semibold text-sm group"
          aria-label="Back to Calendar"
        >
          <ArrowLeft className="w-4 h-4 text-[#bb86fc] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Calendar</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Phase Badge */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-zinc-700 bg-zinc-900">
            {phase === 'setup' && (
              <>
                <span className="w-2 h-2 rounded-full bg-[#bb86fc]" />
                <span className="text-zinc-300">Phase A: Setup & Targets</span>
              </>
            )}
            {phase === 'active' && (
              <>
                <span className="w-2 h-2 rounded-full bg-[#03dac6] animate-pulse" />
                <span className="text-[#03dac6]">Phase B: Active Workout</span>
              </>
            )}
            {phase === 'summary' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400">Phase C: Post-Workout Summary</span>
              </>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs text-zinc-400 font-medium">Daily Log for:</span>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 justify-end">
              <span>{selectedDate}</span>
              <span className="text-xs font-mono font-medium text-[#03dac6]">({dayOfWeekName})</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Universal Rest Timer (Sticky bar with visual glow highlight & auto-preset) */}
      <RestTimer
        autoStartTrigger={restTimerTrigger}
        presetDuration={activeRestPreset}
      />

      {/* Rest Toast Notification */}
      {restToast && (
        <div className="p-3 bg-[#03dac6]/20 border border-[#03dac6] text-[#03dac6] text-xs font-bold rounded-[12px] flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{restToast}</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-normal">Timer counting down</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* PHASE A: SESSION SETUP & GOAL REVIEW                */}
      {/* ==================================================== */}
      {phase === 'setup' && (
        <div className="space-y-6 animate-fade-in">
          {/* Dynamic Session Body Weight Prompt (Requirement 3: Shown ONLY in Phase A) */}
          <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#03dac6]/20 text-[#03dac6] flex-shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Today's Session Body Weight</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#03dac6]/15 text-[#03dac6] border border-[#03dac6]/30">
                    Live Calorie Driver
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Calibrates all Weightlifting METs (6.0) & Cardio ACSM formulas for today's session. Will hide during workout to eliminate clutter.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto bg-[#121212] p-1.5 rounded-lg border border-zinc-700">
              <label htmlFor="session-weight-input" className="text-xs font-semibold text-zinc-400 px-1">
                Weight:
              </label>
              <input
                id="session-weight-input"
                type="number"
                step="0.1"
                min="20"
                max="250"
                value={sessionWeight}
                onChange={(e) => handleSessionWeightChange(Math.max(20, Math.min(250, Number(e.target.value))))}
                className="w-20 bg-zinc-900 border border-zinc-700 focus:border-[#03dac6] text-white font-mono font-bold text-center text-sm py-1 px-2 rounded focus:outline-none"
                aria-label="Today's Session Body Weight in kg"
              />
              <span className="text-xs font-bold text-[#03dac6] pr-1">kg</span>
            </div>
          </div>

          {/* Split Selector Card */}
          <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label htmlFor="split-selector" className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#bb86fc]" />
                  <span>Assigned Workout Split</span>
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Default for {dayOfWeekName}: <strong className="text-zinc-200">{autoSplit}</strong>
                </p>
              </div>

              <div className="w-full sm:w-auto">
                <select
                  id="split-selector"
                  value={activeSplit}
                  onChange={(e) => handleSplitChange(e.target.value as SplitType)}
                  className="w-full sm:w-64 bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
                  aria-label="Select Workout Split"
                >
                  <option value="Push">Sunday: Push (Chest, Shoulders, Triceps)</option>
                  <option value="Pull">Monday: Pull (Back, Rear Delts, Biceps)</option>
                  <option value="Legs">Tuesday: Legs (Quads, Hamstrings, Calves)</option>
                  <option value="Rest/Cardio">Wednesday: Rest / Cardio & Mobility</option>
                  <option value="Upper">Thursday: Upper (Push & Pull Compounds)</option>
                  <option value="Lower">Friday: Lower (Legs & Posterior Chain)</option>
                  <option value="Rest">Saturday: Rest (Full Recovery)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Planned Exercises & Progressive Overload Targets Review */}
          <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-[#bb86fc]" />
                  <span>Planned Exercises & Progressive Overload Targets</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Review your goal weights, reps, and sets based on previous performance before starting
                </p>
              </div>

              <button
                type="button"
                onClick={onNavigateToExerciseLibrary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bb86fc]/15 hover:bg-[#bb86fc]/25 text-[#bb86fc] border border-[#bb86fc]/40 text-xs font-semibold transition-all active:scale-95"
                aria-label="Manage Exercise Library"
              >
                <Plus className="w-3.5 h-3.5 text-[#03dac6]" />
                <span>Add to Library</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            </div>

            {splitExercises.length === 0 ? (
              <div className="p-5 rounded-[12px] bg-[#121212] border border-dashed border-amber-500/40 text-amber-300 text-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-200 text-sm">
                      No exercises in library for {activeSplit} (Clean Start)
                    </h4>
                    <p className="text-zinc-400 mt-1">
                      Your library starts completely blank. Add exercises for {activeSplit} in the Exercise Library tab to enable progressive overload tracking and set logging.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToExerciseLibrary}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-[#bb86fc] px-4 py-2 rounded-lg hover:bg-[#c99eff] transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Exercise Library</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {splitExercises.map((ex) => {
                  const lastLog = getLastSessionForExercise(ex.name, selectedDate);
                  const overload = predictProgressiveOverload(lastLog);
                  return (
                    <div
                      key={ex.id}
                      className="p-4 rounded-[12px] bg-[#141414] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#bb86fc]" />
                            {ex.name}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            {ex.defaultRestSeconds && (
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                                Rest: {ex.defaultRestSeconds}s
                              </span>
                            )}
                            {ex.personalBest && (
                              <span className="text-[10px] font-mono text-[#03dac6] bg-[#03dac6]/10 px-2 py-0.5 rounded border border-[#03dac6]/20">
                                PB: {ex.personalBest}
                              </span>
                            )}
                          </div>
                        </div>
                        {ex.description && (
                          <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{ex.description}</p>
                        )}
                      </div>

                      {/* Progressive Overload Prediction Badge */}
                      <div
                        className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                          overload.badgeColor === 'teal'
                            ? 'bg-[#03dac6]/10 border-[#03dac6]/40 text-zinc-200'
                            : overload.badgeColor === 'purple'
                            ? 'bg-[#bb86fc]/10 border-[#bb86fc]/40 text-zinc-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#03dac6]" /> Target Overload
                          </span>
                          {overload.suggestedWeightAdditionKg > 0 && (
                            <span className="text-[10px] font-extrabold text-[#03dac6] bg-[#03dac6]/20 px-1.5 py-0.2 rounded">
                              +{overload.suggestedWeightAdditionKg} kg Bump
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-white text-xs">{overload.title}</p>
                        <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                          {overload.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prominent High-Visibility "Start Workout" Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartWorkout}
              className="w-full py-4 px-6 rounded-[14px] bg-gradient-to-r from-[#bb86fc] via-[#9d4edd] to-[#03dac6] hover:brightness-110 active:scale-[0.99] text-black font-extrabold text-base sm:text-lg shadow-xl shadow-[#bb86fc]/25 flex items-center justify-center gap-3 transition-all duration-200"
              aria-label="Start Active Workout Session"
            >
              <Play className="w-6 h-6 fill-black text-black" />
              <span>Start Workout Session</span>
              <ChevronRight className="w-5 h-5 text-black" />
            </button>
            <p className="text-center text-xs text-zinc-400 mt-2">
              Pressing "Start Workout" initializes the global stopwatch and set-logging tracker.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PHASE B: ACTIVE SESSION & STOPWATCH TRACKING        */}
      {/* ==================================================== */}
      {phase === 'active' && (
        <div className="space-y-6 animate-fade-in">
          {/* Active Session & Stopwatch Bar */}
          <div className="sticky top-16 z-20 bg-[#161616]/95 backdrop-blur-md border border-[#bb86fc]/40 rounded-[12px] p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#03dac6]/20 text-[#03dac6] flex items-center justify-center">
                <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Workout Stopwatch
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#03dac6]/20 text-[#03dac6] animate-pulse">
                    Live Recording
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                    ({sessionWeight}kg active)
                  </span>
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wider">
                  {formatStopwatch(stopwatchSeconds)}
                </div>
              </div>
            </div>

            {/* Quick Session Stats */}
            <div className="flex items-center gap-3 text-xs">
              <div className="bg-[#121212] px-3 py-1.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Volume</span>
                <span className="font-mono font-bold text-[#bb86fc] text-sm">
                  {totalVolumeToday.toLocaleString()} kg
                </span>
              </div>
              <div className="bg-[#121212] px-3 py-1.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Sets Logged</span>
                <span className="font-mono font-bold text-[#03dac6] text-sm">
                  {totalSetsCompletedToday}
                </span>
              </div>
            </div>

            {/* Finish Workout Button */}
            <button
              type="button"
              onClick={handleFinishWorkout}
              className="px-4 py-2.5 rounded-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 font-bold text-xs sm:text-sm active:scale-95 transition-all shadow-sm"
              aria-label="Finish Workout Session"
            >
              Finish Workout
            </button>
          </div>

          {/* Active Exercise Set-Logging UI */}
          <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#bb86fc]/20 text-[#bb86fc]">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Set Logger</h3>
                  <p className="text-xs text-zinc-400">
                    Log each set as you finish. Checkmark auto-starts the Universal Rest Timer. Duration tracked automatically.
                  </p>
                </div>
              </div>

              {/* Inline Add Exercise link to Exercise Library */}
              <button
                type="button"
                onClick={onNavigateToExerciseLibrary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#03dac6]" />
                <span>Exercise Library</span>
              </button>
            </div>

            {/* Exercise Selector with Rest Preset Indicator & 1RM History Drawer Button */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="active-exercise-dropdown" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Current Exercise ({activeSplit})
                </label>
                <div className="flex items-center gap-2">
                  {activeExerciseObj?.defaultRestSeconds && (
                    <span className="text-[11px] font-mono text-[#03dac6] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Rest: {activeExerciseObj.defaultRestSeconds}s
                    </span>
                  )}

                  {/* Exercise History Slide-Over Drawer Trigger (Requirement 5) */}
                  <button
                    type="button"
                    onClick={() => setIsHistoryDrawerOpen(true)}
                    disabled={!activeExerciseName}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#bb86fc]/15 hover:bg-[#bb86fc]/25 text-[#bb86fc] border border-[#bb86fc]/40 text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    aria-label={`Open 1RM history and previous sessions for ${activeExerciseName}`}
                  >
                    <History className="w-3.5 h-3.5 text-[#03dac6]" />
                    <span>1RM History</span>
                  </button>
                </div>
              </div>

              {splitExercises.length === 0 ? (
                <div className="p-3 bg-[#121212] rounded-lg border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
                  <span>No exercises saved for {activeSplit}. Add one in Library.</span>
                  <button
                    type="button"
                    onClick={onNavigateToExerciseLibrary}
                    className="font-bold text-[#bb86fc] underline ml-2"
                  >
                    Open Library
                  </button>
                </div>
              ) : (
                <select
                  id="active-exercise-dropdown"
                  value={activeExerciseName}
                  onChange={(e) => setActiveExerciseName(e.target.value)}
                  className="w-full bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
                  aria-label="Select Active Exercise"
                >
                  {splitExercises.map((ex) => (
                    <option key={ex.id} value={ex.name}>
                      {ex.name} {ex.personalBest ? `(PB: ${ex.personalBest})` : ''} {ex.defaultRestSeconds ? `[${ex.defaultRestSeconds}s rest]` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Real-time Personal Record Banner Glow (Requirement 2) */}
            {activeExercisePrGlow && (
              <div className="p-3 bg-gradient-to-r from-[#2c1342] via-[#1b0f2a] to-[#2c1342] border-2 border-[#bb86fc] shadow-[0_0_25px_rgba(187,134,252,0.45)] text-white text-xs font-bold rounded-[14px] flex items-center justify-between animate-fade-in ring-1 ring-[#bb86fc]/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#bb86fc] text-black flex-shrink-0 shadow-md shadow-[#bb86fc]/40">
                    <Trophy className="w-4 h-4 fill-black text-black animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#03dac6] block">
                      ★ PERSONAL RECORD ALERT ★
                    </span>
                    <span className="text-white text-xs font-black">{activeExercisePrGlow}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveExercisePrGlow(null)}
                  className="p-1 rounded text-zinc-400 hover:text-white text-xs"
                  aria-label="Dismiss PR banner"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Overload Target Reminder Box */}
            {activeExerciseName && (
              <div
                className={`p-3.5 rounded-[12px] border text-xs space-y-1 ${
                  overloadSuggestion.badgeColor === 'teal'
                    ? 'bg-[#03dac6]/10 border-[#03dac6]/40 text-zinc-200'
                    : overloadSuggestion.badgeColor === 'purple'
                    ? 'bg-[#bb86fc]/10 border-[#bb86fc]/40 text-zinc-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#03dac6]" />
                    <span>Predicted Progressive Overload Target</span>
                  </span>
                  {lastSession && (
                    <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded">
                      Last: {lastSession.sets}×{lastSession.reps} @ {lastSession.weightKg}kg
                    </span>
                  )}
                </div>
                <p className="font-bold text-white text-xs sm:text-sm">{overloadSuggestion.title}</p>
                <p className="text-zinc-300 text-xs">{overloadSuggestion.message}</p>
              </div>
            )}

            {/* 1-Tap Pre-fill from Last Session Button (Requirement 7) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
              {lastSession ? (
                <button
                  type="button"
                  onClick={handlePreFillLastSession}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-gradient-to-r from-[#bb86fc]/20 to-[#03dac6]/20 hover:from-[#bb86fc]/30 hover:to-[#03dac6]/30 text-[#bb86fc] border border-[#bb86fc]/40 text-xs font-bold transition-all active:scale-95 shadow-sm"
                  aria-label="Pre-fill sets from last session"
                >
                  <Zap className="w-3.5 h-3.5 text-[#03dac6] fill-[#03dac6]" />
                  <span>Pre-fill from Last Session ({lastSession.sets}×{lastSession.reps} @ {lastSession.weightKg}kg)</span>
                </button>
              ) : (
                <span className="text-xs text-zinc-500 italic">
                  First time recording {activeExerciseName}. Enter starting weights below.
                </span>
              )}

              <span className="text-[11px] text-zinc-400 font-mono">
                Duration: <strong className="text-[#03dac6]">Auto-tracked from stopwatch</strong>
              </span>
            </div>

            {/* Unilateral Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-[#121212] rounded-lg border border-zinc-800 hover:border-zinc-700 select-none">
              <input
                type="checkbox"
                checked={isUnilateral}
                onChange={(e) => setIsUnilateral(e.target.checked)}
                className="w-4 h-4 rounded text-[#bb86fc] accent-[#bb86fc] focus:ring-0 cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-semibold text-zinc-200">
                Unilateral Exercise (Log weight for ONE side)
              </span>
              <span className="text-[11px] text-zinc-500 hidden sm:inline ml-auto">
                Multiplies total volume by 2
              </span>
            </label>

            {/* Set-by-Set Logging Rows */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
                <span>Set # & Type</span>
                <span className="text-center">Weight & Reps</span>
                <span>Action / Rest</span>
              </div>

              {activeSets.map((set, idx) => (
                <div
                  key={set.setNumber}
                  className={`p-3 rounded-[14px] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    set.isCompleted
                      ? 'bg-[#03dac6]/10 border-[#03dac6]/50 shadow-sm'
                      : set.isPr
                      ? 'bg-[#bb86fc]/10 border-[#bb86fc]/60 shadow-[0_0_15px_rgba(187,134,252,0.2)]'
                      : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Left: Set Number & Set Type Tag Selector (Requirement 1 & 2) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        set.isCompleted
                          ? 'bg-[#03dac6] text-black font-extrabold'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      #{set.setNumber}
                    </span>

                    {/* Set Type Tagging Badges: Normal (N), Warm-Up (W), Drop Set (D), Failure (F) */}
                    <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800">
                      {(['N', 'W', 'D', 'F'] as const).map((t) => {
                        const isSelected = (set.setType || 'N') === t;
                        const label =
                          t === 'N'
                            ? 'Norm'
                            : t === 'W'
                            ? 'Warm-Up'
                            : t === 'D'
                            ? 'Drop'
                            : 'Fail';

                        const colorClasses =
                          t === 'W'
                            ? isSelected
                              ? 'bg-amber-500 text-black font-black border-amber-400 shadow-sm'
                              : 'bg-amber-500/10 text-amber-300/80 border-amber-500/30 hover:bg-amber-500/20'
                            : t === 'D'
                            ? isSelected
                              ? 'bg-sky-500 text-black font-black border-sky-400 shadow-sm'
                              : 'bg-sky-500/10 text-sky-300/80 border-sky-500/30 hover:bg-sky-500/20'
                            : t === 'F'
                            ? isSelected
                              ? 'bg-rose-500 text-white font-black border-rose-400 shadow-sm'
                              : 'bg-rose-500/10 text-rose-300/80 border-rose-500/30 hover:bg-rose-500/20'
                            : isSelected
                            ? 'bg-[#bb86fc] text-black font-black border-[#bb86fc] shadow-sm'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white';

                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleUpdateSetType(idx, t)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all active:scale-95 ${colorClasses}`}
                            title={
                              t === 'W'
                                ? 'Warm-Up set: Logged in history, strictly excluded from Volume & progressive overload targets'
                                : t === 'D'
                                ? 'Drop set: Counted in volume'
                                : t === 'F'
                                ? 'Set taken to failure: Counted in volume'
                                : 'Normal working set: Counted in volume'
                            }
                            aria-label={`Set ${set.setNumber} type ${label}`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>

                    {/* Warm-Up indicator badge */}
                    {set.setType === 'W' && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        Warmup (0 kg vol)
                      </span>
                    )}

                    {/* Real-time PR badge if active set qualifies */}
                    {set.isPr && set.setType !== 'W' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-[#bb86fc] to-[#03dac6] text-black shadow-md shadow-[#bb86fc]/40 animate-pulse flex items-center gap-1 border border-white/30">
                        <Trophy className="w-3 h-3 fill-black text-black" />
                        <span>{set.badgeLabel || 'NEW PR'}</span>
                      </span>
                    )}
                  </div>

                  {/* Center: Weight & Reps with Quick-Adjust Increment Buttons (Requirement 3) */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Weight Stepper: -2.5 kg, Input, +2.5 kg */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateSet(idx, 'weightKg', Math.max(0, set.weightKg - 2.5))}
                        className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white font-mono font-bold text-xs active:scale-90 transition-all border border-zinc-700"
                        title="-2.5 kg"
                        aria-label={`Decrease set ${set.setNumber} weight by 2.5 kg`}
                      >
                        -2.5
                      </button>

                      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1">
                        <label htmlFor={`set-${idx}-weight`} className="sr-only">
                          Weight
                        </label>
                        <input
                          id={`set-${idx}-weight`}
                          type="number"
                          step="2.5"
                          min="0"
                          max="400"
                          value={set.weightKg}
                          onChange={(e) => handleUpdateSet(idx, 'weightKg', Number(e.target.value))}
                          className="w-14 bg-transparent text-white font-mono font-bold text-center text-sm focus:outline-none"
                          aria-label={`Set ${set.setNumber} Weight in kg`}
                        />
                        <span className="text-[10px] text-zinc-500">kg</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateSet(idx, 'weightKg', set.weightKg + 2.5)}
                        className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white font-mono font-bold text-xs active:scale-90 transition-all border border-zinc-700"
                        title="+2.5 kg"
                        aria-label={`Increase set ${set.setNumber} weight by 2.5 kg`}
                      >
                        +2.5
                      </button>
                    </div>

                    <span className="text-zinc-600 font-bold">×</span>

                    {/* Reps Stepper: -1 rep, Input, +1 rep */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateSet(idx, 'reps', Math.max(1, set.reps - 1))}
                        className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white font-mono font-bold text-xs active:scale-90 transition-all border border-zinc-700"
                        title="-1 rep"
                        aria-label={`Decrease set ${set.setNumber} reps by 1`}
                      >
                        -1
                      </button>

                      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1">
                        <label htmlFor={`set-${idx}-reps`} className="sr-only">
                          Reps
                        </label>
                        <input
                          id={`set-${idx}-reps`}
                          type="number"
                          min="1"
                          max="100"
                          value={set.reps}
                          onChange={(e) => handleUpdateSet(idx, 'reps', Number(e.target.value))}
                          className="w-12 bg-transparent text-white font-mono font-bold text-center text-sm focus:outline-none"
                          aria-label={`Set ${set.setNumber} Reps`}
                        />
                        <span className="text-[10px] text-zinc-500">reps</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateSet(idx, 'reps', set.reps + 1)}
                        className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white font-mono font-bold text-xs active:scale-90 transition-all border border-zinc-700"
                        title="+1 rep"
                        aria-label={`Increase set ${set.setNumber} reps by 1`}
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* Actions: Complete Set & auto-start rest timer, or remove set */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleCompleteSet(idx)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                        set.isCompleted
                          ? 'bg-[#03dac6] text-black shadow-md shadow-[#03dac6]/20'
                          : 'bg-[#bb86fc]/20 hover:bg-[#bb86fc]/30 text-[#bb86fc] border border-[#bb86fc]/40'
                      }`}
                      aria-label={`Log Set ${set.setNumber} and start rest timer`}
                    >
                      {set.isCompleted ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Logged</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Log Set</span>
                        </>
                      )}
                    </button>

                    {activeSets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSetRow(idx)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Remove set"
                        aria-label={`Remove set ${set.setNumber}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Set Row Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleAddSetRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-all"
                aria-label="Add Another Set"
              >
                <Plus className="w-3.5 h-3.5 text-[#03dac6]" />
                <span>Add Set</span>
              </button>

              <span className="text-xs text-zinc-400 font-mono">
                {activeSets.filter((s) => s.isCompleted).length} / {activeSets.length} sets completed
              </span>
            </div>

            {/* Exercise Notes / Technique cues (Automatic duration replaces manual input - Requirement 2) */}
            <div className="bg-[#121212] p-3 rounded-lg border border-zinc-800 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[#bb86fc] flex-shrink-0" />
              <input
                type="text"
                value={exerciseNotes}
                onChange={(e) => setExerciseNotes(e.target.value)}
                placeholder="Technique notes / cues: e.g. RPE 8, 2s pause at stretch"
                className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                aria-label="Technique cues and notes"
              />
            </div>

            {/* Commit Exercise to Session Button */}
            <button
              type="button"
              disabled={!activeExerciseName}
              onClick={handleCommitActiveExercise}
              className="w-full py-3 px-4 rounded-[12px] bg-[#bb86fc] hover:bg-[#c99eff] text-black font-extrabold text-sm shadow-md shadow-[#bb86fc]/20 flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Save Completed Sets to Workout Session"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>Record & Add {activeExerciseName || 'Exercise'} to Session Summary</span>
            </button>
          </div>

          {/* Cardio Section in Active Session */}
          <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
              <div className="p-2 rounded-lg bg-[#03dac6]/20 text-[#03dac6]">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cardio Logger</h3>
                <p className="text-xs text-zinc-400">
                  ACSM Treadmill Formula calculations calibrated to {sessionWeight} kg session weight
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="cardio-type-active" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Cardio Type
                </label>
                <select
                  id="cardio-type-active"
                  value={cardioType}
                  onChange={(e) => setCardioType(e.target.value)}
                  className="w-full bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2 focus:border-[#03dac6] focus:outline-none"
                  aria-label="Cardio Type"
                >
                  <option value="Treadmill">Treadmill</option>
                  <option value="Elliptical">Elliptical</option>
                  <option value="Stationary Bike">Stationary Bike</option>
                  <option value="Rowing Machine">Rowing Machine</option>
                  <option value="Stair Climber">Stair Climber</option>
                  <option value="Outdoor Run">Outdoor Run</option>
                </select>
              </div>

              <div>
                <label htmlFor="cardio-speed-active" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Speed (km/h)
                </label>
                <input
                  id="cardio-speed-active"
                  type="number"
                  step="0.1"
                  min="0"
                  max="25"
                  value={cardioSpeedKmh}
                  onChange={(e) => setCardioSpeedKmh(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2 focus:border-[#03dac6] focus:outline-none"
                  aria-label="Cardio speed in km/h"
                />
              </div>

              <div>
                <label htmlFor="cardio-incline-active" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Incline (%)
                </label>
                <input
                  id="cardio-incline-active"
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={cardioInclinePercent}
                  onChange={(e) => setCardioInclinePercent(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2 focus:border-[#03dac6] focus:outline-none"
                  aria-label="Cardio incline percentage"
                />
              </div>

              <div>
                <label htmlFor="cardio-duration-active" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Duration (mins)
                </label>
                <input
                  id="cardio-duration-active"
                  type="number"
                  min="1"
                  max="180"
                  value={cardioDurationMins}
                  onChange={(e) => setCardioDurationMins(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2 focus:border-[#03dac6] focus:outline-none"
                  aria-label="Cardio duration in minutes"
                />
              </div>
            </div>

            <div className="p-3 bg-zinc-900/80 rounded-[12px] border border-zinc-800 flex items-center justify-between">
              <div className="text-xs font-mono">
                <span className="text-zinc-500 block text-[10px] uppercase font-sans">
                  Est. Cardio Burn (ACSM @ {sessionWeight}kg)
                </span>
                <span className="text-[#03dac6] font-bold text-base">{liveCardioCalories} kcal</span>
              </div>

              <button
                type="button"
                onClick={handleAddCardio}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-[#03dac6] hover:bg-[#34e5d3] text-black font-bold text-xs sm:text-sm shadow-md shadow-[#03dac6]/20 active:scale-95 transition-all"
                aria-label="Log Cardio Activity"
              >
                <Plus className="w-4 h-4" />
                <span>Log Cardio</span>
              </button>
            </div>
          </div>

          {/* Today's Logged Exercises in Active Session */}
          <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Logged Session Exercises</h3>
                <p className="text-xs text-zinc-400">Total progress accumulated in this workout</p>
              </div>

              <div className="flex items-center gap-3 text-xs bg-[#121212] px-3 py-1.5 rounded-lg border border-zinc-800">
                <div>
                  <span className="text-zinc-500">Volume:</span>{' '}
                  <strong className="text-[#bb86fc] font-mono">{totalVolumeToday.toLocaleString()} kg</strong>
                </div>
                <div className="h-4 w-px bg-zinc-800" />
                <div>
                  <span className="text-zinc-500">Calories:</span>{' '}
                  <strong className="text-[#03dac6] font-mono">{Math.round(totalCaloriesToday)} kcal</strong>
                </div>
              </div>
            </div>

            {dailyWorkout.weightliftingEntries.length === 0 && dailyWorkout.cardioEntries.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs bg-[#121212]/50 rounded-[12px] border border-dashed border-zinc-800">
                <Dumbbell className="w-6 h-6 mx-auto text-zinc-600 mb-1 opacity-50" />
                <p>No exercises recorded into session summary yet.</p>
                <p className="text-zinc-600 mt-0.5">Complete sets and click "Record & Add" above to save.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dailyWorkout.weightliftingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-[#141414] border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Dumbbell className="w-3.5 h-3.5 text-[#bb86fc]" />
                        <span>{entry.exerciseName}</span>
                        {entry.isUnilateral && (
                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 rounded">Unilateral</span>
                        )}
                      </div>
                      <div className="text-zinc-400 font-mono mt-0.5">
                        {entry.sets} sets × {entry.reps} reps @ {entry.weightKg}kg •{' '}
                        <span className="text-[#bb86fc] font-bold">{entry.volumeKg.toLocaleString()} kg volume</span> •{' '}
                        <span className="text-[#03dac6]">{entry.caloriesBurned} kcal ({entry.durationMins}m)</span>
                      </div>
                      {entry.notes && (
                        <p className="text-[11px] text-zinc-400 italic mt-1 bg-zinc-900 p-1.5 rounded border border-zinc-800">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteWeightlifting(entry.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {dailyWorkout.cardioEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-[#141414] border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-[#03dac6]" />
                        <span>{entry.cardioType}</span>
                      </div>
                      <div className="text-zinc-400 font-mono mt-0.5">
                        {entry.durationMins}m @ {entry.speedKmh}km/h ({entry.inclinePercent}% inc.) •{' '}
                        <span className="text-[#03dac6] font-bold">{entry.caloriesBurned} kcal</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCardio(entry.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prominent Finish Workout Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleFinishWorkout}
              className="w-full py-4 px-6 rounded-[14px] bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 hover:border-red-400 font-extrabold text-base sm:text-lg shadow-xl shadow-red-500/10 flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99]"
              aria-label="Finish Workout and open summary"
            >
              <Trophy className="w-6 h-6 text-red-300" />
              <span>Finish Workout & Generate Summary</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PHASE C: WORKOUT COMPLETION & SUMMARY POP-UP / MODAL */}
      {/* ==================================================== */}
      {phase === 'summary' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-modal-title"
        >
          <div className="w-full max-w-xl bg-[#1e1e1e] border border-zinc-700/80 rounded-[16px] p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="text-center space-y-2 border-b border-zinc-800 pb-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-[#bb86fc] to-[#03dac6] flex items-center justify-center text-black shadow-lg shadow-[#bb86fc]/30">
                <Trophy className="w-8 h-8 fill-black text-black" />
              </div>
              <h3 id="summary-modal-title" className="text-2xl font-black text-white tracking-tight">
                Workout Complete!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300">
                Outstanding effort today, <strong className="text-[#bb86fc]">{userProfile.name || 'Blesson'}</strong>! Here is your official session breakdown:
              </p>
            </div>

            {/* Key Session Metrics Grid (4 required metrics) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Total Workout Time */}
              <div className="p-3.5 rounded-[12px] bg-[#121212] border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Total Time
                </span>
                <span className="font-mono text-lg font-black text-[#03dac6] mt-1 block">
                  {formatStopwatch(stopwatchSeconds)}
                </span>
                <span className="text-[10px] text-zinc-500">Stopwatch</span>
              </div>

              {/* 2. Total Volume (kg) */}
              <div className="p-3.5 rounded-[12px] bg-[#121212] border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Total Volume
                </span>
                <span className="font-mono text-lg font-black text-[#bb86fc] mt-1 block">
                  {totalVolumeToday.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500">kg lifted</span>
              </div>

              {/* 3. Total Calories Burned */}
              <div className="p-3.5 rounded-[12px] bg-[#121212] border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Total Energy
                </span>
                <span className="font-mono text-lg font-black text-[#03dac6] mt-1 block">
                  {Math.round(totalCaloriesToday)}
                </span>
                <span className="text-[10px] text-zinc-500">kcal burned</span>
              </div>

              {/* 4. Total Sets Completed */}
              <div className="p-3.5 rounded-[12px] bg-[#121212] border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Total Sets
                </span>
                <span className="font-mono text-lg font-black text-white mt-1 block">
                  {totalSetsCompletedToday}
                </span>
                <span className="text-[10px] text-zinc-500">completed</span>
              </div>
            </div>

            {/* Exercise Details Summary List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Exercises Performed ({dailyWorkout.weightliftingEntries.length + dailyWorkout.cardioEntries.length})
              </h4>

              {dailyWorkout.weightliftingEntries.length === 0 && dailyWorkout.cardioEntries.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-3 bg-[#121212] rounded-lg">
                  No exercise entries were saved during this session.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {dailyWorkout.weightliftingEntries.map((e) => (
                    <div
                      key={e.id}
                      className="p-2.5 rounded-lg bg-[#141414] border border-zinc-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white">{e.exerciseName}</span>
                        <div className="text-zinc-400 font-mono text-[11px]">
                          {e.sets} sets × {e.reps} reps @ {e.weightKg}kg {e.isUnilateral ? '(unilateral)' : ''}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[#bb86fc] font-bold block">{e.volumeKg.toLocaleString()} kg</span>
                        <span className="text-[#03dac6] text-[10px]">{e.caloriesBurned} kcal</span>
                      </div>
                    </div>
                  ))}

                  {dailyWorkout.cardioEntries.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-[#141414] border border-zinc-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white">{c.cardioType}</span>
                        <div className="text-zinc-400 font-mono text-[11px]">
                          {c.durationMins}m @ {c.speedKmh}km/h ({c.inclinePercent}%)
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[#03dac6] font-bold">{c.caloriesBurned} kcal</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aesthetic Workout Summary Share Card & PNG Download (Requirement 6) */}
            <div className="border-t border-zinc-800 pt-4">
              <WorkoutSummaryShareCard
                dailyWorkout={dailyWorkout}
                userName={userProfile.name}
                durationSeconds={stopwatchSeconds}
                totalVolumeKg={totalVolumeToday}
                totalCalories={totalCaloriesToday}
                totalSets={totalSetsCompletedToday}
                prsAchieved={prsAchievedThisSession}
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleConfirmAndSaveWorkout}
                className="flex-1 py-3.5 px-4 rounded-[12px] bg-gradient-to-r from-[#bb86fc] to-[#03dac6] text-black font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#bb86fc]/20 flex items-center justify-center gap-2"
                aria-label="Confirm & Save Workout"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm & Save Workout</span>
              </button>

              <button
                type="button"
                onClick={handleResumeWorkout}
                className="py-3 px-4 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs sm:text-sm transition-all"
                aria-label="Resume Current Workout"
              >
                Resume Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise History Slide-Over Drawer with Recharts 1RM curve (Requirement 5) */}
      <ExerciseHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        exerciseName={activeExerciseName}
        allWorkouts={allWorkouts}
      />
    </div>
  );
};
