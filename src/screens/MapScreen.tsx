import React, { useState } from 'react';
import {
  Search,
  Footprints,
  Bike,
  Navigation,
  Wind,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Zap,
  Maximize2,
  Minimize2,
  Play,
  Square,
  Crosshair,
} from 'lucide-react';
import { WebMap } from '../components/WebMap';
import { formatDistance, formatDuration, formatDurationLong, formatPmUnits } from '../lib/format';
import { distanceBetweenFixes } from '../lib/track';
import { PREFERENCES, preferenceNote } from '../lib/preferences';
import { ATTRIBUTION_TEXT, DEFAULT_REGION, MODES, TravelMode } from '../constants';
import { ModePill, PrimaryButton } from '../components/ui';

const PM_SOURCE_LABELS: Record<string, string> = {
  'open-meteo-cams': 'Model estimate · Open-Meteo CAMS',
};

function pmMetaCaption(estimate: any) {
  if (!estimate) return null;
  const source = typeof estimate.source === 'string' && estimate.source ? estimate.source : null;
  const base = PM_SOURCE_LABELS[source || ''] || (source ? `Model estimate · ${source}` : 'Model estimate');
  if (typeof estimate.as_of === 'string') {
    const when = new Date(estimate.as_of);
    if (!Number.isNaN(when.getTime())) {
      const hh = String(when.getUTCHours()).padStart(2, '0');
      const mm = String(when.getUTCMinutes()).padStart(2, '0');
      return `${base} · as of ${hh}:${mm} UTC`;
    }
  }
  return base;
}

export function PmEstimateCard({ estimate, isDark }: { estimate: any; isDark: boolean }) {
  if (!estimate) return null;
  const units = formatPmUnits(estimate.units);
  const isAvailable = estimate.available === true;

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        isAvailable
          ? isDark
            ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
            : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950'
          : isDark
          ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
          : 'bg-amber-50/80 border-amber-200/80 text-amber-950'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 opacity-90">
          <Wind className="w-3.5 h-3.5" />
          PM₂.₅ estimate (regional model)
        </span>
        <span className={`text-base font-bold ${isAvailable ? 'text-emerald-500' : 'text-amber-500'}`}>
          {isAvailable ? `${estimate.value} ${units || 'µg/m³'}` : 'Unavailable'}
        </span>
      </div>

      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
        {pmMetaCaption(estimate)}
      </div>

      {estimate.caveat && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 italic leading-tight">
          {estimate.caveat}
        </p>
      )}

      {estimate.cross_route_note && (
        <div className="text-[11px] font-medium mt-1.5 text-gray-600 dark:text-gray-300 bg-white/40 dark:bg-black/20 p-1.5 rounded">
          {estimate.cross_route_note}
        </div>
      )}
    </div>
  );
}

