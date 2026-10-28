import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWeightliftingVolume,
  calculateWeightliftingCalories,
  calculateCardioCalories,
  predictProgressiveOverload,
  calculateAccuniqAssessment,
} from './calculations.ts';

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
