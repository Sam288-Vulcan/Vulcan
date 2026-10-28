import { WeightliftingEntry } from '../types/workout.ts';

/**
 * Weightlifting Volume = Sets × Reps × Weight × (Unilateral ? 2 : 1)
 */
export function calculateWeightliftingVolume(
  sets: number,
  reps: number,
  weightKg: number,
  isUnilateral: boolean
): number {
  if (sets <= 0 || reps <= 0 || weightKg <= 0) return 0;
  const multiplier = isUnilateral ? 2 : 1;
  const volume = sets * reps * weightKg * multiplier;
  return Math.round(volume * 100) / 100;
}

/**
 * Weightlifting Calories = 6.0 METs × User Body Weight (kg) × (Duration in mins / 60)
 */
export function calculateWeightliftingCalories(
  bodyWeightKg: number,
  durationMins: number,
  met: number = 6.0
): number {
  if (bodyWeightKg <= 0 || durationMins <= 0) return 0;
  const calories = met * bodyWeightKg * (durationMins / 60);
  return Math.round(calories * 10) / 10;
}

/**
 * Cardio Calories (ACSM Treadmill Formula):
 * speed_m_min = speed (km/h) * 16.67
 * grade = incline (%) / 100
 * VO2 = (0.1 * speed_m_min) + (1.8 * speed_m_min * grade) + 3.5
 * MET = VO2 / 3.5
 * Calories = MET * User Body Weight (kg) * (Duration in mins / 60)
 */
export function calculateCardioCalories(
  speedKmh: number,
  inclinePercent: number,
  durationMins: number,
  bodyWeightKg: number
): number {
  if (durationMins <= 0 || bodyWeightKg <= 0) return 0;
  // If stationary or zero speed, fallback to baseline 3.5 METs
  if (speedKmh <= 0) {
    const baselineMet = 3.5;
    return Math.round(baselineMet * bodyWeightKg * (durationMins / 60) * 10) / 10;
  }

  const speedMMin = speedKmh * 16.67;
  const grade = Math.max(0, inclinePercent) / 100;
  const vo2 = 0.1 * speedMMin + 1.8 * speedMMin * grade + 3.5;
  const met = vo2 / 3.5;
  const calories = met * bodyWeightKg * (durationMins / 60);
  return Math.round(calories * 10) / 10;
}

export interface OverloadSuggestion {
  recommendation: 'INCREASE_WEIGHT' | 'INCREASE_REPS' | 'MAINTAIN_FORM' | 'FIRST_TIME';
  title: string;
  message: string;
  suggestedWeightAdditionKg: number;
  lastSessionSummary?: string;
  badgeColor: 'purple' | 'teal' | 'zinc';
}

/**
 * Progressive Overload Predictor:
 * Looks at the user's last logged session for the selected exercise.
 * If they hit 12+ reps for 3 sets last time, suggest increasing the weight by 2.5kg.
 * If 8-11 reps, suggest hitting 12+ reps.
 * If less, suggest maintaining weight and focusing on form.
 */
export function predictProgressiveOverload(
  lastEntry?: Pick<WeightliftingEntry, 'sets' | 'reps' | 'weightKg' | 'isUnilateral' | 'timestamp'> | null
): OverloadSuggestion {
  if (!lastEntry) {
    return {
      recommendation: 'FIRST_TIME',
      title: 'First Logged Session',
      message: 'No previous session recorded. Choose a weight where you can achieve 3 clean sets of 8–12 reps with good form.',
      suggestedWeightAdditionKg: 0,
      badgeColor: 'zinc',
    };
  }

  const lastSummary = `${lastEntry.sets} sets × ${lastEntry.reps} reps @ ${lastEntry.weightKg} kg${
    lastEntry.isUnilateral ? ' (unilateral)' : ''
  }`;

  // If hit 12+ reps for 3+ sets
  if (lastEntry.sets >= 3 && lastEntry.reps >= 12) {
    const nextWeight = lastEntry.weightKg + 2.5;
    return {
      recommendation: 'INCREASE_WEIGHT',
      title: 'Ready for Progressive Overload! (+2.5 kg)',
      message: `You completed ${lastEntry.sets} sets of ${lastEntry.reps} reps last time! Overload threshold met. Bump the weight to ${nextWeight} kg today.`,
      suggestedWeightAdditionKg: 2.5,
      lastSessionSummary: lastSummary,
      badgeColor: 'teal',
    };
  }

  // If hit 8-11 reps
  if (lastEntry.reps >= 8 && lastEntry.reps <= 11) {
    return {
      recommendation: 'INCREASE_REPS',
      title: 'Aim for 12+ Reps with Current Weight',
      message: `You hit ${lastEntry.reps} reps last session. Keep the weight at ${lastEntry.weightKg} kg and push to achieve 12+ reps across all sets before adding load.`,
      suggestedWeightAdditionKg: 0,
      lastSessionSummary: lastSummary,
      badgeColor: 'purple',
    };
  }

  // If less than 8 reps (or sets < 3)
  return {
    recommendation: 'MAINTAIN_FORM',
    title: 'Maintain Weight & Focus on Form',
    message: `You hit ${lastEntry.reps} reps last session. Maintain ${lastEntry.weightKg} kg, control the tempo (2s down, 1s pause), and prioritize form until reaching 8+ reps.`,
    suggestedWeightAdditionKg: 0,
    lastSessionSummary: lastSummary,
    badgeColor: 'zinc',
  };
}

