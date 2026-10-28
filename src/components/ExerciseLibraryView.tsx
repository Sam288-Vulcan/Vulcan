import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Award,
  Layers,
  FileText,
  CheckCircle,
  X,
  Filter,
  Dumbbell,
  Search,
  Timer,
} from 'lucide-react';
import { CustomExercise, SplitType, SPLIT_OPTIONS } from '../types/workout.ts';

interface ExerciseLibraryViewProps {
  exercises: CustomExercise[];
  onSaveExercise: (exercise: CustomExercise) => void;
  onDeleteExercise: (id: string) => void;
  onNavigateToDailyLog?: () => void;
}

export const ExerciseLibraryView: React.FC<ExerciseLibraryViewProps> = ({
  exercises,
  onSaveExercise,
  onDeleteExercise,
  onNavigateToDailyLog,
}) => {
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [split, setSplit] = useState<SplitType>('Push');
  const [description, setDescription] = useState<string>('');
  const [personalBest, setPersonalBest] = useState<string>('');
  const [defaultRestSeconds, setDefaultRestSeconds] = useState<number>(90);
  const [filterSplit, setFilterSplit] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSplit('Push');
    setDescription('');
    setPersonalBest('');
    setDefaultRestSeconds(90);
  };

  const handleEdit = (ex: CustomExercise) => {
    setEditingId(ex.id);
    setName(ex.name);
    setSplit(ex.split);
    setDescription(ex.description || '');
    setPersonalBest(ex.personalBest || '');
    setDefaultRestSeconds(ex.defaultRestSeconds || 90);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const exerciseToSave: CustomExercise = {
      id: editingId || `ex-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: trimmedName,
      split,
      description: description.trim() || undefined,
      personalBest: personalBest.trim() || undefined,
      defaultRestSeconds: Number(defaultRestSeconds) || 90,
      createdAt: editingId
        ? exercises.find((e) => e.id === editingId)?.createdAt || Date.now()
        : Date.now(),
    };

    onSaveExercise(exerciseToSave);
    setNotification(editingId ? `Updated "${trimmedName}"!` : `Added "${trimmedName}" to library!`);
    setTimeout(() => setNotification(null), 3000);
    resetForm();
  };

  // Filtered exercises
  const filteredExercises = exercises.filter((ex) => {
    const matchesSplit = filterSplit === 'ALL' || ex.split === filterSplit;
    const matchesSearch =
      searchQuery === '' ||
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.description && ex.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSplit && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-[#bb86fc]/20 to-[#03dac6]/20 text-[#bb86fc]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Exercise Library</h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                Manage your custom exercise catalog, muscle splits, descriptions, and personal bests (PBs).
              </p>
            </div>
          </div>

          {onNavigateToDailyLog && (
            <button
              type="button"
              onClick={onNavigateToDailyLog}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <Dumbbell className="w-4 h-4 text-[#03dac6]" />
              <span>Back to Daily Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-[#03dac6]/10 border border-[#03dac6]/40 text-[#03dac6] rounded-[12px] flex items-center gap-2 text-sm font-semibold animate-fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Add / Edit Exercise Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4"
        aria-label="Exercise Entry Form"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {editingId ? (
              <>
                <Edit2 className="w-4 h-4 text-[#03dac6]" />
                <span>Edit Exercise</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-[#bb86fc]" />
                <span>Add New Exercise</span>
              </>
            )}
          </h3>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Exercise Name */}
          <div>
            <label
              htmlFor="exercise-name"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5"
            >
              Exercise Name *
            </label>
            <input
              id="exercise-name"
              type="text"
              placeholder="e.g. Incline Dumbbell Press"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Exercise Name"
            />
          </div>

          {/* Muscle Group / Split Assignment */}
          <div>
            <label
              htmlFor="exercise-split"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5"
            >
              Muscle Group / Split Assignment *
            </label>
            <select
              id="exercise-split"
              value={split}
              onChange={(e) => setSplit(e.target.value as SplitType)}
              className="w-full bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Select Split Assignment"
            >
              {SPLIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Personal Best (PB) */}
          <div>
            <label
              htmlFor="exercise-pb"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Personal Best (PB) (Optional)</span>
            </label>
            <input
              id="exercise-pb"
              type="text"
              placeholder="e.g. 100 kg × 5 reps"
              value={personalBest}
              onChange={(e) => setPersonalBest(e.target.value)}
              className="w-full bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#03dac6] focus:outline-none"
              aria-label="Personal Best (PB)"
            />
          </div>

          {/* Optional Description / Form Cues */}
          <div>
            <label
              htmlFor="exercise-desc"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Description / Cues (Optional)</span>
            </label>
            <input
              id="exercise-desc"
              type="text"
              placeholder="e.g. Keep shoulder blades pinched, 2-sec eccentric tempo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#bb86fc] focus:outline-none"
              aria-label="Exercise Description"
            />
          </div>

          {/* Default Rest Timer Preset */}
          <div>
            <label
              htmlFor="exercise-rest"
              className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1"
            >
              <Timer className="w-3.5 h-3.5 text-[#03dac6]" />
              <span>Default Rest Timer Preset</span>
            </label>
            <select
              id="exercise-rest"
              value={defaultRestSeconds}
              onChange={(e) => setDefaultRestSeconds(Number(e.target.value))}
              className="w-full bg-[#121212] text-sm text-white font-medium border border-zinc-700 rounded-lg px-3 py-2.5 focus:border-[#03dac6] focus:outline-none"
              aria-label="Default Rest Timer Preset"
            >
              <option value={45}>45s (Quick Circuit)</option>
              <option value={60}>60s (Hypertrophy / Isolation)</option>
              <option value={90}>90s (Standard Compound)</option>
              <option value={120}>120s (Strength Building)</option>
              <option value={180}>180s (Heavy Squats/Deadlifts)</option>
              <option value={240}>240s (Powerlifting Peak)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#bb86fc] hover:bg-[#c99eff] text-black font-bold text-sm shadow-md shadow-[#bb86fc]/20 transition-all active:scale-95"
          >
            {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{editingId ? 'Update Exercise' : 'Save to Library'}</span>
          </button>
        </div>
      </form>

      {/* Library Catalog List & Filter */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#03dac6]" />
              <span>Saved Exercises ({exercises.length})</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Only exercises saved here will populate in your Daily Log dropdown.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Split Filter */}
            <div className="flex items-center gap-1.5 bg-[#121212] border border-zinc-700 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={filterSplit}
                onChange={(e) => setFilterSplit(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none"
                aria-label="Filter exercises by split"
              >
                <option value="ALL">All Splits</option>
                {SPLIT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-1.5 bg-[#121212] border border-zinc-700 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none w-24 sm:w-32"
                aria-label="Search exercise"
              />
            </div>
          </div>
        </div>

        {/* Empty State */}
        {exercises.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-[#121212]/50 rounded-[12px] border border-dashed border-zinc-800 p-6 space-y-2">
            <Dumbbell className="w-10 h-10 mx-auto text-zinc-600 opacity-60 mb-2" />
            <h4 className="text-sm font-bold text-zinc-300">Exercise Library is Completely Blank</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              You requested zero seed data. Use the form above to add your favorite exercises (Bench Press, Squats, Pull-ups, etc.) and assign them to your splits!
            </p>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs">
            No exercises match your filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                className="bg-[#121212] p-4 rounded-[12px] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-sm sm:text-base group-hover:text-[#bb86fc] transition-colors">
                      {ex.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#bb86fc]/20 text-[#bb86fc] border border-[#bb86fc]/30 flex-shrink-0">
                      {ex.split}
                    </span>
                  </div>

                  {ex.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {ex.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {ex.personalBest && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>PB: {ex.personalBest}</span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#03dac6]/10 border border-[#03dac6]/30 text-[#03dac6] text-xs font-mono">
                      <Timer className="w-3 h-3 text-[#03dac6]" />
                      <span>Rest: {ex.defaultRestSeconds || 90}s</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => handleEdit(ex)}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-[#03dac6] hover:bg-zinc-700 text-xs flex items-center gap-1 transition-colors"
                    aria-label={`Edit ${ex.name}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteExercise(ex.id)}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 text-xs flex items-center gap-1 transition-colors"
                    aria-label={`Delete ${ex.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
