import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, AlertCircle, Navigation, Clock } from 'lucide-react';
import { WebMap } from '../components/WebMap';
import { ScreenHeader, ModePill, StatTile, EmptyState, PrimaryButton } from '../components/ui';
import { formatDistance, formatDurationLong, formatTripDate } from '../lib/format';
import { storage } from '../lib/storage';
import {
  DEFAULT_REGION,
  TRAIL_KEY,
  parseTrails,
  pointAtProgress,
  progressToIndex,
  trailToCoords,
} from '../constants';

const REPLAY_TICK_MS = 50;
const REPLAY_DURATION_MS = 30000; // 30 second smooth animation

export default function ReplayScreen({
  t,
  isDark,
  trip,
  distUnit = 'metric',
  onBack,
}: any) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'none'>('loading');
  const [points, setPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let coords: { latitude: number; longitude: number }[] = [];
      if (trip) {
        try {
          const raw = await storage.getItem(TRAIL_KEY);
          const map = parseTrails(raw);
          coords = trailToCoords((map && map[String(trip.id)]) || []);
        } catch {
          coords = [];
        }
      }
      if (cancelled) return;
      if (coords.length >= 2) {
        setPoints(coords);
        setStatus('ready');
      } else {
        setStatus('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip]);

  // Playback timer
  useEffect(() => {
    if (!playing || status !== 'ready' || points.length < 2) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const step = REPLAY_TICK_MS / REPLAY_DURATION_MS;
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 1) {
          setPlaying(false);
          progressRef.current = 1;
          return 1;
        }
        progressRef.current = next;
        return next;
      });
    }, REPLAY_TICK_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, status, points]);

  const togglePlay = () => {
    if (progress >= 1) {
      setProgress(0);
      progressRef.current = 0;
    }
    setPlaying(!playing);
  };

  const handleRestart = () => {
    setPlaying(false);
    setProgress(0);
    progressRef.current = 0;
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    progressRef.current = val;
  };

  const currentMarker = points.length > 0 ? pointAtProgress(points, progress) : null;

  return (
    <div className={`relative w-full h-full flex flex-col ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <ScreenHeader
        onBackPress={onBack}
        backText="‹ History"
        title="Journey Replay"
        isDark={isDark}
      />

      {status === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">Loading journey path...</p>
        </div>
      )}

      {status === 'none' && (
        <div className="flex-1 max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mb-3">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold mb-1">Replay unavailable</h2>
          <p className="text-xs text-gray-500 max-w-xs mb-4">
            Trips recorded without GPS trail storage don't save the path you walked. Any newly tracked trips will be full-fidelity replayable.
          </p>
          <PrimaryButton onClick={onBack} label="Back to History" accentColor={t.primary} />
        </div>
      )}

      {status === 'ready' && (
        <div className="flex-1 relative flex flex-col overflow-hidden">
          {/* Map showing trail and animated marker */}
          <div className="flex-1 relative">
            <WebMap
              isDark={isDark}
              trailPoints={points}
              replayMarkerPos={currentMarker}
              fitPoints={points}
              accentColor={t.primary}
            />
          </div>

          {/* Bottom Playback Control Sheet */}
          <div className={`p-4 border-t shadow-2xl backdrop-blur-md ${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
            <div className="max-w-lg mx-auto flex flex-col gap-3">
              {/* Trip summary header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ModePill mode={trip.mode} isDark={isDark} />
                    <span className="text-sm font-bold">
                      {formatDistance(trip.actualDistanceM, distUnit)}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {formatTripDate(trip.date)}
                  </span>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                  {formatDurationLong(trip.durationSec * progress)} / {formatDurationLong(trip.durationSec)}
                </span>
              </div>

              {/* Progress Slider */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.005"
                  value={progress}
                  onChange={handleScrubberChange}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none"
                />
              </div>

              {/* Play / Pause / Restart Controls */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  style={{ backgroundColor: t.primary }}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                  title={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <div className="w-10" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
