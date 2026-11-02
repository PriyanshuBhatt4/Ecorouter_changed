import React, { useState } from 'react';
import {
  History,
  Trash2,
  Share2,
  Play,
  Calendar,
  Clock,
  Navigation,
  Wind,
  Check,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import { formatDistance, formatDurationLong, formatTripDate } from '../lib/format';
import { paceLabel } from '../lib/stats';
import { ScreenHeader, ModePill, StatTile, EmptyState, PrimaryButton, GhostButton } from '../components/ui';

function buildTripShareMessage(trip: any, distUnit: string) {
  const parts: string[] = [];
  const title = trip && typeof trip.title === 'string' ? trip.title.trim() : '';
  parts.push(title !== '' ? title : 'Trip');
  parts.push(formatTripDate(trip ? trip.date : undefined));
  const mode = trip && typeof trip.mode === 'string' && trip.mode !== '' ? trip.mode : 'Other';
  parts.push(`Mode: ${mode.charAt(0).toUpperCase()}${mode.slice(1)}`);
  const distance = trip ? formatDistance(trip.actualDistanceM, distUnit) : null;
  if (distance) parts.push(`Distance: ${distance}`);
  if (trip && Number.isFinite(trip.durationSec)) parts.push(`Time: ${formatDurationLong(trip.durationSec)}`);
  const pace = trip ? paceLabel(trip, distUnit) : null;
  if (pace) {
    parts.push(`${trip.mode === 'cycling' ? 'Avg speed' : 'Avg pace'}: ${pace}`);
  }
  return parts.join('\n');
}

export default function HistoryScreen({
  t,
  isDark,
  trips = [],
  tripsLoaded,
  detailTripId,
  draftTripId,
  draftTitle,
  setDraftTitle,
  draftDescription,
  setDraftDescription,
  distUnit = 'metric',
  openTripDetail,
  closeDetail,
  confirmDeleteTrip,
  saveTripNotes,
  openReplay,
  setView,
}: any) {
  const [copied, setCopied] = useState(false);
  const detailTrip = detailTripId ? trips.find((tr: any) => tr && tr.id === detailTripId) : null;
  const detailPace = detailTrip ? paceLabel(detailTrip, distUnit) : null;

  const handleShare = async () => {
    if (!detailTrip) return;
    const msg = buildTripShareMessage(detailTrip, distUnit);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(msg);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };

  // If viewing details of a specific trip
  if (detailTrip) {
    return (
      <div className={`w-full min-h-full pb-16 flex flex-col ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <ScreenHeader
          onBackPress={closeDetail}
          backText="‹ Trips"
          title={detailTrip.title || 'Trip Details'}
          isDark={isDark}
          rightAffordance={
            <button
              type="button"
              onClick={() => confirmDeleteTrip(detailTrip.id)}
              className="p-1.5 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Delete trip"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          }
        />

        <div className="max-w-xl w-full mx-auto p-4 flex flex-col gap-4">
          {/* Notes Card */}
          <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <ModePill mode={detailTrip.mode} isDark={isDark} />
              <span className="text-xs text-gray-400">
                {formatTripDate(detailTrip.date)}
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={() => saveTripNotes(detailTrip.id)}
                placeholder="Give this trip a title..."
                className={`w-full font-bold text-base px-3 py-2 rounded-xl border focus:outline-none ${
                  isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />

              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                onBlur={() => saveTripNotes(detailTrip.id)}
                placeholder="Add notes about this journey (weather, route feel, scenery)..."
                rows={3}
                className={`w-full text-sm px-3 py-2 rounded-xl border focus:outline-none resize-none ${
                  isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>
          </div>

          {/* Stat Tiles */}
          <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">
              Performance Stats
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile
                value={formatDistance(detailTrip.actualDistanceM, distUnit) || '0 m'}
                label="Actual Distance"
                isDark={isDark}
              />
              <StatTile
                value={formatDurationLong(detailTrip.durationSec)}
                label="Duration"
                isDark={isDark}
              />
              {detailPace && (
                <StatTile
                  value={detailPace}
                  label={detailTrip.mode === 'cycling' ? 'Avg Speed' : 'Avg Pace'}
                  isDark={isDark}
                />
              )}
              {typeof detailTrip.plannedPm25 === 'number' && (
                <StatTile
                  value={`${detailTrip.plannedPm25.toFixed(1)} µg/m³`}
                  label="Planned PM₂.₅"
                  isDark={isDark}
                  sublabel="Air exposure"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <PrimaryButton
              onClick={() => openReplay(detailTrip.id)}
              label="Replay Journey"
              accentColor={t.primary}
              icon={<Play className="w-4 h-4 fill-white" />}
            />

            <button
              type="button"
              onClick={handleShare}
              className={`w-full py-3 px-4 rounded-xl font-semibold border flex items-center justify-center gap-2 transition-all ${
                copied
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : isDark
                  ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                  : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Summary copied to clipboard!' : 'Share Trip Summary'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // History list view
  return (
    <div className={`w-full min-h-full pb-16 flex flex-col ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <ScreenHeader
        onBackPress={() => setView('profile')}
        backText="‹ Profile"
        title="Trip History"
        isDark={isDark}
      />

      <div className="max-w-xl w-full mx-auto p-4 flex flex-col gap-3">
        {!tripsLoaded ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-gray-500">Loading trips...</span>
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            title="No completed trips yet"
            hint="Your finished walking and cycling trips will appear here with replayable GPS routes, stats, and notes."
            isDark={isDark}
            icon={<History className="w-8 h-8" />}
          />
        ) : (
          trips.map((tr: any) => (
            <div
              key={tr.id}
              onClick={() => openTripDetail(tr.id)}
              className={`p-3.5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:scale-[1.01] ${
                isDark
                  ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ModePill mode={tr.mode} isDark={isDark} />
                  <span className="text-xs text-gray-400 font-medium">
                    {formatTripDate(tr.date)}
                  </span>
                </div>
                {typeof tr.plannedPm25 === 'number' && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                    {tr.plannedPm25.toFixed(1)} µg/m³
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-2.5">
                <div>
                  <h3 className="font-bold text-sm">
                    {tr.title ? tr.title : `${tr.mode === 'cycling' ? 'Bike ride' : 'Walk'} · ${formatDistance(tr.actualDistanceM, distUnit)}`}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span>{formatDistance(tr.actualDistanceM, distUnit) || '0 m'}</span>
                    <span>·</span>
                    <span>{formatDurationLong(tr.durationSec)}</span>
                    {paceLabel(tr, distUnit) && (
                      <>
                        <span>·</span>
                        <span>{paceLabel(tr, distUnit)}</span>
                      </>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
