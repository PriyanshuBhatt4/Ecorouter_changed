import React from 'react';
import { ChevronLeft, Footprints, Bike } from 'lucide-react';
import { MODES } from '../constants';

export function ModePill({
  mode,
  className = '',
  isDark = false,
}: {
  mode: string;
  className?: string;
  isDark?: boolean;
}) {
  const isWalking = mode === MODES.WALKING;
  const isCycling = mode === MODES.CYCLING;

  let bgClass = isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700';
  if (isWalking) {
    bgClass = isDark ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-800 border border-emerald-200';
  } else if (isCycling) {
    bgClass = isDark ? 'bg-blue-950/70 text-blue-300 border border-blue-800/50' : 'bg-blue-50 text-blue-800 border border-blue-200';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bgClass} ${className}`}>
      {isWalking && <Footprints className="w-3.5 h-3.5" />}
      {isCycling && <Bike className="w-3.5 h-3.5" />}
      {String(mode || '').charAt(0).toUpperCase() + String(mode || '').slice(1) || 'Other'}
    </span>
  );
}

export function ScreenHeader({
  onBackPress,
  backText = '‹ Back',
  title,
  isDark = false,
  rightAffordance,
}: {
  onBackPress: () => void;
  backText?: string;
  title: string;
  isDark?: boolean;
  rightAffordance?: React.ReactNode;
}) {
  return (
    <div className={`sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md ${isDark ? 'bg-gray-900/90 border-gray-800 text-white' : 'bg-white/90 border-gray-200 text-gray-900'}`}>
      <button
        type="button"
        onClick={onBackPress}
        className={`flex items-center gap-1 text-sm font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
          isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Back button"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{backText.replace(/^[‹<]\s*/, '')}</span>
      </button>

      <h1 className="text-base font-semibold truncate max-w-[200px]">{title}</h1>

      <div className="w-16 flex justify-end">
        {rightAffordance}
      </div>
    </div>
  );
}

export function PrimaryButton({
  onClick,
  disabled = false,
  label,
  className = '',
  accentColor = '#10B981',
  icon,
}: {
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  className?: string;
  accentColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor: disabled ? '#9CA3AF' : accentColor }}
      className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function GhostButton({
  onClick,
  label,
  className = '',
  isDark = false,
}: {
  onClick?: () => void;
  label: string;
  className?: string;
  isDark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
        isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      } ${className}`}
    >
      {label}
    </button>
  );
}

export function EmptyState({
  title,
  hint,
  isDark = false,
  icon,
}: {
  title: string;
  hint: string;
  isDark?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`text-center py-8 px-4 rounded-2xl border ${isDark ? 'bg-gray-900/40 border-gray-800/80' : 'bg-gray-50 border-gray-100'}`}>
      {icon && <div className="flex justify-center mb-2.5 text-gray-400">{icon}</div>}
      <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h3>
      <p className={`text-xs max-w-xs mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{hint}</p>
    </div>
  );
}

export function StatTile({
  value,
  label,
  isDark = false,
  sublabel,
}: {
  value: React.ReactNode;
  label: string;
  isDark?: boolean;
  sublabel?: string;
}) {
  return (
    <div className={`p-3.5 rounded-xl border flex flex-col justify-center ${isDark ? 'bg-gray-800/60 border-gray-700/60' : 'bg-gray-50 border-gray-200/80'}`}>
      <span className={`text-lg font-bold tracking-tight truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{value}</span>
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{label}</span>
      {sublabel && <span className="text-[10px] text-gray-400 mt-0.5">{sublabel}</span>}
    </div>
  );
}
