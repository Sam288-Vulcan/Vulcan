import React from 'react';
import {
  Calendar,
  Dumbbell,
  BookOpen,
  Activity,
  LineChart,
  User,
  Flame,
} from 'lucide-react';
import { UserProfile } from '../types/workout.ts';

export type ScreenTab =
  | 'calendar'
  | 'dailylog'
  | 'library'
  | 'accuniq'
  | 'progress'
  | 'profile';

interface NavigationProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  selectedDate: string;
  userProfile: UserProfile;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  selectedDate,
  userProfile,
}) => {
  const navItems = [
    {
      id: 'calendar' as ScreenTab,
      label: 'Calendar',
      sublabel: 'Home & Schedule',
      icon: Calendar,
    },
    {
      id: 'dailylog' as ScreenTab,
      label: 'Daily Log',
      sublabel: 'Workout Tracker',
      icon: Dumbbell,
    },
    {
      id: 'library' as ScreenTab,
      label: 'Library',
      sublabel: 'Exercise Catalog',
      icon: BookOpen,
    },
    {
      id: 'accuniq' as ScreenTab,
      label: 'Accuniq',
      sublabel: 'Body Composition',
      icon: Activity,
    },
    {
      id: 'progress' as ScreenTab,
      label: 'Progress',
      sublabel: 'Overload Charts',
      icon: LineChart,
    },
    {
      id: 'profile' as ScreenTab,
      label: 'Profile',
      sublabel: 'Bio & Global Weight',
      icon: User,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1e1e1e] border-r border-zinc-800/80 min-h-screen p-4 flex-shrink-0">
        {/* App Brand Header */}
        <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#bb86fc] to-[#03dac6] flex items-center justify-center text-black font-extrabold shadow-md shadow-[#bb86fc]/20">
            <Flame className="w-6 h-6 fill-black text-black" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              <span>Vulcan</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
              Fitness tracker
            </p>
          </div>
        </div>

        {/* Active Date Tag */}
        <div className="px-3 py-2.5 mb-5 bg-[#121212] border border-zinc-800 rounded-[12px] flex items-center justify-between">
          <div className="text-xs text-zinc-400">Selected Date</div>
          <div className="text-xs font-mono font-semibold text-[#03dac6]">{selectedDate}</div>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1.5 flex-1" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-[12px] text-left transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#bb86fc]/15 text-[#bb86fc] border border-[#bb86fc]/30 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'text-[#bb86fc] scale-110' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                <div className="flex flex-col">
                  <span className="text-sm tracking-tight">{item.label}</span>
                  <span className="text-[11px] text-zinc-500 font-normal leading-tight">
                    {item.sublabel}
                  </span>
                </div>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#03dac6] shadow-[0_0_8px_#03dac6]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Sidebar Footer / User Profile shortcut badge */}
        <div className="mt-auto pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => onSelectTab('profile')}
            className={`w-full flex items-center gap-3 p-2 rounded-[12px] border transition-all text-left ${
              currentTab === 'profile'
                ? 'bg-[#bb86fc]/15 border-[#bb86fc]/40'
                : 'bg-[#121212] border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#bb86fc]/20 text-[#bb86fc] flex items-center justify-center font-bold text-sm">
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'B'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-zinc-200 truncate">
                {userProfile.name || 'Blesson'}
              </span>
              <span className="text-[10px] text-[#03dac6] font-mono">
                {userProfile.bodyWeightKg} kg • Global
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1e1e1e]/95 backdrop-blur-lg border-t border-zinc-800/90 pb-safe shadow-2xl"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="grid grid-cols-6 h-16 max-w-lg mx-auto px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 transition-colors px-1 ${
                  isActive ? 'text-[#bb86fc]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <div className="absolute top-0 w-6 h-0.5 bg-[#03dac6] rounded-full shadow-[0_0_8px_#03dac6]" />
                )}
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isActive ? 'scale-110 text-[#bb86fc]' : 'text-zinc-500'
                  }`}
                />
                <span
                  className={`text-[9px] font-medium tracking-tight truncate max-w-full ${
                    isActive ? 'font-bold' : ''
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
