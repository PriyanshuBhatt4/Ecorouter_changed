import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Laptop,
  Check,
  Footprints,
  Bike,
  MapPin,
  AlertTriangle,
  Info,
  Sliders,
  Trash2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ATTRIBUTION_TEXT, DEFAULT_PREFS, MODES, THEME_CHOICES } from '../constants';
import { ACCENTS, ACCENT_NAMES } from '../theme/palette';
import { ScreenHeader, PrimaryButton, GhostButton } from '../components/ui';

const DASHBOARD_ROWS = [
  { key: 'week', label: 'This week summary' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'streak', label: 'Trip streak & heatmap' },
  { key: 'recent', label: 'Recent trips' },
];

export default function SettingsScreen({
  styles,
  t,
  isDark,
  profile,
  trips = [],
  savedPlaces = [],
  themeMode,
  accentName,
  prefs = DEFAULT_PREFS,
  applyTheme,
  applyAccent,
  applyPreferredMode,
  applyRememberRouteGoal,
  applyDashboardToggle,
  setDistanceUnit,
  confirmEraseAll,
  openSavedPlaces,
  setView,
}: any) {
  const [showEraseModal, setShowEraseModal] = useState(false);
  const [eraseStep, setEraseStep] = useState(1);

  const dash = prefs?.dashboard || DEFAULT_PREFS.dashboard;
  const currentUnit = profile?.distanceUnit === 'imperial' ? 'imperial' : 'metric';

  const handleEraseClick = () => {
    setEraseStep(1);
    setShowEraseModal(true);
  };

  const handleConfirmErase = () => {
    if (eraseStep === 1) {
      setEraseStep(2);
    } else {
      setShowEraseModal(false);
      confirmEraseAll();
    }
  };

  return (
    <div className={`w-full min-h-full pb-16 flex flex-col ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <ScreenHeader
        onBackPress={() => setView('profile')}
        backText="‹ Profile"
        title="Settings"
        isDark={isDark}
      />

      <div className="max-w-xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* 1 - Appearance Card */}
        <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">
            Appearance
          </span>

          {/* Theme mode segmented control */}
          <div className="flex flex-col gap-1.5 mb-4">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Theme Mode
            </span>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {THEME_CHOICES.map(({ value, label }) => {
                const isActive = themeMode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => applyTheme(value)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {value === 'light' && <Sun className="w-3.5 h-3.5" />}
                    {value === 'dark' && <Moon className="w-3.5 h-3.5" />}
                    {value === 'system' && <Laptop className="w-3.5 h-3.5" />}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-gray-400">
              System follows your device color scheme setting.
            </span>
          </div>

          {/* Accent Color Palette Picker */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Accent Color
            </span>
            <div className="flex items-center gap-3 overflow-x-auto py-1 no-scrollbar">
              {ACCENT_NAMES.map((name) => {
                const isSelected = accentName === name;
                const swatchColor = ACCENTS[name].light.primary;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => applyAccent(name)}
                    style={{ backgroundColor: swatchColor }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'ring-4 ring-offset-2 ring-emerald-500 scale-110 shadow-md' : 'hover:scale-105'
                    }`}
                    title={ACCENTS[name].label}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2 - Routing & Units Card */}
        <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">
            Routing Preferences
          </span>

          {/* Preferred travel mode */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-sm font-semibold block">Preferred Travel Mode</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Default mode for new routes</span>
            </div>
            <div className="flex gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs">
              <button
                type="button"
                onClick={() => applyPreferredMode(MODES.WALKING)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  prefs?.preferredMode === MODES.WALKING
                    ? 'bg-white dark:bg-gray-700 shadow-sm font-bold text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500'
                }`}
              >
                Walking
              </button>
              <button
                type="button"
                onClick={() => applyPreferredMode(MODES.CYCLING)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  prefs?.preferredMode === MODES.CYCLING
                    ? 'bg-white dark:bg-gray-700 shadow-sm font-bold text-blue-600 dark:text-blue-400'
                    : 'text-gray-500'
                }`}
              >
                Cycling
              </button>
            </div>
          </div>

          {/* Remember route goal toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-sm font-semibold block">Remember Route Goal</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Auto-select Cleanest, Fastest, or Shortest after search
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs?.rememberRouteGoal === true}
                onChange={(e) => applyRememberRouteGoal(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Distance Units */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-semibold block">Distance Unit</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Display kilometers or miles</span>
            </div>
            <div className="flex gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs">
              <button
                type="button"
                onClick={() => setDistanceUnit('metric')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  currentUnit === 'metric'
                    ? 'bg-white dark:bg-gray-700 shadow-sm font-bold text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500'
                }`}
              >
                Metric (km)
              </button>
              <button
                type="button"
                onClick={() => setDistanceUnit('imperial')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  currentUnit === 'imperial'
                    ? 'bg-white dark:bg-gray-700 shadow-sm font-bold text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500'
                }`}
              >
                Imperial (mi)
              </button>
            </div>
          </div>
        </div>

        {/* 3 - Dashboard Section Visibility */}
        <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
            Dashboard Sections
          </span>
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
            {DASHBOARD_ROWS.map((row) => (
              <div key={row.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium">{row.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dash[row.key] !== false}
                    onChange={() => applyDashboardToggle(row.key)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* 4 - Saved Places Management Link */}
        <div
          onClick={openSavedPlaces}
          className={`p-4 rounded-2xl border shadow-sm cursor-pointer flex items-center justify-between transition-all hover:scale-[1.01] ${
            isDark ? 'bg-gray-900 border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold block">Manage Saved Places</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {savedPlaces.length} {savedPlaces.length === 1 ? 'place' : 'places'} saved
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        {/* 5 - Erase All Data */}
        <div className={`p-4 rounded-2xl border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 shadow-sm`}>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block mb-1">
            Data & Privacy
          </span>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            All trips, saved locations, and profile details are stored locally on your device only.
          </p>
          <button
            type="button"
            onClick={handleEraseClick}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-100/80 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-800 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Erase All Stored Data</span>
          </button>
        </div>

        {/* 6 - Attribution & About Card */}
        <div className={`p-4 rounded-2xl border shadow-sm text-xs ${isDark ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
            About EcoRoute
          </span>
          <p className="leading-relaxed mb-2">
            Eco-friendly trip prototyper comparing walking/cycling paths with regional PM2.5 air pollution estimates.
          </p>
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-[11px] leading-relaxed">
            {ATTRIBUTION_TEXT}
          </div>
        </div>
      </div>

      {/* Erase All Confirmation Modal */}
      {showEraseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`max-w-sm w-full p-5 rounded-2xl border shadow-2xl ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-base">
                {eraseStep === 1 ? 'Erase all data?' : 'Really erase everything?'}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              {eraseStep === 1
                ? 'This will delete your profile, saved trips, saved places and search history. This action cannot be undone.'
                : 'All trips, places, and profile details will be permanently wiped from this browser.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmErase}
                className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm"
              >
                {eraseStep === 1 ? 'Continue' : 'Yes, erase everything'}
              </button>
              <button
                type="button"
                onClick={() => setShowEraseModal(false)}
                className={`py-2.5 px-4 rounded-xl font-semibold text-xs border ${
                  isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
