/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, ScreenTab } from './components/Navigation.tsx';
import { HomeCalendarView } from './components/HomeCalendarView.tsx';
import { DailyLogView } from './components/DailyLogView.tsx';
import { ExerciseLibraryView } from './components/ExerciseLibraryView.tsx';
import { UserProfileView } from './components/UserProfileView.tsx';
import { AccuniqView } from './components/AccuniqView.tsx';
import { ProgressView } from './components/ProgressView.tsx';
import { CloudSyncPromptModal } from './components/CloudSyncPromptModal.tsx';
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
import {
  triggerBackgroundAutoSync,
  checkForNewerCloudBackup,
  restoreBackupPayload,
  VulcanBackupPayload,
} from './utils/googleDrive.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ScreenTab>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [dailyWorkouts, setDailyWorkouts] = useState<Record<string, DailyWorkout>>({});
  const [accuniqMetrics, setAccuniqMetrics] = useState<AccuniqMetric[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<CustomExercise[]>([]);
  const [userProfile, setUserProfileState] = useState<UserProfile>(() => getUserProfile());

  // Cloud Sync Auto-Fetch Prompt state
  const [cloudSyncPrompt, setCloudSyncPrompt] = useState<{
    isOpen: boolean;
    cloudPayload?: VulcanBackupPayload;
    cloudDateStr?: string;
  }>({ isOpen: false });

  // Refresh all state from LocalStorage
  const refreshAllStateFromStorage = useCallback(() => {
    setDailyWorkouts(getDailyWorkouts());
    setAccuniqMetrics(getAccuniqMetrics());
    setExerciseLibrary(getExerciseLibrary());
    setUserProfileState(getUserProfile());
  }, []);

  // Initialize storage and check cloud backup on launch
  useEffect(() => {
    initializeStorageIfNeeded();
    refreshAllStateFromStorage();

    // Check for newer Google Drive cloud backup on app launch
    checkForNewerCloudBackup()
      .then((res) => {
        if (res.hasNewerCloudBackup && res.cloudPayload) {
          setCloudSyncPrompt({
            isOpen: true,
            cloudPayload: res.cloudPayload,
            cloudDateStr: res.cloudDateStr,
          });
        }
      })
      .catch((e) => {
        console.warn('Silent cloud check failed:', e);
      });
  }, [refreshAllStateFromStorage]);

  // Update Daily Workout + Auto-Sync
  const handleSaveDailyWorkout = (updatedWorkout: DailyWorkout) => {
    saveDailyWorkout(updatedWorkout);
    setDailyWorkouts((prev) => ({
      ...prev,
      [updatedWorkout.date]: updatedWorkout,
    }));
    triggerBackgroundAutoSync();
  };

  // Delete Daily Workout + Auto-Sync
  const handleDeleteDailyWorkout = (date: string) => {
    deleteDailyWorkout(date);
    setDailyWorkouts(getDailyWorkouts());
    triggerBackgroundAutoSync();
  };

  // Exercise Library Handlers + Auto-Sync
  const handleSaveExercise = (exercise: CustomExercise) => {
    saveExerciseToLibrary(exercise);
    setExerciseLibrary(getExerciseLibrary());
    triggerBackgroundAutoSync();
  };

  const handleDeleteExercise = (id: string) => {
    deleteExerciseFromLibrary(id);
    setExerciseLibrary(getExerciseLibrary());
    triggerBackgroundAutoSync();
  };

  // User Profile Handlers + Auto-Sync
  const handleSaveProfile = (profile: UserProfile) => {
    saveUserProfile(profile);
    setUserProfileState(profile);
    triggerBackgroundAutoSync();
  };

  // Accuniq Handlers + Auto-Sync
  const handleSaveAccuniqMetric = (metric: AccuniqMetric) => {
    saveAccuniqMetric(metric);
    setAccuniqMetrics(getAccuniqMetrics());
    triggerBackgroundAutoSync();
  };

  const handleDeleteAccuniqMetric = (id: string) => {
    deleteAccuniqMetric(id);
    setAccuniqMetrics(getAccuniqMetrics());
    triggerBackgroundAutoSync();
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
          <ProgressView
            dailyWorkouts={dailyWorkouts}
            accuniqMetrics={accuniqMetrics}
            onNavigateToAccuniq={() => setCurrentTab('accuniq')}
          />
        )}

        {currentTab === 'profile' && (
          <UserProfileView
            profile={userProfile}
            onSaveProfile={handleSaveProfile}
            onDataRestored={refreshAllStateFromStorage}
          />
        )}
      </main>

      {/* Auto-Fetch Prompt Modal when newer Google Drive backup is found */}
      <CloudSyncPromptModal
        isOpen={cloudSyncPrompt.isOpen}
        cloudDateStr={cloudSyncPrompt.cloudDateStr}
        onSyncNow={() => {
          if (cloudSyncPrompt.cloudPayload) {
            restoreBackupPayload(cloudSyncPrompt.cloudPayload);
            refreshAllStateFromStorage();
          }
          setCloudSyncPrompt({ isOpen: false });
        }}
        onKeepLocal={() => {
          setCloudSyncPrompt({ isOpen: false });
        }}
      />
    </div>
  );
}
