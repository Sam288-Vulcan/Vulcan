import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Zap,
  TrendingUp,
  ArrowRight,
  CalendarDays,
  Plus,
  Calendar as CalendarIcon,
  Edit2,
  FileText,
} from 'lucide-react';
import {
  DailyWorkout,
  DAY_OF_WEEK_SPLITS,
  CustomExercise,
  UserProfile,
} from '../types/workout.ts';
import { formatDateKey } from '../utils/storage.ts';
import { QuickActionModal } from './QuickActionModal.tsx';
import { DayWorkoutSummaryModal } from './DayWorkoutSummaryModal.tsx';
import { PastWorkoutLoggerModal } from './PastWorkoutLoggerModal.tsx';

interface HomeCalendarViewProps {
  dailyWorkouts: Record<string, DailyWorkout>;
  selectedDate: string;
  userProfile: UserProfile;
  exerciseLibrary: CustomExercise[];
  onSelectDate: (date: string) => void;
  onOpenDailyLog: (date: string) => void;
  onSaveDailyWorkout: (workout: DailyWorkout) => void;
  onDeleteDailyWorkout?: (date: string) => void;
}

export const HomeCalendarView: React.FC<HomeCalendarViewProps> = ({
  dailyWorkouts,
  selectedDate,
  userProfile,
  exerciseLibrary,
  onSelectDate,
  onOpenDailyLog,
  onSaveDailyWorkout,
  onDeleteDailyWorkout,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

  // Modal states for Day Summary & Past Workout Logger
  const [summaryModalDate, setSummaryModalDate] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);

  const [isPastLoggerOpen, setIsPastLoggerOpen] = useState<boolean>(false);
  const [pastLoggerDate, setPastLoggerDate] = useState<string>(selectedDate);
  const [pastLoggerExistingWorkout, setPastLoggerExistingWorkout] = useState<DailyWorkout | null>(null);

  const todayStr = formatDateKey(new Date());

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleString('default', { month: 'long' });

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    onSelectDate(formatDateKey(now));
  };

  // Calendar matrix calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: Array<{
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    hasWorkout: boolean;
    workoutCount: number;
    split?: string;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, d);
    const dateStr = formatDateKey(dateObj);
    const workout = dailyWorkouts[dateStr];
    const hasWorkout = !!(
      workout &&
      (workout.weightliftingEntries.length > 0 || workout.cardioEntries.length > 0)
    );
    calendarDays.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      hasWorkout,
      workoutCount: (workout?.weightliftingEntries.length || 0) + (workout?.cardioEntries.length || 0),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = formatDateKey(dateObj);
    const workout = dailyWorkouts[dateStr];
    const hasWorkout = !!(
      workout &&
      (workout.weightliftingEntries.length > 0 || workout.cardioEntries.length > 0)
    );
    const dayOfWeek = dateObj.getDay();
    calendarDays.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      hasWorkout,
      workoutCount: (workout?.weightliftingEntries.length || 0) + (workout?.cardioEntries.length || 0),
      split: workout?.split || DAY_OF_WEEK_SPLITS[dayOfWeek],
    });
  }

  // Next month leading days to complete full grid
  const remainingSlots = 42 - calendarDays.length;
  for (let d = 1; d <= remainingSlots; d++) {
    const dateObj = new Date(year, month + 1, d);
    const dateStr = formatDateKey(dateObj);
    const workout = dailyWorkouts[dateStr];
    const hasWorkout = !!(
      workout &&
      (workout.weightliftingEntries.length > 0 || workout.cardioEntries.length > 0)
    );
    calendarDays.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      hasWorkout,
      workoutCount: (workout?.weightliftingEntries.length || 0) + (workout?.cardioEntries.length || 0),
    });
  }

  // Selected date's workout object
  const selectedWorkout = dailyWorkouts[selectedDate];
  const selectedHasWorkout =
    selectedWorkout &&
    (selectedWorkout.weightliftingEntries.length > 0 || selectedWorkout.cardioEntries.length > 0);

  // Month Statistics
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthWorkouts = Object.entries(dailyWorkouts).filter(([dateKey, workout]) => {
    return (
      dateKey.startsWith(monthPrefix) &&
      (workout.weightliftingEntries.length > 0 || workout.cardioEntries.length > 0)
    );
  });

  const monthTotalVolume = monthWorkouts.reduce((acc, [, w]) => {
    return acc + w.weightliftingEntries.reduce((sub, e) => sub + e.volumeKg, 0);
  }, 0);

  const monthTotalCalories = monthWorkouts.reduce((acc, [, w]) => {
    const liftingCal = w.weightliftingEntries.reduce((sub, e) => sub + e.caloriesBurned, 0);
    const cardioCal = w.cardioEntries.reduce((sub, e) => sub + e.caloriesBurned, 0);
    return acc + liftingCal + cardioCal;
  }, 0);

  // Calendar Day Tap Handler (Requirement 5)
  const handleCalendarDayClick = (item: (typeof calendarDays)[0]) => {
    onSelectDate(item.dateStr);

    // If day has workout or is a past date, open the full Day Workout Summary Modal
    if (item.hasWorkout || item.dateStr <= todayStr) {
      setSummaryModalDate(item.dateStr);
      setIsSummaryModalOpen(true);
    } else {
      // Future empty date opens the daily log
      onOpenDailyLog(item.dateStr);
    }
  };

  // Open Past Workout Logger Modal (Requirement 4)
  const handleOpenPastLogger = (targetDate?: string) => {
    const dateToUse = targetDate || selectedDate || todayStr;
    setPastLoggerDate(dateToUse);
    setPastLoggerExistingWorkout(dailyWorkouts[dateToUse] || null);
    setIsPastLoggerOpen(true);
  };

  // Edit session trigger from summary modal
  const handleEditSessionFromSummary = (date: string) => {
    setIsSummaryModalOpen(false);
    setPastLoggerDate(date);
    setPastLoggerExistingWorkout(dailyWorkouts[date] || null);
    setIsPastLoggerOpen(true);
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Personalized Greeting Header */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-6 shadow-xl relative overflow-hidden">
        {/* Subtle decorative purple/teal aura glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#bb86fc]/10 rounded-full blur-3xl -z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-[#03dac6]/10 rounded-full blur-2xl -z-0 pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#bb86fc]/20 border border-[#bb86fc]/30 text-[#bb86fc] text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 fill-[#bb86fc]" />
            <span>PROGRESSIVE OVERLOAD REGIME</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hello <span className="text-[#bb86fc]">{userProfile.name || 'Blesson'}</span>
          </h2>
          <p className="text-zinc-300 text-sm sm:text-base max-w-xl font-medium">
            Ready to get to work?
          </p>
        </div>

        {/* Quick KPI stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-zinc-800/80">
          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-[#03dac6]" /> Monthly Sessions
            </span>
            <p className="text-lg font-bold text-white mt-0.5">{monthWorkouts.length} logged</p>
          </div>
          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#bb86fc]" /> Month Volume
            </span>
            <p className="text-lg font-bold text-[#bb86fc] mt-0.5">
              {monthTotalVolume.toLocaleString()} <span className="text-xs font-normal text-zinc-400">kg</span>
            </p>
          </div>
          <div className="bg-[#121212] p-3 rounded-[12px] border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#03dac6]" /> Energy Burned
            </span>
            <p className="text-lg font-bold text-[#03dac6] mt-0.5">
              {Math.round(monthTotalCalories).toLocaleString()} <span className="text-xs font-normal text-zinc-400">kcal</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick-action outline button */}
      <div>
        <QuickActionModal
          todayWorkout={dailyWorkouts[todayStr]}
          onOpenDailyLogForDate={(date) => {
            onSelectDate(date);
            onOpenDailyLog(date);
          }}
        />
      </div>

      {/* Interactive Monthly Calendar Card */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl">
        {/* Calendar Header with Month Navigation & Log Past Workout Shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{monthName}</span>
              <span className="text-zinc-500 font-mono">{year}</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Tap any date to view its workout summary or log a past session. Days with logs show a teal dot.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Retroactive / Past Workout Logger Shortcut Button (Requirement 4) */}
            <button
              type="button"
              onClick={() => {
                setPastLoggerDate(todayStr);
                setPastLoggerExistingWorkout(null);
                setIsPastLoggerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#bb86fc]/20 hover:bg-[#bb86fc]/30 text-[#bb86fc] border border-[#bb86fc]/40 transition-all active:scale-95 shadow-sm"
              aria-label="Log Past Workout"
            >
              <Plus className="w-3.5 h-3.5 text-[#03dac6]" />
              <span>Log Past Workout</span>
            </button>

            <button
              type="button"
              onClick={handleJumpToToday}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
              aria-label="Jump to Today"
            >
              Today
            </button>
            <div className="flex items-center rounded-lg bg-zinc-800 p-0.5 border border-zinc-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-xs font-semibold text-zinc-500 py-1 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((item, index) => {
            const isSelected = item.dateStr === selectedDate;
            return (
              <button
                key={`${item.dateStr}-${index}`}
                type="button"
                onClick={() => handleCalendarDayClick(item)}
                className={`min-h-[58px] sm:min-h-[66px] p-1.5 rounded-lg flex flex-col justify-between items-center relative transition-all duration-150 group border ${
                  isSelected
                    ? 'bg-[#bb86fc]/20 border-[#bb86fc] text-white shadow-[0_0_12px_rgba(187,134,252,0.3)]'
                    : item.isToday
                    ? 'bg-zinc-900/90 border-[#03dac6]/60 text-white'
                    : item.isCurrentMonth
                    ? 'bg-[#141414] border-zinc-800/80 hover:border-zinc-600 hover:bg-zinc-800/50 text-zinc-300'
                    : 'bg-[#101010]/50 border-transparent text-zinc-600 hover:text-zinc-400'
                }`}
                aria-label={`${item.dateStr}${item.hasWorkout ? ' (Has logged workout)' : ''}`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-semibold ${
                      item.isToday
                        ? 'w-5 h-5 rounded-full bg-[#03dac6] text-black flex items-center justify-center font-bold'
                        : ''
                    }`}
                  >
                    {item.dayNum}
                  </span>

                  {item.split && item.isCurrentMonth && (
                    <span className="hidden sm:inline text-[9px] text-zinc-500 font-mono uppercase truncate max-w-[42px]">
                      {item.split.slice(0, 4)}
                    </span>
                  )}
                </div>

                {/* Workout Indicator: Small teal indicator dot (#03dac6) */}
                <div className="h-3 flex items-center justify-center w-full">
                  {item.hasWorkout ? (
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-[#03dac6] shadow-[0_0_6px_#03dac6]"
                        title={`${item.workoutCount} exercises logged`}
                      />
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 mt-4 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#03dac6] shadow-[0_0_6px_#03dac6]" />
              <span>Workout logged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-[#03dac6]" />
              <span>Today</span>
            </div>
          </div>
          <span className="text-[11px] text-zinc-500">Tap day to view summary or edit session</span>
        </div>
      </div>

      {/* Selected Day Quick Action Card */}
      <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Selected Date Details
          </span>
          <h4 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
            <span>{selectedDate}</span>
            {selectedDate === todayStr && (
              <span className="px-2 py-0.5 rounded-full bg-[#03dac6]/20 text-[#03dac6] text-xs font-bold">
                Today
              </span>
            )}
          </h4>
          <p className="text-xs text-zinc-400 mt-1">
            {selectedHasWorkout
              ? `${(selectedWorkout?.weightliftingEntries.length || 0) + (selectedWorkout?.cardioEntries.length || 0)} exercises logged • ${(selectedWorkout?.weightliftingEntries.reduce((a, b) => a + b.volumeKg, 0) || 0).toLocaleString()} kg total volume`
              : 'No exercises recorded for this date yet. Ready to train or log past session?'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedHasWorkout && (
            <button
              type="button"
              onClick={() => handleEditSessionFromSummary(selectedDate)}
              className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs sm:text-sm transition-all"
              aria-label={`Edit Session for ${selectedDate}`}
            >
              <Edit2 className="w-4 h-4 text-[#03dac6]" />
              <span>Edit Session</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenDailyLog(selectedDate)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] bg-[#bb86fc] text-black font-bold text-sm hover:bg-[#c99eff] transition-all shadow-md shadow-[#bb86fc]/20"
            aria-label={`Open Daily Log for ${selectedDate}`}
          >
            <span>Open Daily Log</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Requirement 5: Day Workout Summary Modal */}
      {summaryModalDate && (
        <DayWorkoutSummaryModal
          isOpen={isSummaryModalOpen}
          date={summaryModalDate}
          workout={dailyWorkouts[summaryModalDate] || null}
          userProfile={userProfile}
          onClose={() => setIsSummaryModalOpen(false)}
          onEditSession={handleEditSessionFromSummary}
          onOpenDailyLog={onOpenDailyLog}
          onDeleteSession={onDeleteDailyWorkout}
        />
      )}

      {/* Requirement 4: Past Workout Logger Modal */}
      {isPastLoggerOpen && (
        <PastWorkoutLoggerModal
          isOpen={isPastLoggerOpen}
          initialDate={pastLoggerDate}
          existingWorkout={pastLoggerExistingWorkout}
          exerciseLibrary={exerciseLibrary}
          userProfile={userProfile}
          onSaveWorkout={(workout) => {
            onSaveDailyWorkout(workout);
            setIsPastLoggerOpen(false);
          }}
          onClose={() => setIsPastLoggerOpen(false)}
        />
      )}
    </div>
  );
};
