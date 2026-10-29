import React, { useState } from 'react';
import {
  User,
  Scale,
  Ruler,
  Calendar,
  Save,
  CheckCircle,
  Flame,
  Info,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { UserProfile } from '../types/workout.ts';
import { CloudSyncCard } from './CloudSyncCard.tsx';

interface UserProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onDataRestored?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  profile,
  onSaveProfile,
  onDataRestored,
}) => {
  const [name, setName] = useState<string>(profile.name || 'Blesson');
  const [weightKg, setWeightKg] = useState<string>(
    profile.bodyWeightKg ? String(profile.bodyWeightKg) : '75.0'
  );
  const [heightCm, setHeightCm] = useState<string>(
    profile.heightCm ? String(profile.heightCm) : '178'
  );
  const [age, setAge] = useState<string>(profile.age ? String(profile.age) : '26');
  const [notification, setNotification] = useState<string | null>(null);

  const numWeight = parseFloat(weightKg) || 0;
  const numHeight = parseFloat(heightCm) || 0;
  const numAge = parseInt(age, 10) || 0;

  // Real-time BMI calculation
  const heightInMeters = numHeight / 100;
  const bmi =
    heightInMeters > 0 && numWeight > 0
      ? Math.round((numWeight / (heightInMeters * heightInMeters)) * 10) / 10
      : 0;

  // Mifflin-St Jeor BMR estimate: 10 * weight (kg) + 6.25 * height (cm) - 5 * age + 5 (male baseline)
  const bmr =
    numWeight > 0 && numHeight > 0 && numAge > 0
      ? Math.round(10 * numWeight + 6.25 * numHeight - 5 * numAge + 5)
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numWeight <= 0) return;

    const updated: UserProfile = {
      name: name.trim() || 'Blesson',
      bodyWeightKg: Math.round(numWeight * 10) / 10,
      heightCm: Math.round(numHeight),
      age: Math.round(numAge),
      updatedAt: Date.now(),
    };

    onSaveProfile(updated);
    setNotification('User Profile & Global Body Weight saved successfully!');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-[#bb86fc]/20 to-[#03dac6]/20 text-[#bb86fc]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">User Profile</h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
              Set your personal bio-metrics. Body Weight is used as the global variable for all calorie burn formulas.
            </p>
          </div>
        </div>

        {/* Global Impact Alert */}
        <div className="mt-5 p-3.5 bg-[#bb86fc]/10 border border-[#bb86fc]/30 rounded-[12px] flex items-start gap-3 text-xs text-zinc-300">
          <Info className="w-4 h-4 text-[#bb86fc] flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block mb-0.5">Global Formula Variable:</strong>
            Your saved Body Weight (<span className="text-[#03dac6] font-mono font-bold">{numWeight} kg</span>)
            directly calibrates the Weightlifting 6.0 METs formula and ACSM Treadmill cardio calculations across the Daily Log.
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-[#03dac6]/10 border border-[#03dac6]/40 text-[#03dac6] rounded-[12px] flex items-center gap-2 text-sm font-semibold animate-fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Profile Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-5"
        aria-label="User Profile Form"
      >
        <div className="border-b border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#03dac6]" />
            <span>Biometric Parameters</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Keep your profile current to ensure precise progressive overload energy calculations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* User Name */}
          <div>
            <label
              htmlFor="profile-name"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Full Name / Handle *</span>
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="User Name"
            />
          </div>

          {/* Body Weight (kg) - Global Variable */}
          <div>
            <label
              htmlFor="profile-weight"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5 text-[#03dac6]" />
              <span className="text-[#03dac6] font-bold">Body Weight (kg) * (Global Formula Key)</span>
            </label>
            <input
              id="profile-weight"
              type="number"
              step="0.1"
              min="20"
              max="250"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              required
              className="w-full bg-[#121212] text-sm text-white font-mono font-bold border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#03dac6] focus:outline-none"
              aria-label="Body Weight in kg"
            />
          </div>

          {/* Height (cm) */}
          <div>
            <label
              htmlFor="profile-height"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"
            >
              <Ruler className="w-3.5 h-3.5 text-zinc-400" />
              <span>Height (cm) *</span>
            </label>
            <input
              id="profile-height"
              type="number"
              min="100"
              max="250"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              required
              className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Height in cm"
            />
          </div>

          {/* Age */}
          <div>
            <label
              htmlFor="profile-age"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Age (Years) *</span>
            </label>
            <input
              id="profile-age"
              type="number"
              min="12"
              max="110"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              className="w-full bg-[#121212] text-sm text-white font-mono font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Age in years"
            />
          </div>
        </div>

        {/* Biometric Analysis Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-[#bb86fc]" /> Body Mass Index (BMI)
            </span>
            <p className="font-mono text-2xl font-black text-white mt-1">
              {bmi > 0 ? bmi : '—'}{' '}
              <span className="text-xs font-sans text-zinc-400 font-normal">
                {bmi > 0 && bmi < 18.5
                  ? '(Underweight)'
                  : bmi >= 18.5 && bmi < 25
                  ? '(Optimal)'
                  : bmi >= 25 && bmi < 30
                  ? '(Overweight / Muscular)'
                  : bmi >= 30
                  ? '(Athletic / High Mass)'
                  : ''}
              </span>
            </p>
          </div>

          <div className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#03dac6]" /> Resting Metabolic Rate (BMR)
            </span>
            <p className="font-mono text-2xl font-black text-[#03dac6] mt-1">
              {bmr > 0 ? `${bmr.toLocaleString()} kcal` : '—'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Daily baseline expenditure without exercise</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#bb86fc] hover:bg-[#c99eff] text-black font-bold text-sm shadow-md shadow-[#bb86fc]/20 transition-all active:scale-95"
            aria-label="Save Profile"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </form>

      {/* Requirement 2: Google Drive Cloud Sync & Storage Card */}
      <CloudSyncCard onDataRestored={onDataRestored} />
    </div>
  );
};