export interface AccuniqAssessmentResult {
  bmi: number;
  bmiClassification: string;
  bmr: number;
  currentFatMassKg: number;
  currentFfmKg: number;
  targetWeightKg: number;
  targetBodyFatPercent: number;
  targetFatMassKg: number;
  targetFfmKg: number;
  fatControlKg: number; // e.g. -2.5 kg means lose 2.5 kg fat
  muscleControlKg: number; // e.g. +1.8 kg means gain 1.8 kg muscle
  actionAdvice: string;
}

/**
 * Advanced Accuniq Clinical Assessment & Body Target Calculations:
 * Calculates BMI, BMR, Target Weight, Target PBF, Fat Control, and Muscle Control.
 */
export function calculateAccuniqAssessment(
  currentWeightKg: number,
  heightCm: number,
  age: number,
  currentBodyFatPercent: number,
  userTargetWeightKg?: number,
  userTargetBodyFatPercent?: number
): AccuniqAssessmentResult {
  const heightInMeters = (heightCm > 0 ? heightCm : 178) / 100;
  const userAge = age > 0 ? age : 26;

  // 1. BMI = weight / (height^2)
  const bmi =
    heightInMeters > 0 && currentWeightKg > 0
      ? Math.round((currentWeightKg / (heightInMeters * heightInMeters)) * 10) / 10
      : 22.0;

  let bmiClassification = 'Normal Weight';
  if (bmi < 18.5) bmiClassification = 'Underweight';
  else if (bmi >= 18.5 && bmi < 25.0) bmiClassification = 'Optimal / Athletic';
  else if (bmi >= 25.0 && bmi < 30.0) bmiClassification = 'Overweight / High Mass';
  else bmiClassification = 'Athletic Hypertrophy';

  // 2. BMR (Mifflin-St Jeor formula)
  const bmr =
    currentWeightKg > 0 && heightCm > 0
      ? Math.round(10 * currentWeightKg + 6.25 * heightCm - 5 * userAge + 5)
      : 1750;

  // 3. Current Fat Mass & Fat Free Mass
  const currentFatMassKg =
    Math.round(currentWeightKg * (currentBodyFatPercent / 100) * 10) / 10;
  const currentFfmKg = Math.round((currentWeightKg - currentFatMassKg) * 10) / 10;

  // 4. Target Weight & Target PBF
  // Standard clinical ideal weight is BMI 22.0 if not provided
  const idealWeight = Math.round(22.0 * (heightInMeters * heightInMeters) * 10) / 10;
  const targetWeight =
    userTargetWeightKg && userTargetWeightKg > 0 ? userTargetWeightKg : idealWeight;
  const targetPbf =
    userTargetBodyFatPercent && userTargetBodyFatPercent > 0
      ? userTargetBodyFatPercent
      : 14.0;

  // 5. Target Fat Mass & Target Lean Mass (FFM)
  const targetFatMassKg = Math.round(targetWeight * (targetPbf / 100) * 10) / 10;
  const targetFfmKg = Math.round((targetWeight - targetFatMassKg) * 10) / 10;

  // 6. Fat Control & Muscle Control
  // Fat Control = Target Fat Mass - Current Fat Mass
  const fatControlKg = Math.round((targetFatMassKg - currentFatMassKg) * 10) / 10;

  // Muscle Control = Target FFM - Current FFM
  const muscleControlKg = Math.round((targetFfmKg - currentFfmKg) * 10) / 10;

  // Action advice string
  let advice = '';
  if (fatControlKg < -0.5 && muscleControlKg > 0.5) {
    advice = `Body Recomposition: Recommend reducing ~${Math.abs(
      fatControlKg
    )} kg of fat mass while adding ~${muscleControlKg} kg of lean muscle mass through progressive overload and caloric maintenance.`;
  } else if (fatControlKg < -0.5) {
    advice = `Fat Reduction Phase: Recommend reducing ~${Math.abs(
      fatControlKg
    )} kg of fat mass while maintaining current lean muscle mass with high protein intake.`;
  } else if (muscleControlKg > 0.5) {
    advice = `Hypertrophy Mass Phase: Recommend adding ~${muscleControlKg} kg of functional skeletal muscle mass with a mild caloric surplus (+250 kcal/day).`;
  } else {
    advice = `Maintenance & Peak Conditioning: Current body composition is in prime alignment with target athletic parameters.`;
  }

  return {
    bmi,
    bmiClassification,
    bmr,
    currentFatMassKg,
    currentFfmKg,
    targetWeightKg: targetWeight,
    targetBodyFatPercent: targetPbf,
    targetFatMassKg,
    targetFfmKg,
    fatControlKg,
    muscleControlKg,
    actionAdvice: advice,
  };
}
