import {
  DailyWorkout,
  AccuniqMetric,
  SplitType,
  WeightliftingEntry,
  CustomExercise,
  UserProfile,
  DAY_OF_WEEK_SPLITS,
} from '../types/workout.ts';

const STORAGE_KEYS = {
  DAILY_LOGS: 'titanload_daily_logs_v3',
  ACCUNIQ_METRICS: 'titanload_accuniq_metrics_v3',
  EXERCISE_LIBRARY: 'titanload_exercise_library_v3',
  USER_PROFILE: 'titanload_user_profile_v3',
  INITIALIZED: 'titanload_initialized_v3',
};

// Helper: Format date as YYYY-MM-DD
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Strict Blank State Initialization:
 * 0 seed workouts, 0 preloaded exercises, 0 body metrics.
 */
export function initializeStorageIfNeeded(): void {
  if (typeof window === 'undefined') return;
  const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInit) {
    // Clear out any older seed version keys completely
    try {
      localStorage.clear();
    } catch (_) {}

    // Initialize completely empty structures
    localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.ACCUNIQ_METRICS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXERCISE_LIBRARY, JSON.stringify([]));

    // Default initial profile template for Blesson
    const defaultProfile: UserProfile = {
      name: 'Blesson',
      bodyWeightKg: 75.0,
      heightCm: 178,
      age: 26,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
}

// -------------------------------------------------------------
// USER PROFILE PERSISTENCE
// -------------------------------------------------------------

export function getUserProfile(): UserProfile {
  initializeStorageIfNeeded();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading user profile', e);
  }
  return {
    name: 'Blesson',
    bodyWeightKg: 75.0,
    heightCm: 178,
    age: 26,
    updatedAt: Date.now(),
  };
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

/**
 * Returns the global user body weight from User Profile
 * for all calorie burn calculations across the application.
 */
export function getGlobalBodyWeight(): number {
  const profile = getUserProfile();
  return profile.bodyWeightKg > 0 ? profile.bodyWeightKg : 75.0;
}

// -------------------------------------------------------------
// EXERCISE LIBRARY PERSISTENCE (Add, Edit, Delete)
// -------------------------------------------------------------

export function getExerciseLibrary(): CustomExercise[] {
  initializeStorageIfNeeded();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXERCISE_LIBRARY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed reading exercise library', e);
    return [];
  }
}

export function saveExerciseToLibrary(exercise: CustomExercise): void {
  const library = getExerciseLibrary();
  const existingIdx = library.findIndex((e) => e.id === exercise.id);
  if (existingIdx >= 0) {
    library[existingIdx] = exercise;
  } else {
    library.push(exercise);
  }
  localStorage.setItem(STORAGE_KEYS.EXERCISE_LIBRARY, JSON.stringify(library));
}

export function deleteExerciseFromLibrary(id: string): void {
  const library = getExerciseLibrary().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.EXERCISE_LIBRARY, JSON.stringify(library));
}

/**
 * Returns ONLY exercises from the library belonging to the selected split.
 * If library is empty for this split, returns an empty array.
 */
export function getExercisesForSplit(split: SplitType): CustomExercise[] {
  const library = getExerciseLibrary();
  return library.filter((e) => e.split === split);
}

// -------------------------------------------------------------
// DAILY WORKOUTS PERSISTENCE
// -------------------------------------------------------------

export function getDailyWorkouts(): Record<string, DailyWorkout> {
  initializeStorageIfNeeded();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed reading daily workouts from localStorage', e);
    return {};
  }
}

export function getDailyWorkout(date: string): DailyWorkout {
  const all = getDailyWorkouts();
  if (all[date]) return all[date];

  // Default split based on day of week
  const dateObj = parseDateKey(date);
  const dayIndex = dateObj.getDay();
  const defaultSplit = DAY_OF_WEEK_SPLITS[dayIndex] || 'Push';

  return {
    date,
    split: defaultSplit,
    weightliftingEntries: [],
    cardioEntries: [],
  };
}

