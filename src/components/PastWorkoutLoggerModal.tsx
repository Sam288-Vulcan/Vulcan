import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Dumbbell,
  HeartPulse,
  Plus,
  Trash2,
  Scale,
  Layers,
  Save,
  Check,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  DailyWorkout,
  SplitType,
  SPLIT_OPTIONS,
  DAY_OF_WEEK_SPLITS,
  WeightliftingEntry,
  CardioEntry,
  CustomExercise,
  UserProfile,
} from '../types/workout.ts';
import {
  calculateWeightliftingVolume,
  calculateWeightliftingCalories,
  calculateCardioCalories,
} from '../utils/calculations.ts';
import { formatDateKey, parseDateKey } from '../utils/storage.ts';

interface PastWorkoutLoggerModalProps {
  isOpen: boolean;
  initialDate?: string;
  existingWorkout?: DailyWorkout | null;
  exerciseLibrary: CustomExercise[];
  userProfile: UserProfile;
  onSaveWorkout: (workout: DailyWorkout) => void;
  onClose: () => void;
}

interface EditableLiftingRow {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  isUnilateral: boolean;
  notes: string;
}

interface EditableCardioRow {
  id: string;
  cardioType: string;
  speedKmh: number;
  inclinePercent: number;
  durationMins: number;
}

