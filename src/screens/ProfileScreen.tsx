import React from 'react';
import {
  Settings,
  History,
  Award,
  Flame,
  Calendar,
  Activity,
  User,
  Scale,
  Camera,
  Trash2,
  ChevronRight,
  Zap,
} from 'lucide-react';
import {
  lifetimeStats,
  streakCalendar,
  streakCalendarHeatmap,
  computeBadges,
  weekSummary,
} from '../lib/stats';
import { formatDistance, formatDurationLong, formatTripDate } from '../lib/format';
import { computeMonthLabelPlan, computeContentWidth, WEEKDAY_COL_WIDTH, WEEKDAY_GUTTER, WEEK_PITCH, CELL_SIZE } from '../lib/heatmapLayout';
import { DEFAULT_PREFS } from '../constants';
import { RING_COLORS } from '../theme/palette';
import { ScreenHeader, ModePill, StatTile, GhostButton, EmptyState } from '../components/ui';

const STREAK_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STREAK_LEGEND = [
  { level: 0, label: '0 trips' },
  { level: 1, label: '1 trip' },
  { level: 2, label: '2 trips' },
  { level: 3, label: '3+ trips' },
];

export default function ProfileScreen({
  t,
  isDark,
  trips = [],
  profile,
  prefs = DEFAULT_PREFS,
  distUnit = 'metric',
  saveProfile,
  changeProfilePhoto,
  removeProfilePhoto,
  openHistory,
  setView,
}: any) {
  const dash = prefs?.dashboard || DEFAULT_PREFS.dashboard;
  const stats = lifetimeStats(trips, profile);
  const badges = computeBadges(trips);
  const week = weekSummary(trips);

  const hasName = Boolean(profile?.name && profile.name.trim());
  const avatarChar = hasName ? profile.name.trim().charAt(0).toUpperCase() : '·';

  const ring = streakCalendar(trips);
  const ringColors = isDark ? RING_COLORS.dark : RING_COLORS.light;
  const heatmap = streakCalendarHeatmap(trips);
  const monthLabelPlan = computeMonthLabelPlan(heatmap);
  const heatmapContentWidth = computeContentWidth(heatmap, true);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        saveProfile({ ...profile, photo: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`w-full min-h-full pb-16 flex flex-col ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <ScreenHeader
        onBackPress={() => setView('map')}
        backText="‹ Map"
        title="Profile"
        isDark={isDark}
        rightAffordance={
          <button
            type="button"
            onClick={() => setView('settings')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Profile Card */}
        <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer group flex-shrink-0">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <div
                style={{ borderColor: t.primary }}
                className="w-16 h-16 rounded-full border-2 overflow-hidden flex items-center justify-center font-bold text-2xl bg-gray-100 dark:bg-gray-800 shadow-sm relative"
              >
                {profile?.photo ? (
                  <img src={profile.photo} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: t.primary }}>{avatarChar}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
            </label>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">
                {hasName ? profile.name : 'Set your name'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Local profile — stored on this device only
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <label className="text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer hover:underline">
                  Change photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {profile?.photo && (
                  <button
                    type="button"
                    onClick={removeProfilePhoto}
                    className="text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Edit Details Inputs */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Display name
              </label>
              <input
                type="text"
                value={profile?.name || ''}
                onChange={(e) => saveProfile({ ...profile, name: e.target.value })}
                placeholder="Your name"
                className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                  isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Body weight (kg, optional)
              </label>
              <input
                type="number"
                value={profile?.weightKg || ''}
                onChange={(e) => saveProfile({ ...profile, weightKg: e.target.value })}
                placeholder="e.g. 70"
                className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                  isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Lifetime Totals Grid */}
        <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Lifetime Totals
            </span>
            <button
              type="button"
              onClick={openHistory}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View History ({trips.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <StatTile
              value={formatDistance(stats.distanceM, distUnit) || '0 km'}
              label="Total Distance"
              isDark={isDark}
            />
            <StatTile
              value={formatDurationLong(stats.timeSec)}
              label="Moving Time"
              isDark={isDark}
            />
            <StatTile
              value={stats.tripCount}
              label="Completed Trips"
              isDark={isDark}
            />
            {stats.kcal !== null && stats.kcal > 0 && (
              <StatTile
                value={`${Math.round(stats.kcal)} kcal`}
                label="Est. Burned"
                isDark={isDark}
                sublabel="MET estimate"
              />
            )}
            {stats.exposureUgM3 !== null && (
              <StatTile
                value={`${stats.exposureUgM3.toFixed(1)} µg/m³`}
                label="Mean PM₂.₅"
                isDark={isDark}
                sublabel="CAMS model"
              />
            )}
          </div>
        </div>

        {/* This Week Summary (if enabled in prefs) */}
        {dash.week && (
          <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
              Last 7 Days
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-xl font-bold">{week.tripCount}</span>
                <span className="text-xs text-gray-500 block mt-0.5">Trips completed</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-xl font-bold">{formatDistance(week.distanceM, distUnit) || '0 m'}</span>
                <span className="text-xs text-gray-500 block mt-0.5">Distance moved</span>
              </div>
            </div>
          </div>
        )}

        {/* 365-day Activity Streak & Heatmap (if enabled in prefs) */}
        {dash.streak && (
          <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Activity Streak
              </span>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {ring.currentStreak} day streak
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">
                  Best: {ring.longestStreak} days
                </span>
              </div>
            </div>

            {/* Heatmap Contribution Grid */}
            <div className="overflow-x-auto pb-2 no-scrollbar">
              <div style={{ width: heatmapContentWidth }} className="relative">
                {/* Month labels row */}
                <div className="h-4 relative mb-1 text-[10px] text-gray-400 font-medium">
                  {monthLabelPlan.labels.map((item, idx) => (
                    <span key={idx} style={{ position: 'absolute', left: item.x }}>
                      {item.label}
                    </span>
                  ))}
                </div>

                {/* Day-of-week rows + Week columns */}
                <div className="flex">
                  {/* Day labels column */}
                  <div style={{ width: WEEKDAY_COL_WIDTH, marginRight: WEEKDAY_GUTTER }} className="flex flex-col gap-[3px] text-[9px] text-gray-400 pt-0.5 select-none font-medium">
                    {STREAK_WEEKDAYS.map((day, i) => (
                      <span key={day} style={{ height: CELL_SIZE }} className="flex items-center">
                        {i % 2 === 1 ? day : ''}
                      </span>
                    ))}
                  </div>

                  {/* Weeks grid */}
                  <div className="flex gap-[3px]">
                    {heatmap.months.map((m: any) =>
                      m.weeks.map((week: any[], wIdx: number) => (
                        <div key={`${m.label}-${wIdx}`} className="flex flex-col gap-[3px]">
                          {week.map((cell: any, cIdx: number) => {
                            if (!cell) {
                              return (
                                <div
                                  key={cIdx}
                                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                                  className="rounded-[2px] opacity-0"
                                />
                              );
                            }
                            const bg = (ringColors as any)[cell.level] || ringColors[0];
                            const isHollow = !cell.inHistory;
                            return (
                              <div
                                key={cell.key}
                                title={`${cell.key}: ${cell.count} trip(s)`}
                                style={{
                                  width: CELL_SIZE,
                                  height: CELL_SIZE,
                                  backgroundColor: isHollow ? 'transparent' : bg,
                                  border: isHollow ? `1px solid ${ringColors.hollowBorder}` : undefined,
                                }}
                                className="rounded-[2px] transition-transform hover:scale-125"
                              />
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-3 mt-2 text-[10px] text-gray-400">
              <span>Less</span>
              {STREAK_LEGEND.map((l) => (
                <div
                  key={l.level}
                  style={{ width: 10, height: 10, backgroundColor: (ringColors as any)[l.level] }}
                  className="rounded-[2px]"
                  title={l.label}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        )}

        {/* Achievements / Badges (if enabled in prefs) */}
        {dash.achievements && (
          <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-3">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Badges & Achievements
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {badges.map((b: any) => (
                <div
                  key={b.id}
                  className={`p-3 rounded-xl border flex items-center gap-3 ${
                    b.earned
                      ? isDark
                        ? 'bg-emerald-950/20 border-emerald-800/40'
                        : 'bg-emerald-50/70 border-emerald-200/80'
                      : isDark
                      ? 'bg-gray-800/30 border-gray-800 opacity-60'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      b.earned
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {b.earned ? '✓' : '🔒'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold truncate block">{b.label}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
                      {b.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Trips List (if enabled in prefs) */}
        {dash.recent && (
          <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Recent Trips
              </span>
              <button
                type="button"
                onClick={openHistory}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                All ({trips.length})
              </button>
            </div>

            {trips.length === 0 ? (
              <EmptyState
                title="No trips recorded yet"
                hint="Start and finish a trip on the map to see your history."
                isDark={isDark}
              />
            ) : (
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                {trips.slice(0, 3).map((tr: any) => (
                  <div
                    key={tr.id}
                    onClick={openHistory}
                    className="py-2.5 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <ModePill mode={tr.mode} isDark={isDark} />
                        <span className="text-xs font-bold">
                          {formatDistance(tr.actualDistanceM, distUnit)}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 block mt-0.5">
                        {formatTripDate(tr.date)}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