export function saveDailyWorkout(workout: DailyWorkout): void {
  const all = getDailyWorkouts();
  all[workout.date] = workout;
  localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(all));
}

export function deleteDailyWorkout(date: string): void {
  const all = getDailyWorkouts();
  delete all[date];
  localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(all));
}

// -------------------------------------------------------------
// ACCUNIQ METRICS PERSISTENCE
// -------------------------------------------------------------

export function getAccuniqMetrics(): AccuniqMetric[] {
  initializeStorageIfNeeded();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCUNIQ_METRICS);
    const metrics: AccuniqMetric[] = raw ? JSON.parse(raw) : [];
    return metrics.sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    console.error('Failed reading Accuniq metrics', e);
    return [];
  }
}

export function saveAccuniqMetric(metric: AccuniqMetric): void {
  const all = getAccuniqMetrics();
  const existingIdx = all.findIndex((m) => m.date === metric.date);
  if (existingIdx >= 0) {
    all[existingIdx] = metric;
  } else {
    all.unshift(metric);
  }
  localStorage.setItem(STORAGE_KEYS.ACCUNIQ_METRICS, JSON.stringify(all));
}

export function deleteAccuniqMetric(id: string): void {
  const all = getAccuniqMetrics().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.ACCUNIQ_METRICS, JSON.stringify(all));
}

/**
 * Searches across all historical logs to find the most recent session
 * for a specific exercise before or on a given reference date.
 */
export function getLastSessionForExercise(
  exerciseName: string,
  referenceDate?: string
): WeightliftingEntry | null {
  if (!exerciseName) return null;
  const all = getDailyWorkouts();
  const sortedDates = Object.keys(all).sort((a, b) => b.localeCompare(a));

  for (const date of sortedDates) {
    if (referenceDate && date > referenceDate) continue; // Only prior or current
    const workout = all[date];
    const match = workout.weightliftingEntries.find(
      (e) => e.exerciseName.toLowerCase() === exerciseName.toLowerCase()
    );
    if (match) {
      return match;
    }
  }
  return null;
}

export interface ExerciseSessionHistoryItem {
  date: string;
  entry: WeightliftingEntry;
  estimated1RM: number;
}

/**
 * Retrieves the last N sessions for a specific exercise across all historical workouts,
 * sorted chronologically or reverse-chronologically.
 */
export function getExerciseHistorySessions(
  exerciseName: string,
  allWorkoutsInput?: Record<string, DailyWorkout>,
  limit: number = 5
): ExerciseSessionHistoryItem[] {
  if (!exerciseName) return [];
  const all = allWorkoutsInput || getDailyWorkouts();
  const sortedDates = Object.keys(all).sort((a, b) => b.localeCompare(a)); // Newest first

  const results: ExerciseSessionHistoryItem[] = [];
  const exNameLower = exerciseName.trim().toLowerCase();

  for (const date of sortedDates) {
    const workout = all[date];
    const matches = (workout.weightliftingEntries || []).filter(
      (e) => e.exerciseName.trim().toLowerCase() === exNameLower
    );

    for (const entry of matches) {
      // Calculate estimated 1RM (highest from non-warmup set or aggregate)
      let highest1RM = 0;
      if (entry.setRecords && entry.setRecords.length > 0) {
        for (const s of entry.setRecords) {
          if (s.setType === 'W') continue;
          const est = s.weightKg * (1 + s.reps / 30);
          if (est > highest1RM) highest1RM = est;
        }
      }
      if (highest1RM === 0 && entry.weightKg > 0 && entry.reps > 0) {
        highest1RM = entry.weightKg * (1 + entry.reps / 30);
      }

      results.push({
        date,
        entry,
        estimated1RM: Math.round(highest1RM * 10) / 10,
      });

      if (results.length >= limit) break;
    }

    if (results.length >= limit) break;
  }

  return results;
}

