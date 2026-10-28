import React, { useState, useMemo } from 'react';
import {
  Activity,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Scale,
  Percent,
  Dumbbell,
  Calendar as CalendarIcon,
  CheckCircle,
  Target,
  Sparkles,
  Flame,
  Calculator,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { AccuniqMetric, UserProfile } from '../types/workout.ts';
import { formatDateKey } from '../utils/storage.ts';
import { calculateAccuniqAssessment } from '../utils/calculations.ts';

interface AccuniqViewProps {
  metrics: AccuniqMetric[];
  userProfile?: UserProfile;
  onSaveMetric: (metric: AccuniqMetric) => void;
  onDeleteMetric: (id: string) => void;
}

export const AccuniqView: React.FC<AccuniqViewProps> = ({
  metrics,
  userProfile,
  onSaveMetric,
  onDeleteMetric,
}) => {
  const todayStr = formatDateKey(new Date());
  const userHeight = userProfile?.heightCm || 178;
  const userAge = userProfile?.age || 26;

  // Form State
  const [date, setDate] = useState<string>(todayStr);
  const [bodyWeightKg, setBodyWeightKg] = useState<string>('77.0');
  const [bodyFatPercent, setBodyFatPercent] = useState<string>('15.0');
  const [skeletalMuscleMassKg, setSkeletalMuscleMassKg] = useState<string>('37.0');

  // Body Composition Targets
  const [targetWeightKg, setTargetWeightKg] = useState<string>('75.0');
  const [targetBodyFatPercent, setTargetBodyFatPercent] = useState<string>('13.0');

  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const numWeight = parseFloat(bodyWeightKg) || 0;
  const numFat = parseFloat(bodyFatPercent) || 0;
  const numSmm = parseFloat(skeletalMuscleMassKg) || 0;
  const numTargetWeight = parseFloat(targetWeightKg) || 0;
  const numTargetFat = parseFloat(targetBodyFatPercent) || 0;

  // Real-time assessment based on current inputs or latest metric
  const liveAssessment = useMemo(() => {
    return calculateAccuniqAssessment(
      numWeight > 0 ? numWeight : 75,
      userHeight,
      userAge,
      numFat > 0 ? numFat : 15,
      numTargetWeight > 0 ? numTargetWeight : undefined,
      numTargetFat > 0 ? numTargetFat : undefined
    );
  }, [numWeight, userHeight, userAge, numFat, numTargetWeight, numTargetFat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numWeight <= 0) return;
    if (numFat < 0) return;
    if (numSmm <= 0) return;

    const assessment = calculateAccuniqAssessment(
      numWeight,
      userHeight,
      userAge,
      numFat,
      numTargetWeight > 0 ? numTargetWeight : undefined,
      numTargetFat > 0 ? numTargetFat : undefined
    );

    const newMetric: AccuniqMetric = {
      id: `acc-${Date.now()}`,
      date,
      bodyWeightKg: Math.round(numWeight * 10) / 10,
      bodyFatPercent: Math.round(numFat * 10) / 10,
      skeletalMuscleMassKg: Math.round(numSmm * 10) / 10,
      targetWeightKg: assessment.targetWeightKg,
      targetBodyFatPercent: assessment.targetBodyFatPercent,
      bmi: assessment.bmi,
      bmr: assessment.bmr,
      fatControlKg: assessment.fatControlKg,
      muscleControlKg: assessment.muscleControlKg,
      timestamp: new Date(date).getTime(),
    };

    onSaveMetric(newMetric);
    setSuccessNotice(`Accuniq metrics & targets recorded for ${date}!`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const latestMetric = metrics[0] || null;
  const previousMetric = metrics[1] || null;

  const weightDiff =
    latestMetric && previousMetric
      ? Math.round((latestMetric.bodyWeightKg - previousMetric.bodyWeightKg) * 10) / 10
      : null;
  const fatDiff =
    latestMetric && previousMetric
      ? Math.round((latestMetric.bodyFatPercent - previousMetric.bodyFatPercent) * 10) / 10
      : null;
  const smmDiff =
    latestMetric && previousMetric
      ? Math.round((latestMetric.skeletalMuscleMassKg - previousMetric.skeletalMuscleMassKg) * 10) / 10
      : null;

  // Active Assessment for the top assessment card
  const displayAssessment = useMemo(() => {
    if (latestMetric) {
      return calculateAccuniqAssessment(
        latestMetric.bodyWeightKg,
        userHeight,
        userAge,
        latestMetric.bodyFatPercent,
        latestMetric.targetWeightKg,
        latestMetric.targetBodyFatPercent
      );
    }
    return liveAssessment;
  }, [latestMetric, userHeight, userAge, liveAssessment]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Title Header */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-[#03dac6]/20 to-[#bb86fc]/20 text-[#03dac6]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Accuniq Clinical Body Scanner & Targets
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
              Advanced Body Composition, BMI, BMR, Fat Control, and Muscle Control action plan.
            </p>
          </div>
        </div>

        {/* Latest Metric Quick Cards (if metrics exist) */}
        {latestMetric && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-zinc-800">
            {/* Body Weight */}
            <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800/90">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                <span className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#bb86fc]" /> Body Weight
                </span>
                {weightDiff !== null && (
                  <span
                    className={`inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      weightDiff <= 0
                        ? 'text-[#03dac6] bg-[#03dac6]/10'
                        : 'text-amber-400 bg-amber-400/10'
                    }`}
                  >
                    {weightDiff <= 0 ? (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    )}
                    {weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg
                  </span>
                )}
              </div>
              <p className="font-mono text-2xl font-extrabold text-white mt-1">
                {latestMetric.bodyWeightKg}{' '}
                <span className="text-xs font-sans text-zinc-400">kg</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">As of {latestMetric.date}</p>
            </div>

            {/* Body Fat % */}
            <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800/90">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#03dac6]" /> Body Fat %
                </span>
                {fatDiff !== null && (
                  <span
                    className={`inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      fatDiff <= 0
                        ? 'text-[#03dac6] bg-[#03dac6]/10'
                        : 'text-rose-400 bg-rose-400/10'
                    }`}
                  >
                    {fatDiff <= 0 ? (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    )}
                    {fatDiff > 0 ? `+${fatDiff}` : fatDiff}%
                  </span>
                )}
              </div>
              <p className="font-mono text-2xl font-extrabold text-[#03dac6] mt-1">
                {latestMetric.bodyFatPercent}%
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Clinical lipid composition</p>
            </div>

            {/* Skeletal Muscle Mass (SMM) */}
            <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800/90">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[#bb86fc]" /> Skeletal Muscle (SMM)
                </span>
                {smmDiff !== null && (
                  <span
                    className={`inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      smmDiff >= 0
                        ? 'text-[#bb86fc] bg-[#bb86fc]/10'
                        : 'text-zinc-400 bg-zinc-800'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    {smmDiff > 0 ? `+${smmDiff}` : smmDiff} kg
                  </span>
                )}
              </div>
              <p className="font-mono text-2xl font-extrabold text-[#bb86fc] mt-1">
                {latestMetric.skeletalMuscleMassKg}{' '}
                <span className="text-xs font-sans text-zinc-400">kg</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Active contractile mass</p>
            </div>
          </div>
        )}
      </div>

      {/* DEDICATED ACCUNIQ BODY ASSESSMENT & ACTION PLAN CARD */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#bb86fc]/20 text-[#bb86fc]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Accuniq Body Assessment & Action Plan</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#03dac6]/20 text-[#03dac6] border border-[#03dac6]/40 uppercase tracking-wider">
                  Target Analytics
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Calculated fat control and muscle control based on clinical anthropometric formulas
              </p>
            </div>
          </div>
        </div>

        {/* 4 Assessment Grid Cards: BMI, BMR, Fat Control, Muscle Control */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. BMI Card */}
          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-[#bb86fc]" /> Body Mass Index (BMI)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-white">
                {displayAssessment.bmi}
              </span>
              <span className="text-[10px] text-[#03dac6] font-semibold">
                {displayAssessment.bmiClassification}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Height reference: {userHeight} cm</p>
          </div>

          {/* 2. BMR Card */}
          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Basal Metabolic Rate (BMR)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-amber-300">
                {displayAssessment.bmr.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-400 font-sans">kcal/day</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Mifflin-St Jeor clinical expenditure</p>
          </div>

          {/* 3. Fat Control Card */}
          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-[#03dac6]" /> Fat Control Target
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`font-mono text-2xl font-black ${
                  displayAssessment.fatControlKg < 0 ? 'text-[#03dac6]' : 'text-zinc-200'
                }`}
              >
                {displayAssessment.fatControlKg <= 0
                  ? `${displayAssessment.fatControlKg} kg`
                  : `+${displayAssessment.fatControlKg} kg`}
              </span>
              <span className="text-[11px] text-zinc-400">
                {displayAssessment.fatControlKg < 0 ? '(to lose)' : '(to gain)'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Target PBF: {displayAssessment.targetBodyFatPercent}%
            </p>
          </div>

          {/* 4. Muscle Control Card */}
          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-[#bb86fc]" /> Muscle Control Target
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`font-mono text-2xl font-black ${
                  displayAssessment.muscleControlKg > 0 ? 'text-[#bb86fc]' : 'text-emerald-400'
                }`}
              >
                {displayAssessment.muscleControlKg > 0
                  ? `+${displayAssessment.muscleControlKg} kg`
                  : `${displayAssessment.muscleControlKg} kg`}
              </span>
              <span className="text-[11px] text-zinc-400">
                {displayAssessment.muscleControlKg > 0 ? '(to build)' : '(maintain)'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Target FFM: {displayAssessment.targetFfmKg} kg
            </p>
          </div>
        </div>

        {/* Action Plan Guidance Banner */}
        <div className="p-4 bg-gradient-to-r from-[#bb86fc]/10 to-[#03dac6]/10 border border-[#bb86fc]/30 rounded-[12px] flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#bb86fc] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Prescribed Action Plan
            </h4>
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
              {displayAssessment.actionAdvice}
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="p-3 bg-[#03dac6]/10 border border-[#03dac6]/40 text-[#03dac6] rounded-[12px] flex items-center gap-2 text-sm font-semibold animate-fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Metric Logging Form with Target Controls */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4"
        aria-label="Accuniq Metrics Logging Form"
      >
        <div className="border-b border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#bb86fc]" />
            <span>Log New Accuniq Scan & Targets</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Enter clinical scan readings along with your target weight and body fat % goals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date */}
          <div>
            <label
              htmlFor="metric-date"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5"
            >
              Date (Auto-fills today) *
            </label>
            <input
              id="metric-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-[#121212] text-sm text-white font-mono border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Scan Date"
            />
          </div>

          {/* Body Weight (kg) */}
          <div>
            <label
              htmlFor="metric-weight"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5"
            >
              Body Weight (kg) *
            </label>
            <input
              id="metric-weight"
              type="number"
              step="0.1"
              min="20"
              max="250"
              value={bodyWeightKg}
              onChange={(e) => setBodyWeightKg(e.target.value)}
              placeholder="e.g. 77.0"
              required
              className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Body Weight in kg"
            />
          </div>

          {/* Body Fat % */}
          <div>
            <label
              htmlFor="metric-fat"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5"
            >
              Body Fat % (PBF) *
            </label>
            <input
              id="metric-fat"
              type="number"
              step="0.1"
              min="2"
              max="60"
              value={bodyFatPercent}
              onChange={(e) => setBodyFatPercent(e.target.value)}
              placeholder="e.g. 15.0"
              required
              className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#03dac6] focus:outline-none"
              aria-label="Body Fat Percentage"
            />
          </div>

          {/* Skeletal Muscle Mass (SMM kg) */}
          <div>
            <label
              htmlFor="metric-smm"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5"
            >
              Skeletal Muscle Mass (SMM kg) *
            </label>
            <input
              id="metric-smm"
              type="number"
              step="0.1"
              min="10"
              max="150"
              value={skeletalMuscleMassKg}
              onChange={(e) => setSkeletalMuscleMassKg(e.target.value)}
              placeholder="e.g. 37.0"
              required
              className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Skeletal Muscle Mass in kg"
            />
          </div>

          {/* Target Weight (kg) */}
          <div>
            <label
              htmlFor="metric-target-weight"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1 text-[#03dac6]"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Target Weight (kg)</span>
            </label>
            <input
              id="metric-target-weight"
              type="number"
              step="0.1"
              min="20"
              max="250"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              placeholder="e.g. 75.0"
              className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#03dac6] focus:outline-none"
              aria-label="Target Weight in kg"
            />
          </div>

          {/* Target Percent Body Fat (PBF %) */}
          <div>
            <label
              htmlFor="metric-target-fat"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1 text-[#bb86fc]"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Target Body Fat (PBF %)</span>
            </label>
            <input
              id="metric-target-fat"
              type="number"
              step="0.1"
              min="3"
              max="50"
              value={targetBodyFatPercent}
              onChange={(e) => setTargetBodyFatPercent(e.target.value)}
              placeholder="e.g. 13.0"
              className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Target Percent Body Fat"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#bb86fc] hover:bg-[#c99eff] text-black font-bold text-sm shadow-md shadow-[#bb86fc]/20 transition-all active:scale-95"
            aria-label="Save Body Metric"
          >
            <Plus className="w-4 h-4" />
            <span>Save Scan & Calculate Targets</span>
          </button>
        </div>
      </form>

      {/* Summary Table displaying historical metrics */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Historical Accuniq Scans</h3>
            <p className="text-xs text-zinc-400">
              Sorted by date with target fat and muscle control recommendations
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500">{metrics.length} entries recorded</span>
        </div>

        {metrics.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm bg-[#121212]/50 rounded-[12px] border border-dashed border-zinc-800 p-6 space-y-2">
            <Activity className="w-8 h-8 mx-auto text-zinc-600 mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-zinc-300">No Historical Scans Yet</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Use the form above to record your latest clinical scan and generate your personalized body composition target report.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Historical Accuniq Metrics">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Weight (kg)</th>
                  <th className="py-2.5 px-3">Fat %</th>
                  <th className="py-2.5 px-3">SMM (kg)</th>
                  <th className="py-2.5 px-3">BMI / BMR</th>
                  <th className="py-2.5 px-3">Fat Control</th>
                  <th className="py-2.5 px-3">Muscle Control</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {metrics.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-white flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{item.date}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-200">
                      <span className="font-bold">{item.bodyWeightKg}</span>{' '}
                      <span className="text-xs text-zinc-500">kg</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#03dac6]">
                      {item.bodyFatPercent}%
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#bb86fc]">
                      {item.skeletalMuscleMassKg}{' '}
                      <span className="text-xs text-zinc-500">kg</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-zinc-300">
                      <div>BMI: {item.bmi || '—'}</div>
                      <div className="text-[10px] text-zinc-500">{item.bmr ? `${item.bmr} kcal` : ''}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      {item.fatControlKg !== undefined ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            item.fatControlKg <= 0
                              ? 'bg-[#03dac6]/15 text-[#03dac6]'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {item.fatControlKg <= 0
                            ? `${item.fatControlKg} kg`
                            : `+${item.fatControlKg} kg`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      {item.muscleControlKg !== undefined ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            item.muscleControlKg >= 0
                              ? 'bg-[#bb86fc]/15 text-[#bb86fc]'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {item.muscleControlKg >= 0
                            ? `+${item.muscleControlKg} kg`
                            : `${item.muscleControlKg} kg`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteMetric(item.id)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title={`Delete scan for ${item.date}`}
                        aria-label={`Delete scan for ${item.date}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
