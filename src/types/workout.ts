export type SplitType =
  | 'Push'
  | 'Pull'
  | 'Legs'
  | 'Rest/Cardio'
  | 'Upper'
  | 'Lower'
  | 'Rest';

export interface CustomExercise {
  id: string;
  name: string;
  split: SplitType;
  description?: string;
  personalBest?: string; // Optional PB (e.g. "100 kg × 5 reps")
  defaultRestSeconds?: number; // e.g. 60, 90, 120, 180, 240
  createdAt: number;
}

export interface UserProfile {
  name: string;
  bodyWeightKg: number;
  heightCm: number;
  age: number;
  updatedAt: number;
}

export type SetType = 'N' | 'W' | 'D' | 'F';

export interface SetRecord {
  setNumber: number;
  weightKg: number;
  reps: number;
  setType: SetType; // 'N': Normal, 'W': Warm-Up, 'D': Drop Set, 'F': Failure
  isCompleted?: boolean;
  completedAt?: number;
  isPr?: boolean;
  estimated1RM?: number;
}

export interface WeightliftingEntry {
  id: string;
  exerciseName: string;
  split: SplitType;
  sets: number;
  reps: number;
  weightKg: number;
  isUnilateral: boolean;
  durationMins: number;
  volumeKg: number;
  caloriesBurned: number;
  notes?: string; // Set & exercise notes / technique cues
  setRecords?: SetRecord[];
  prsAchieved?: string[];
  timestamp: number;
}

export interface CardioEntry {
  id: string;
  cardioType: string;
  speedKmh: number;
  inclinePercent: number;
  durationMins: number;
  caloriesBurned: number;
  timestamp: number;
}

export interface DailyWorkout {
  date: string; // YYYY-MM-DD
  split: SplitType;
  sessionBodyWeightKg?: number; // Dynamic session weight for the workout
  durationMinutes?: number; // Total workout duration in mins
  startTime?: string; // Optional start time (e.g. "09:00")
  endTime?: string; // Optional end time (e.g. "10:15")
  weightliftingEntries: WeightliftingEntry[];
  cardioEntries: CardioEntry[];
  notes?: string;
}

export interface AccuniqMetric {
  id: string;
  date: string; // YYYY-MM-DD
  bodyWeightKg: number;
  bodyFatPercent: number;
  skeletalMuscleMassKg: number;
  // Advanced Accuniq analysis & target metrics
  targetWeightKg?: number;
  targetBodyFatPercent?: number;
  bmi?: number;
  bmr?: number;
  fatControlKg?: number; // Recommended kg of fat to gain/lose
  muscleControlKg?: number; // Recommended kg of muscle to gain/lose
  timestamp: number;
}

export const DAY_OF_WEEK_SPLITS: Record<number, SplitType> = {
  0: 'Push', // Sunday
  1: 'Pull', // Monday
  2: 'Legs', // Tuesday
  3: 'Rest/Cardio', // Wednesday
  4: 'Upper', // Thursday
  5: 'Lower', // Friday
  6: 'Rest', // Saturday
};

export const SPLIT_OPTIONS: SplitType[] = [
  'Push',
  'Pull',
  'Legs',
  'Rest/Cardio',
  'Upper',
  'Lower',
  'Rest',
];
