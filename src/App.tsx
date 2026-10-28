/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navigation, ScreenTab } from './components/Navigation.tsx';
import { HomeCalendarView } from './components/HomeCalendarView.tsx';
import { DailyLogView } from './components/DailyLogView.tsx';
import { ExerciseLibraryView } from './components/ExerciseLibraryView.tsx';
import { UserProfileView } from './components/UserProfileView.tsx';
import { AccuniqView } from './components/AccuniqView.tsx';
import { ProgressView } from './components/ProgressView.tsx';
import {
  DailyWorkout,
  AccuniqMetric,
  CustomExercise,
  UserProfile,
} from './types/workout.ts';
import {
  formatDateKey,
  getDailyWorkouts,
  saveDailyWorkout,
  getDailyWorkout,
  getAccuniqMetrics,
  saveAccuniqMetric,
  deleteAccuniqMetric,
  getExerciseLibrary,
  saveExerciseToLibrary,
  deleteExerciseFromLibrary,
  getUserProfile,
  saveUserProfile,
  initializeStorageIfNeeded,
  deleteDailyWorkout,
} from './utils/storage.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ScreenTab>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [dailyWorkouts, setDailyWorkouts] = useState<Record<string, DailyWorkout>>({});
  const [accuniqMetrics, setAccuniqMetrics] = useState<AccuniqMetric[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<CustomExercise[]>([]);
  const [userProfile, setUserProfileState] = useState<UserProfile>(() => getUserProfile());

  // Initialize storage and load data
  useEffect(() => {
    initializeStorageIfNeeded();
    setDailyWorkouts(getDailyWorkouts());
    setAccuniqMetrics(getAccuniqMetrics());
    setExerciseLibrary(getExerciseLibrary());
    setUserProfileState(getUserProfile());
  }, []);

  // Update Daily Workout
  const handleSaveDailyWorkout = (updatedWorkout: DailyWorkout) => {
    saveDailyWorkout(updatedWorkout);
    setDailyWorkouts((prev) => ({
      ...prev,
      [updatedWorkout.date]: updatedWorkout,
    }));
  };

  // Exercise Library Handlers
  const handleSaveExercise = (exercise: CustomExercise) => {
    saveExerciseToLibrary(exercise);
    setExerciseLibrary(getExerciseLibrary());
  };

  const handleDeleteExercise = (id: string) => {
    deleteExerciseFromLibrary(id);
    setExerciseLibrary(getExerciseLibrary());
  };

  // User Profile Handlers
  const handleSaveProfile = (profile: UserProfile) => {
    saveUserProfile(profile);
    setUserProfileState(profile);
  };

  // Accuniq Handlers
  const handleSaveAccuniqMetric = (metric: AccuniqMetric) => {
    saveAccuniqMetric(metric);
    setAccuniqMetrics(getAccuniqMetrics());
  };

  const handleDeleteAccuniqMetric = (id: string) => {
    deleteAccuniqMetric(id);
    setAccuniqMetrics(getAccuniqMetrics());
  };

  // Delete Daily Workout Handler
  const handleDeleteDailyWorkout = (date: string) => {
    deleteDailyWorkout(date);
    setDailyWorkouts(getDailyWorkouts());
  };

  // Open Daily Log from calendar date tap
  const handleOpenDailyLog = (date: string) => {
    setSelectedDate(date);
    setCurrentTab('dailylog');
  };

  // Back to Calendar
  const handleBackToCalendar = () => {
    setCurrentTab('calendar');
  };

  // Current selected day's workout data
  const currentWorkout = dailyWorkouts[selectedDate] || getDailyWorkout(selectedDate);

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col md:flex-row antialiased selection:bg-[#bb86fc]/30 selection:text-[#bb86fc]">
      {/* Navigation: Desktop Sidebar + Mobile Bottom Nav */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedDate={selectedDate}
        userProfile={userProfile}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen overflow-y-auto px-4 py-5 sm:px-6 sm:py-8 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
        {currentTab === 'calendar' && (
          <HomeCalendarView
            dailyWorkouts={dailyWorkouts}
            selectedDate={selectedDate}
            userProfile={userProfile}
            exerciseLibrary={exerciseLibrary}
            onSelectDate={setSelectedDate}
            onOpenDailyLog={handleOpenDailyLog}
            onSaveDailyWorkout={handleSaveDailyWorkout}
            onDeleteDailyWorkout={handleDeleteDailyWorkout}
          />
        )}

        {currentTab === 'dailylog' && (
          <DailyLogView
            selectedDate={selectedDate}
            dailyWorkout={currentWorkout}
            exerciseLibrary={exerciseLibrary}
            userProfile={userProfile}
            onSaveDailyWorkout={handleSaveDailyWorkout}
            onBackToCalendar={handleBackToCalendar}
            onNavigateToExerciseLibrary={() => setCurrentTab('library')}
          />
        )}

        {currentTab === 'library' && (
          <ExerciseLibraryView
            exercises={exerciseLibrary}
            onSaveExercise={handleSaveExercise}
            onDeleteExercise={handleDeleteExercise}
            onNavigateToDailyLog={() => setCurrentTab('dailylog')}
          />
        )}

        {currentTab === 'accuniq' && (
          <AccuniqView
            metrics={accuniqMetrics}
            userProfile={userProfile}
            onSaveMetric={handleSaveAccuniqMetric}
            onDeleteMetric={handleDeleteAccuniqMetric}
          />
        )}

        {currentTab === 'progress' && (
          <ProgressView dailyWorkouts={dailyWorkouts} />
        )}

        {currentTab === 'profile' && (
          <UserProfileView
            profile={userProfile}
            onSaveProfile={handleSaveProfile}
          />
        )}
      </main>
    </div>
  );
}
