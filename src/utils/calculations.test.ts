import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWeightliftingVolume,
  calculateAggregateSetsVolume,
  calculate1RM,
  calculateHistoricalExercisePR,
  evaluateSetPR,
  calculateWeightliftingCalories,
  calculateCardioCalories,
  predictProgressiveOverload,
  calculateAccuniqAssessment,
} from './calculations.ts';

test('1RM Epley Formula: calculates Weight × (1 + Reps/30)', () => {
  // 100 kg × 10 reps -> 100 * (1 + 1/3) = 133.3 kg
  assert.equal(calculate1RM(100, 10), 133.3);
  // 1 rep of 100kg = 100 kg
  assert.equal(calculate1RM(100, 1), 100);
  // Edge cases
  assert.equal(calculate1RM(0, 10), 0);
  assert.equal(calculate1RM(100, 0), 0);
});

test('Weightlifting Volume: excludes warm-up sets (W)', () => {
  // Normal set: 3 sets × 10 reps @ 60kg = 1800 kg
  assert.equal(calculateWeightliftingVolume(3, 10, 60, false, 'N'), 1800);
  // Warm-up set: must return 0
  assert.equal(calculateWeightliftingVolume(2, 10, 40, false, 'W'), 0);
  // Drop set: counted in volume
  assert.equal(calculateWeightliftingVolume(1, 12, 50, false, 'D'), 600);
  // Failure set: counted in volume
  assert.equal(calculateWeightliftingVolume(1, 8, 70, false, 'F'), 560);
});

test('Aggregate Sets Volume: correctly excludes warm-ups from session sum', () => {
  const sets = [
    { weightKg: 40, reps: 10, setType: 'W' as const }, // Warmup -> 0
    { weightKg: 80, reps: 8, setType: 'N' as const },  // 640
    { weightKg: 85, reps: 6, setType: 'N' as const },  // 510
    { weightKg: 60, reps: 10, setType: 'D' as const }, // Drop set -> 600
  ];
  // 640 + 510 + 600 = 1750 kg
  assert.equal(calculateAggregateSetsVolume(sets, false), 1750);
});

test('Real-time PR Evaluation: triggers PR when beating historical weight or 1RM', () => {
  const history = {
    maxWeightKg: 100,
    maxReps: 10,
    max1RM: 133.3,
  };

  // 105 kg × 10 reps -> 105 * (1 + 10/30) = 140 kg (beats both weight and 1RM)
  const prResult = evaluateSetPR(105, 10, 'N', history, 'Bench Press');
  assert.equal(prResult.isPr, true);
  assert.equal(prResult.isWeightPR, true);
  assert.equal(prResult.is1RMPR, true);
  assert.equal(prResult.badgeLabel, 'ALL-TIME PR');

  // Warm-up sets NEVER trigger PR
  const warmupResult = evaluateSetPR(110, 10, 'W', history, 'Bench Press');
  assert.equal(warmupResult.isPr, false);

  // Sub-PR set does not trigger PR
  const subResult = evaluateSetPR(90, 8, 'N', history, 'Bench Press');
  assert.equal(subResult.isPr, false);
});

test('Weightlifting Volume: standard exercise calculates Sets × Reps × Weight', () => {
  const volume = calculateWeightliftingVolume(3, 10, 60, false);
  assert.equal(volume, 1800);
});

test('Weightlifting Volume: unilateral exercise multiplies by 2', () => {
  const volume = calculateWeightliftingVolume(3, 10, 20, true);
  assert.equal(volume, 1200);
});

test('Weightlifting Volume: handles zero and invalid edge cases', () => {
  assert.equal(calculateWeightliftingVolume(0, 10, 60, false), 0);
  assert.equal(calculateWeightliftingVolume(3, 0, 60, false), 0);
  assert.equal(calculateWeightliftingVolume(3, 10, 0, false), 0);
});

test('Weightlifting Calories: 6.0 METs × Weight (kg) × (Duration / 60)', () => {
  const calories = calculateWeightliftingCalories(80, 45);
  assert.equal(calories, 360);
});

test('Cardio Calories: ACSM Treadmill formula', () => {
  const calories = calculateCardioCalories(6, 5, 30, 75);
  assert.ok(calories >= 240 && calories <= 242, `Expected ~241.1, got ${calories}`);
});

test('Progressive Overload Predictor: suggests +2.5kg when hitting 12+ reps for 3+ sets', () => {
  const result = predictProgressiveOverload({
    sets: 3,
    reps: 12,
    weightKg: 80,
    isUnilateral: false,
    timestamp: Date.now(),
  });
  assert.equal(result.recommendation, 'INCREASE_WEIGHT');
  assert.equal(result.suggestedWeightAdditionKg, 2.5);
  assert.match(result.title, /Ready for Progressive Overload/);
});

test('Progressive Overload Predictor: suggests 12+ reps when hitting 8-11 reps', () => {
  const result = predictProgressiveOverload({
    sets: 3,
    reps: 10,
    weightKg: 80,
    isUnilateral: false,
    timestamp: Date.now(),
  });
  assert.equal(result.recommendation, 'INCREASE_REPS');
  assert.equal(result.suggestedWeightAdditionKg, 0);
  assert.match(result.title, /Aim for 12\+ Reps/);
});

test('Progressive Overload Predictor: suggests maintaining weight & form when hitting < 8 reps', () => {
  const result = predictProgressiveOverload({
    sets: 3,
    reps: 6,
    weightKg: 80,
    isUnilateral: false,
    timestamp: Date.now(),
  });
  assert.equal(result.recommendation, 'MAINTAIN_FORM');
  assert.match(result.title, /Maintain Weight & Focus on Form/);
});

test('Progressive Overload Predictor: first-time session handles null gracefully', () => {
  const result = predictProgressiveOverload(null);
  assert.equal(result.recommendation, 'FIRST_TIME');
});

test('Accuniq Assessment: accurately calculates BMI, BMR, Fat Control, and Muscle Control', () => {
  // Height: 180cm, Weight: 80kg, Age: 25, Body Fat: 18%
  // Target weight: 78kg, Target PBF: 14%
  const assessment = calculateAccuniqAssessment(80, 180, 25, 18, 78, 14);

  // BMI = 80 / (1.8^2) = 80 / 3.24 = 24.7
  assert.equal(assessment.bmi, 24.7);

  // Current fat = 80 * 0.18 = 14.4 kg
  assert.equal(assessment.currentFatMassKg, 14.4);

  // Target fat = 78 * 0.14 = 10.9 kg (rounded 10.9)
  assert.equal(assessment.targetFatMassKg, 10.9);

  // Fat control = 10.9 - 14.4 = -3.5 kg fat to lose
  assert.equal(assessment.fatControlKg, -3.5);

  // Current FFM = 80 - 14.4 = 65.6 kg
  // Target FFM = 78 - 10.9 = 67.1 kg
  // Muscle control = 67.1 - 65.6 = +1.5 kg muscle to gain
  assert.equal(assessment.muscleControlKg, 1.5);
  assert.ok(assessment.bmr > 1700);
});