export default function MapScreen({
  t,
  isDark,
  primary,
  location,
  currentCoords,
  currentAccuracy,
  locationError,
  locationBannerDismissed,
  setLocationBannerDismissed,
  userPos,
  followUser,
  setFollowUser,
  destinationCoord,
  destination,
  setDestination,
  routeStatus,
  routeError,
  recentDestinations = [],
  clearRecentDestinations,
  savedPlaces = [],
  routeToSavedPlace,
  candidates = [],
  selectedId,
  setSelectedId,
  preference,
  applyPreference,
  mode,
  setMode,
  panelExpanded,
  setPanelExpanded,
  profile,
  tripActive,
  tripElapsed,
  tripDistance,
  lowAccuracyActive,
  distancePaused = false,
  tripDetailsExpanded,
  setTripDetailsExpanded,
  distUnit,
  findRoute,
  retryRoute,
  startTrip,
  finishTrip,
  setView,
  onSimulateStep,
}: any) {
  const [inputFocused, setInputFocused] = useState(false);
  const prefNoteState = preferenceNote(preference, candidates);

  // Route-start connector line calculation
  const routeConnector = (() => {
    if (routeStatus !== 'success' || !candidates || candidates.length === 0 || !selectedId) {
      return null;
    }
    const originOk =
      currentCoords &&
      typeof currentCoords.latitude === 'number' &&
      Number.isFinite(currentCoords.latitude) &&
      typeof currentCoords.longitude === 'number' &&
      Number.isFinite(currentCoords.longitude);
    if (!originOk) return null;

    const selected = candidates.find((c: any) => c && c.id === selectedId) || candidates[0];
    const rawStart = selected?.coordinates?.[0];
    if (!rawStart || !Number.isFinite(rawStart.latitude) || !Number.isFinite(rawStart.longitude)) {
      return null;
    }

    const gapM = distanceBetweenFixes(currentCoords, rawStart);
    if (!(gapM >= 25)) return null;

    return {
      line: [
        { latitude: currentCoords.latitude, longitude: currentCoords.longitude },
        { latitude: rawStart.latitude, longitude: rawStart.longitude },
      ],
      gapM: Math.round(gapM),
      accuracyNote:
        typeof currentAccuracy === 'number' && currentAccuracy >= 20
          ? ` (GPS radius ~${Math.round(currentAccuracy)}m)`
          : '',
    };
  })();

  const avatarChar = profile?.name?.trim() ? profile.name.trim().charAt(0).toUpperCase() : '👤';

  const selectedCandidate = candidates.find((c: any) => c.id === selectedId) || candidates[0];

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Map layer (full background) */}
      <div className="absolute inset-0 z-0">
        <WebMap
          isDark={isDark}
          initialCenter={location || DEFAULT_REGION}
          userPos={userPos || (currentCoords ? { latitude: currentCoords.latitude, longitude: currentCoords.longitude } : null)}
          destinationCoord={destinationCoord}
          candidates={candidates}
          selectedId={selectedId}
          onSelectCandidate={(id) => {
            setSelectedId(id);
            applyPreference(PREFERENCES.MANUAL);
          }}
          connectorLine={routeConnector ? routeConnector.line : null}
          followUser={followUser}
          accentColor={t.primary}
        />
      </div>

      {/* Top Floating Controls */}
      <div className="relative z-10 p-3 max-w-lg w-full mx-auto flex flex-col gap-2 pointer-events-none">
        {/* Top Header Card */}
        <div className={`p-2.5 rounded-2xl shadow-lg border backdrop-blur-md pointer-events-auto transition-all ${
          isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/95 border-gray-200'
        }`}>
          {/* Search Row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('profile')}
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm border shadow-sm transition-transform active:scale-95 overflow-hidden"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                borderColor: t.primary,
                color: t.primary,
              }}
              title="Profile & Settings"
            >
              {profile?.photo ? (
                <img src={profile.photo} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                avatarChar
              )}
            </button>

            {/* Destination Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                findRoute();
              }}
              className="flex-1 flex items-center relative"
            >
              <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Where to? (e.g. Central Park, Hauz Khas)"
                className={`w-full pl-9 pr-24 py-2.5 rounded-xl text-sm border font-medium focus:outline-none transition-all ${
                  isDark
                    ? 'bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500'
                    : 'bg-gray-100/90 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white'
                }`}
              />
              <button
                type="submit"
                disabled={routeStatus === 'loading' || !destination.trim()}
                style={{ backgroundColor: t.primary }}
                className="absolute right-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40 shadow-sm active:scale-95 flex items-center gap-1"
              >
                {routeStatus === 'loading' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Route</span>
                )}
              </button>
            </form>
          </div>

          {/* Mode Switcher + Recents */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            {/* Travel Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
              <button
                type="button"
                onClick={() => setMode(MODES.WALKING)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  mode === MODES.WALKING
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                Walking
              </button>
              <button
                type="button"
                onClick={() => setMode(MODES.CYCLING)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  mode === MODES.CYCLING
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                Cycling
              </button>
            </div>

            {/* Follow User / Re-center map toggle */}
            <button
              type="button"
              onClick={() => setFollowUser(!followUser)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                followUser
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
              }`}
              title="Toggle camera following user"
            >
              <Crosshair className={`w-3.5 h-3.5 ${followUser ? 'animate-pulse text-emerald-500' : ''}`} />
              <span>{followUser ? 'Tracking' : 'Free map'}</span>
            </button>
          </div>

          {/* Quick Recent Chips Row */}
          {recentDestinations.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 mt-1 no-scrollbar text-xs">
              <span className="text-[10px] text-gray-400 uppercase font-semibold flex-shrink-0">Recent:</span>
              {recentDestinations.map((rd: string) => (
                <button
                  key={rd}
                  type="button"
                  onClick={() => findRoute(rd)}
                  className="flex-shrink-0 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60 text-[11px] truncate max-w-[120px]"
                >
                  {rd}
                </button>
              ))}
              <button
                type="button"
                onClick={clearRecentDestinations}
                className="text-[10px] text-gray-400 hover:text-red-500 px-1 ml-auto flex-shrink-0"
              >
                Clear
              </button>
            </div>
          )}

          {/* Saved Places Quick Chips Row */}
          {savedPlaces.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 no-scrollbar text-xs">
              <span className="text-[10px] text-gray-400 uppercase font-semibold flex-shrink-0">Saved:</span>
              {savedPlaces.map((sp: any) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => routeToSavedPlace(sp)}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px]"
                >
                  <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium truncate max-w-[100px]">{sp.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location Banner (if location error) */}
        {locationError && !locationBannerDismissed && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-md pointer-events-auto">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>{locationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setLocationBannerDismissed(true)}
              className="text-xs font-semibold px-2 py-0.5 text-amber-700 dark:text-amber-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Route Error Card */}
        {routeStatus === 'error' && routeError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex flex-col gap-2 shadow-md pointer-events-auto">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Route finding problem</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">{routeError}</p>
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={retryRoute}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Trip Floating Card (When tracking) */}
      {tripActive && (
        <div className="absolute top-44 left-3 right-3 max-w-lg mx-auto z-20 pointer-events-auto">
          <div className="bg-white/95 dark:bg-gray-900/95 border-2 border-emerald-500 rounded-2xl shadow-2xl p-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Tracking Trip
                </span>
                <ModePill mode={mode} isDark={isDark} />
              </div>

              <button
                type="button"
                onClick={() => setTripDetailsExpanded(!tripDetailsExpanded)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                {tripDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Live readout */}
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 block uppercase font-semibold">Distance</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">
                  {formatDistance(tripDistance, distUnit) || '0 m'}
                </span>
                {distancePaused && (
                  <span className="text-[10px] text-amber-500 block font-medium">GPS paused</span>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 block uppercase font-semibold">Duration</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">
                  {formatDurationLong(tripElapsed)}
                </span>
              </div>
            </div>

            {/* Expanded trip details & Simulation trigger for browser demo */}
            {tripDetailsExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2 text-xs">
                {lowAccuracyActive && (
                  <div className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>GPS accuracy is low (~15m+). Move to open sky if possible.</span>
                  </div>
                )}

                {/* Browser test simulation affordance */}
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200 block">Simulate GPS Movement</span>
                    <span className="text-[10px] text-gray-500">Walks forward along route by ~60 meters per click</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSimulateStep && onSimulateStep()}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Step forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={finishTrip}
                className="w-full py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Finish Trip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Drawer: Route Candidates & Selection (When routes found) */}
      {candidates.length > 0 && !tripActive && (
        <div className="mt-auto relative z-10 p-3 max-w-lg w-full mx-auto pointer-events-auto">
          <div className={`rounded-2xl shadow-2xl border backdrop-blur-md overflow-hidden transition-all ${
            isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'
          }`}>
            {/* Header Handle / Collapser */}
            <div
              onClick={() => setPanelExpanded(!panelExpanded)}
              className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between cursor-pointer select-none bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800/80"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {candidates.length} {candidates.length === 1 ? 'Route' : 'Routes'} Available
                </span>
                {selectedCandidate && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {formatDistance(selectedCandidate.distanceMeters, distUnit)} · {formatDuration(selectedCandidate.durationSeconds)}
                  </span>
                )}
              </div>
              <button type="button" className="text-gray-400">
                {panelExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {panelExpanded && (
              <div className="p-3.5 max-h-[60vh] overflow-y-auto flex flex-col gap-3">
                {/* Preference chips */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Optimization Goal
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                      { key: PREFERENCES.MANUAL, label: 'Manual' },
                      { key: PREFERENCES.FASTEST, label: 'Fastest' },
                      { key: PREFERENCES.SHORTEST, label: 'Shortest' },
                      { key: PREFERENCES.CLEANEST, label: 'Cleanest' },
                      { key: PREFERENCES.OPTIMAL, label: 'Optimal' },
                    ].map((pref) => {
                      const isActive = preference === pref.key;
                      return (
                        <button
                          key={pref.key}
                          type="button"
                          onClick={() => applyPreference(pref.key)}
                          style={{
                            backgroundColor: isActive ? t.primary : undefined,
                            borderColor: isActive ? t.primary : undefined,
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition-all ${
                            isActive
                              ? 'text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {pref.label}
                        </button>
                      );
                    })}
                  </div>
                  {prefNoteState?.show && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                      {prefNoteState.text}
                    </p>
                  )}
                </div>

                {/* Candidate Route Cards */}
                <div className="flex flex-col gap-2">
                  {candidates.map((c: any, index: number) => {
                    const isSelected = c.id === selectedId;
                    const pm = c.pm25_estimate;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedId(c.id);
                          applyPreference(PREFERENCES.MANUAL);
                        }}
                        style={{
                          borderColor: isSelected ? t.primary : undefined,
                          backgroundColor: isSelected
                            ? isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)'
                            : undefined,
                        }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'shadow-md'
                            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSelected
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-sm">
                              {formatDuration(c.durationSeconds)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({formatDistance(c.distanceMeters, distUnit)})
                            </span>
                          </div>

                          {/* PM2.5 badge */}
                          {pm?.available && (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              {pm.value} µg/m³
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Route PM2.5 info card */}
                {selectedCandidate?.pm25_estimate && (
                  <PmEstimateCard estimate={selectedCandidate.pm25_estimate} isDark={isDark} />
                )}

                {/* Route snap connector notice */}
                {routeConnector && (
                  <div className="text-[11px] p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                    Route starts ~{routeConnector.gapM}m from your current position (connecting walk to nearest street){routeConnector.accuracyNote}.
                  </div>
                )}

                {/* Start Trip CTA */}
                <PrimaryButton
                  onClick={startTrip}
                  label="Start Trip"
                  accentColor={t.primary}
                  icon={<Navigation className="w-4 h-4 fill-white" />}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom attribution string */}
      <div className="relative z-10 text-[10px] text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-950/70 text-center py-1 px-2 border-t border-gray-200 dark:border-gray-800">
        {ATTRIBUTION_TEXT}
      </div>
    </div>
  );
}