export const PastWorkoutLoggerModal: React.FC<PastWorkoutLoggerModalProps> = ({
  isOpen,
  initialDate,
  existingWorkout,
  exerciseLibrary,
  userProfile,
  onSaveWorkout,
  onClose,
}) => {
  if (!isOpen) return null;

  const defaultDate = initialDate || formatDateKey(new Date());

  // Form State
  const [workoutDate, setWorkoutDate] = useState<string>(
    existingWorkout?.date || defaultDate
  );

  const [split, setSplit] = useState<SplitType>(() => {
    if (existingWorkout?.split) return existingWorkout.split;
    const d = parseDateKey(defaultDate);
    return DAY_OF_WEEK_SPLITS[d.getDay()] || 'Push';
  });

  const [sessionWeight, setSessionWeight] = useState<number>(() => {
    return existingWorkout?.sessionBodyWeightKg || userProfile.bodyWeightKg || 75.0;
  });

  const [startTime, setStartTime] = useState<string>(existingWorkout?.startTime || '');
  const [endTime, setEndTime] = useState<string>(existingWorkout?.endTime || '');
  const [durationMins, setDurationMins] = useState<number>(
    existingWorkout?.durationMinutes || 60
  );

  // Weightlifting rows
  const [liftingRows, setLiftingRows] = useState<EditableLiftingRow[]>(() => {
    if (existingWorkout && existingWorkout.weightliftingEntries.length > 0) {
      return existingWorkout.weightliftingEntries.map((e) => ({
        id: e.id,
        exerciseName: e.exerciseName,
        sets: e.sets,
        reps: e.reps,
        weightKg: e.weightKg,
        isUnilateral: !!e.isUnilateral,
        notes: e.notes || '',
      }));
    }
    // Default with 1 row if empty
    return [
      {
        id: `w-${Date.now()}-1`,
        exerciseName: exerciseLibrary[0]?.name || '',
        sets: 3,
        reps: 10,
        weightKg: 60,
        isUnilateral: false,
        notes: '',
      },
    ];
  });

  // Cardio rows
  const [cardioRows, setCardioRows] = useState<EditableCardioRow[]>(() => {
    if (existingWorkout && existingWorkout.cardioEntries.length > 0) {
      return existingWorkout.cardioEntries.map((c) => ({
        id: c.id,
        cardioType: c.cardioType,
        speedKmh: c.speedKmh,
        inclinePercent: c.inclinePercent,
        durationMins: c.durationMins,
      }));
    }
    return [];
  });

  // When date changes, update auto-split if not custom set
  const handleDateChange = (newDateStr: string) => {
    setWorkoutDate(newDateStr);
    const dateObj = parseDateKey(newDateStr);
    if (!isNaN(dateObj.getTime()) && !existingWorkout) {
      setSplit(DAY_OF_WEEK_SPLITS[dateObj.getDay()] || 'Push');
    }
  };

  // Add / Remove Lifting Row
  const handleAddLiftingRow = () => {
    setLiftingRows((prev) => [
      ...prev,
      {
        id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        exerciseName: exerciseLibrary[0]?.name || '',
        sets: 3,
        reps: 10,
        weightKg: 60,
        isUnilateral: false,
        notes: '',
      },
    ]);
  };

  const handleRemoveLiftingRow = (id: string) => {
    setLiftingRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateLiftingRow = (
    id: string,
    field: keyof EditableLiftingRow,
    value: string | number | boolean
  ) => {
    setLiftingRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Add / Remove Cardio Row
  const handleAddCardioRow = () => {
    setCardioRows((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        cardioType: 'Treadmill',
        speedKmh: 6.0,
        inclinePercent: 4.0,
        durationMins: 20,
      },
    ]);
  };

  const handleRemoveCardioRow = (id: string) => {
    setCardioRows((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCardioRow = (
    id: string,
    field: keyof EditableCardioRow,
    value: string | number
  ) => {
    setCardioRows((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Live calculations
  const totalVolume = liftingRows.reduce((acc, row) => {
    return (
      acc +
      calculateWeightliftingVolume(
        Number(row.sets),
        Number(row.reps),
        Number(row.weightKg),
        row.isUnilateral
      )
    );
  }, 0);

  const liftingDurationPerExercise = Math.max(
    5,
    Math.round(durationMins / Math.max(1, liftingRows.length))
  );

  const totalCalories =
    liftingRows.reduce((acc) => {
      return (
        acc +
        calculateWeightliftingCalories(sessionWeight, liftingDurationPerExercise)
      );
    }, 0) +
    cardioRows.reduce((acc, row) => {
      return (
        acc +
        calculateCardioCalories(
          Number(row.speedKmh),
          Number(row.inclinePercent),
          Number(row.durationMins),
          sessionWeight
        )
      );
    }, 0);

  // Submit & Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutDate) return;

    // Build WeightliftingEntry items
    const weightliftingEntries: WeightliftingEntry[] = liftingRows
      .filter((r) => r.exerciseName.trim().length > 0)
      .map((r) => {
        const volumeKg = calculateWeightliftingVolume(
          Number(r.sets),
          Number(r.reps),
          Number(r.weightKg),
          r.isUnilateral
        );
        const caloriesBurned = calculateWeightliftingCalories(
          sessionWeight,
          liftingDurationPerExercise
        );
        return {
          id: r.id,
          exerciseName: r.exerciseName.trim(),
          split,
          sets: Number(r.sets),
          reps: Number(r.reps),
          weightKg: Number(r.weightKg),
          isUnilateral: r.isUnilateral,
          durationMins: liftingDurationPerExercise,
          volumeKg,
          caloriesBurned,
          notes: r.notes.trim() || undefined,
          timestamp: Date.now(),
        };
      });

    // Build CardioEntry items
    const cardioEntries: CardioEntry[] = cardioRows.map((c) => {
      const caloriesBurned = calculateCardioCalories(
        Number(c.speedKmh),
        Number(c.inclinePercent),
        Number(c.durationMins),
        sessionWeight
      );
      return {
        id: c.id,
        cardioType: c.cardioType,
        speedKmh: Number(c.speedKmh),
        inclinePercent: Number(c.inclinePercent),
        durationMins: Number(c.durationMins),
        caloriesBurned,
        timestamp: Date.now(),
      };
    });

    const workoutToSave: DailyWorkout = {
      date: workoutDate,
      split,
      sessionBodyWeightKg: Number(sessionWeight),
      durationMinutes: Number(durationMins),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      weightliftingEntries,
      cardioEntries,
      notes: existingWorkout?.notes,
    };

    onSaveWorkout(workoutToSave);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="past-workout-title"
    >
      <div className="w-full max-w-3xl bg-[#1e1e1e] border border-zinc-800 rounded-[16px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#bb86fc]/20 text-[#bb86fc]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 id="past-workout-title" className="text-lg font-black text-white">
                {existingWorkout ? 'Edit Workout Session' : 'Log Past Workout'}
              </h3>
              <p className="text-xs text-zinc-400">
                Retroactively log or update workouts, exercises, volume, and calories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Top Session Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#121212] p-4 rounded-[12px] border border-zinc-800">
            {/* 1. Date Picker */}
            <div>
              <label
                htmlFor="past-date"
                className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1"
              >
                Workout Date *
              </label>
              <input
                id="past-date"
                type="date"
                value={workoutDate}
                onChange={(e) => handleDateChange(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-white focus:border-[#bb86fc] focus:outline-none"
              />
            </div>

            {/* 2. Split Selector */}
            <div>
              <label
                htmlFor="past-split"
                className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1"
              >
                Muscle Split *
              </label>
              <select
                id="past-split"
                value={split}
                onChange={(e) => setSplit(e.target.value as SplitType)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:border-[#bb86fc] focus:outline-none"
              >
                {SPLIT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Session Body Weight */}
            <div>
              <label
                htmlFor="past-weight"
                className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1"
              >
                Body Weight (kg)
              </label>
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5">
                <input
                  id="past-weight"
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={sessionWeight}
                  onChange={(e) => setSessionWeight(Number(e.target.value))}
                  className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                />
                <span className="text-[10px] text-[#03dac6] font-bold">kg</span>
              </div>
            </div>

            {/* 4. Total Duration (mins) */}
            <div>
              <label
                htmlFor="past-duration"
                className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1"
              >
                Duration (mins)
              </label>
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5">
                <input
                  id="past-duration"
                  type="number"
                  min="5"
                  max="300"
                  value={durationMins}
                  onChange={(e) => setDurationMins(Math.max(5, Number(e.target.value)))}
                  className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 font-bold">mins</span>
              </div>
            </div>
          </div>

          {/* Optional Start & End Times */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-[#121212]/50 p-3 rounded-lg border border-zinc-800/80">
            <span className="text-zinc-400 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#03dac6]" />
              <span>Optional Session Times:</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-xs"
                title="Start time"
              />
              <span className="text-zinc-500">to</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-xs"
                title="End time"
              />
            </div>
          </div>

          {/* Weightlifting Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#bb86fc]" />
                <h4 className="text-sm font-bold text-white">Weightlifting Exercises</h4>
              </div>

              <button
                type="button"
                onClick={handleAddLiftingRow}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#bb86fc]/20 hover:bg-[#bb86fc]/30 text-[#bb86fc] text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exercise</span>
              </button>
            </div>

            {liftingRows.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-3 bg-[#121212] rounded-lg">
                No exercises added yet. Click "+ Add Exercise" above.
              </p>
            ) : (
              <div className="space-y-3">
                {liftingRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="p-3.5 rounded-[12px] bg-[#141414] border border-zinc-800 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Exercise Name Dropdown / Input */}
                      <div className="flex-1 min-w-[200px]">
                        <label
                          htmlFor={`row-${row.id}-name`}
                          className="text-[10px] uppercase font-bold text-zinc-400 block mb-1"
                        >
                          Exercise #{idx + 1}
                        </label>
                        {exerciseLibrary.length > 0 ? (
                          <select
                            id={`row-${row.id}-name`}
                            value={row.exerciseName}
                            onChange={(e) =>
                              handleUpdateLiftingRow(row.id, 'exerciseName', e.target.value)
                            }
                            className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-[#bb86fc] focus:outline-none"
                          >
                            <option value="">-- Choose from Library or Type Below --</option>
                            {exerciseLibrary.map((ex) => (
                              <option key={ex.id} value={ex.name}>
                                {ex.name} ({ex.split})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`row-${row.id}-name`}
                            type="text"
                            placeholder="e.g. Incline Bench Press"
                            value={row.exerciseName}
                            onChange={(e) =>
                              handleUpdateLiftingRow(row.id, 'exerciseName', e.target.value)
                            }
                            className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-[#bb86fc] focus:outline-none"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLiftingRow(row.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors ml-auto mt-4"
                        title="Delete Exercise"
                        aria-label={`Delete Exercise ${idx + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Numeric parameters: Sets, Reps, Weight, Unilateral */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-[#121212] p-2 rounded-lg border border-zinc-800">
                        <label
                          htmlFor={`row-${row.id}-sets`}
                          className="text-[10px] text-zinc-400 font-bold uppercase block"
                        >
                          Sets
                        </label>
                        <input
                          id={`row-${row.id}-sets`}
                          type="number"
                          min="1"
                          max="20"
                          value={row.sets}
                          onChange={(e) =>
                            handleUpdateLiftingRow(row.id, 'sets', Number(e.target.value))
                          }
                          className="w-full bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#121212] p-2 rounded-lg border border-zinc-800">
                        <label
                          htmlFor={`row-${row.id}-reps`}
                          className="text-[10px] text-zinc-400 font-bold uppercase block"
                        >
                          Reps
                        </label>
                        <input
                          id={`row-${row.id}-reps`}
                          type="number"
                          min="1"
                          max="50"
                          value={row.reps}
                          onChange={(e) =>
                            handleUpdateLiftingRow(row.id, 'reps', Number(e.target.value))
                          }
                          className="w-full bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#121212] p-2 rounded-lg border border-zinc-800">
                        <label
                          htmlFor={`row-${row.id}-weight`}
                          className="text-[10px] text-zinc-400 font-bold uppercase block"
                        >
                          Weight (kg)
                        </label>
                        <input
                          id={`row-${row.id}-weight`}
                          type="number"
                          step="2.5"
                          min="0"
                          max="300"
                          value={row.weightKg}
                          onChange={(e) =>
                            handleUpdateLiftingRow(row.id, 'weightKg', Number(e.target.value))
                          }
                          className="w-full bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                        />
                      </div>

                      <label
                        htmlFor={`row-${row.id}-unilateral`}
                        className="bg-[#121212] p-2 rounded-lg border border-zinc-800 flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          id={`row-${row.id}-unilateral`}
                          type="checkbox"
                          checked={row.isUnilateral}
                          onChange={(e) =>
                            handleUpdateLiftingRow(row.id, 'isUnilateral', e.target.checked)
                          }
                          className="accent-[#bb86fc] w-4 h-4 cursor-pointer"
                        />
                        <div className="text-[11px] font-semibold text-zinc-300 leading-tight">
                          Unilateral <span className="text-[9px] text-zinc-500 block">(Vol ×2)</span>
                        </div>
                      </label>
                    </div>

                    {/* Technique Notes */}
                    <input
                      type="text"
                      placeholder="Optional notes: e.g. RPE 8.5, paused reps"
                      value={row.notes}
                      onChange={(e) =>
                        handleUpdateLiftingRow(row.id, 'notes', e.target.value)
                      }
                      className="w-full bg-[#121212] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                      aria-label="Exercise Notes"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cardio Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#03dac6]" />
                <h4 className="text-sm font-bold text-white">Cardio Activities</h4>
              </div>

              <button
                type="button"
                onClick={handleAddCardioRow}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#03dac6]/20 hover:bg-[#03dac6]/30 text-[#03dac6] text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cardio</span>
              </button>
            </div>

            {cardioRows.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-[12px] bg-[#141414] border border-zinc-800 flex flex-wrap items-center gap-3 text-xs"
              >
                <select
                  value={c.cardioType}
                  onChange={(e) => handleUpdateCardioRow(c.id, 'cardioType', e.target.value)}
                  className="bg-[#121212] border border-zinc-700 rounded px-2 py-1 text-white font-medium"
                  aria-label="Cardio Type"
                >
                  <option value="Treadmill">Treadmill</option>
                  <option value="Elliptical">Elliptical</option>
                  <option value="Stationary Bike">Stationary Bike</option>
                  <option value="Rowing Machine">Rowing Machine</option>
                  <option value="Stair Climber">Stair Climber</option>
                  <option value="Outdoor Run">Outdoor Run</option>
                </select>

                <div className="flex items-center gap-1 bg-[#121212] px-2 py-1 rounded border border-zinc-800">
                  <span className="text-zinc-500 text-[10px]">Speed:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={c.speedKmh}
                    onChange={(e) => handleUpdateCardioRow(c.id, 'speedKmh', Number(e.target.value))}
                    className="w-12 bg-transparent text-white font-mono font-bold text-center"
                    aria-label="Speed km/h"
                  />
                  <span className="text-[10px] text-zinc-500">km/h</span>
                </div>

                <div className="flex items-center gap-1 bg-[#121212] px-2 py-1 rounded border border-zinc-800">
                  <span className="text-zinc-500 text-[10px]">Incline:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={c.inclinePercent}
                    onChange={(e) => handleUpdateCardioRow(c.id, 'inclinePercent', Number(e.target.value))}
                    className="w-10 bg-transparent text-white font-mono font-bold text-center"
                    aria-label="Incline percent"
                  />
                  <span className="text-[10px] text-zinc-500">%</span>
                </div>

                <div className="flex items-center gap-1 bg-[#121212] px-2 py-1 rounded border border-zinc-800">
                  <span className="text-zinc-500 text-[10px]">Time:</span>
                  <input
                    type="number"
                    value={c.durationMins}
                    onChange={(e) => handleUpdateCardioRow(c.id, 'durationMins', Number(e.target.value))}
                    className="w-12 bg-transparent text-white font-mono font-bold text-center"
                    aria-label="Duration mins"
                  />
                  <span className="text-[10px] text-zinc-500">m</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCardioRow(c.id)}
                  className="p-1 text-zinc-500 hover:text-red-400 ml-auto"
                  aria-label="Delete cardio row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Live Totals Banner */}
          <div className="p-3.5 bg-zinc-900 rounded-[12px] border border-zinc-800 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-sans">
                Calculated Volume
              </span>
              <span className="text-[#bb86fc] font-bold text-base">
                {totalVolume.toLocaleString()} kg
              </span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-sans">
                Estimated Energy Burned
              </span>
              <span className="text-[#03dac6] font-bold text-base">
                {Math.round(totalCalories)} kcal
              </span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-[12px] bg-gradient-to-r from-[#bb86fc] to-[#03dac6] text-black font-extrabold text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#bb86fc]/20"
            >
              <Save className="w-4 h-4" />
              <span>{existingWorkout ? 'Save Changes' : 'Save Past Workout'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
