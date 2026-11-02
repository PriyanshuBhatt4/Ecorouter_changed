import React, { useState, useEffect, useRef } from 'react';
import { PREFERENCES, selectByPreference } from './lib/preferences';
import { createTripDistanceAccountant, distanceStep, finishTripDistance, tripStep } from './lib/track';
import MapScreen from './screens/MapScreen.tsx';
import ProfileScreen from './screens/ProfileScreen.tsx';
import HistoryScreen from './screens/HistoryScreen.tsx';
import SettingsScreen from './screens/SettingsScreen.tsx';
import SavedPlacesScreen from './screens/SavedPlacesScreen.tsx';
import MapPickerScreen from './screens/MapPickerScreen.tsx';
import ReplayScreen from './screens/ReplayScreen.tsx';
import {
  API_BASE_URL,
  ACCENT_KEY,
  ACTIVE_TRIP_KEY,
  DEFAULT_PROFILE,
  DEFAULT_REGION,
  ERROR_MESSAGES,
  MODES,
  PLACE_CATEGORIES,
  PREFS_KEY,
  PROFILE_KEY,
  RECENT_DESTINATION_KEY,
  SAVED_PLACES_KEY,
  SAVED_PLACES_MAX,
  TRAIL_KEY,
  TRAIL_MAX_POINTS,
  TRIPS_KEY,
  THEME_KEY,
  SavedPlace,
  UserProfile,
  UserPrefs,
  buildSavedPlace,
  isValidRouteGoal,
  parsePrefs,
  parseRecentDestinations,
  parseSavedPlaces,
  parseTrails,
  pushRecentDestination,
  shouldRetainSample,
  thinTrailPoints,
} from './constants';
import { ACCENTS, makePalette } from './theme/palette';
import { storage } from './lib/storage';

export default function App() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [destination, setDestination] = useState('');
  const [routeStatus, setRouteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preference, setPreference] = useState<string>(PREFERENCES.MANUAL);
  const [mode, setMode] = useState<string>(MODES.WALKING);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [view, setView] = useState<'map' | 'profile' | 'history' | 'settings' | 'saved' | 'savedPick' | 'replay'>('map');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [trips, setTrips] = useState<any[]>([]);
  const [tripActive, setTripActive] = useState(false);
  const [tripStartTime, setTripStartTime] = useState<number | null>(null);
  const [tripElapsed, setTripElapsed] = useState(0);
  const [tripDistance, setTripDistance] = useState(0);
  const [lowAccuracyActive, setLowAccuracyActive] = useState(false);
  const [distancePaused, setDistancePaused] = useState(false);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const followUserRef = useRef(true);
  const [destinationCoord, setDestinationCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);

  // Appearance
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [accentName, setAccentName] = useState<string>('green');
  const [systemIsDark, setSystemIsDark] = useState(false);

  const [prefs, setPrefs] = useState<UserPrefs>(() => parsePrefs(null));
  const prefsLoadedRef = useRef(false);
  const prefsRef = useRef(prefs);

  const [tripDetailsExpanded, setTripDetailsExpanded] = useState(false);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [recentDestinations, setRecentDestinations] = useState<string[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);

  // Add place flow
  const [savedAddStatus, setSavedAddStatus] = useState<'idle' | 'searching' | 'locating'>('idle');
  const [savedAddError, setSavedAddError] = useState<string | null>(null);
  const [savedCoordError, setSavedCoordError] = useState<any>(null);
  const [pendingPlace, setPendingPlace] = useState<any>(null);

  // Detail trip navigation
  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  const [draftTripId, setDraftTripId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [replayTripId, setReplayTripId] = useState<string | null>(null);

  // Tracking refs
  const locationSubRef = useRef<number | null>(null);
  const tripFilterRef = useRef<any>(null);
  const tripDistanceRef = useRef(0);
  const distanceAccountantRef = useRef(createTripDistanceAccountant());
  const consecutiveLowAccuracyRef = useRef(0);
  const lastTrustedPairRef = useRef<any>(null);
  const trailRef = useRef<{ latitude: number; longitude: number }[]>([]);
  const lastRouteAttemptRef = useRef<any>(null);
  const routeBusyRef = useRef(false);
  const tripActiveRef = useRef(false);
  const plannedPm25Ref = useRef<number | null>(null);
  const dataEpochRef = useRef(0);
  const simStepIndexRef = useRef(0);

  // Detect OS dark mode
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemIsDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);

  const resolvedTheme = themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode;
  const isDark = resolvedTheme === 'dark';
  const t = makePalette(resolvedTheme, accentName);

  // Load stored state on mount
  useEffect(() => {
    (async () => {
      try {
        const p = await storage.getItem(PROFILE_KEY);
        if (p) {
          try {
            const parsed = JSON.parse(p);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setProfile(parsed);
            }
          } catch {}
        }
        const tr = await storage.getItem(TRIPS_KEY);
        if (tr) {
          try {
            const parsedTrips = JSON.parse(tr);
            if (Array.isArray(parsedTrips)) {
              setTrips(
                parsedTrips.filter(
                  (trip) =>
                    !!trip &&
                    typeof trip === 'object' &&
                    (typeof trip.id === 'string' || typeof trip.id === 'number')
                )
              );
            }
          } catch {}
        }
        const th = await storage.getItem(THEME_KEY);
        if (th === 'light' || th === 'dark' || th === 'system') setThemeMode(th);

        const ac = await storage.getItem(ACCENT_KEY);
        if (typeof ac === 'string' && Object.prototype.hasOwnProperty.call(ACCENTS, ac)) {
          setAccentName(ac);
        }

        const rd = await storage.getItem(RECENT_DESTINATION_KEY);
        const { list } = parseRecentDestinations(rd);
        if (list.length > 0) setRecentDestinations(list);

        const sp = await storage.getItem(SAVED_PLACES_KEY);
        setSavedPlaces(parseSavedPlaces(sp));

        const pf = await storage.getItem(PREFS_KEY);
        const parsedPrefs = parsePrefs(pf);
        prefsRef.current = parsedPrefs;
        setPrefs(parsedPrefs);

        if (parsedPrefs.rememberRouteGoal === true && isValidRouteGoal(parsedPrefs.lastRouteGoal)) {
          setPreference(parsedPrefs.lastRouteGoal);
        }
        await storage.removeItem(ACTIVE_TRIP_KEY);
      } catch {
      } finally {
        setTripsLoaded(true);
        prefsLoadedRef.current = true;
      }
    })();

    // Browser Geolocation Init
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setLocation(loc);
          setCurrentCoords(loc);
          setCurrentAccuracy(pos.coords.accuracy || 10);
        },
        () => {
          // If denied, fallback to default region
          setLocation(DEFAULT_REGION);
          setCurrentCoords(DEFAULT_REGION);
          setLocationError('Location permission not granted. Map defaulted to central region.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocation(DEFAULT_REGION);
      setCurrentCoords(DEFAULT_REGION);
    }
  }, []);

  useEffect(() => {
    followUserRef.current = followUser;
  }, [followUser]);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const applyTheme = (next: 'light' | 'dark' | 'system') => {
    setThemeMode(next);
    storage.setItem(THEME_KEY, next).catch(() => {});
  };

  const applyAccent = (next: string) => {
    if (!Object.prototype.hasOwnProperty.call(ACCENTS, next)) return;
    setAccentName(next);
    storage.setItem(ACCENT_KEY, next).catch(() => {});
  };

  const updatePrefs = (patch: Partial<UserPrefs>) => {
    if (!prefsLoadedRef.current) return;
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefs(next);
    storage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const applyPreferredMode = (next: 'walking' | 'cycling') => {
    if (next !== MODES.WALKING && next !== MODES.CYCLING) return;
    updatePrefs({ preferredMode: next });
  };

  const applyDashboardToggle = (key: string) => {
    const stored = (prefsRef.current && prefsRef.current.dashboard) || {};
    updatePrefs({
      dashboard: {
        week: true,
        achievements: true,
        streak: true,
        recent: true,
        ...stored,
        [key]: !stored[key],
      },
    });
  };

  const applyRememberRouteGoal = (next: boolean) => {
    updatePrefs({ rememberRouteGoal: next === true });
  };

  const prefsPreferredMode = prefs?.preferredMode;
  useEffect(() => {
    if (prefsPreferredMode !== MODES.WALKING && prefsPreferredMode !== MODES.CYCLING) return;
    if (routeStatus !== 'idle' || tripActive) return;
    setMode(prefsPreferredMode);
  }, [prefsPreferredMode]);

  const distUnit = profile?.distanceUnit === 'imperial' ? 'imperial' : 'metric';

  const setDistanceUnit = (next: 'metric' | 'imperial') => {
    if (next !== 'metric' && next !== 'imperial') return;
    saveProfile({ ...profile, distanceUnit: next });
  };

  const doEraseAll = async () => {
    dataEpochRef.current += 1;
    if (tripActive || tripActiveRef.current) {
      tripActiveRef.current = false;
      if (locationSubRef.current !== null) {
        navigator.geolocation?.clearWatch(locationSubRef.current);
        locationSubRef.current = null;
      }
      tripDistanceRef.current = 0;
      distanceAccountantRef.current = createTripDistanceAccountant();
      lastTrustedPairRef.current = null;
      consecutiveLowAccuracyRef.current = 0;
      setDistancePaused(false);
      tripFilterRef.current = null;
      plannedPm25Ref.current = null;
      trailRef.current = [];
      setTripActive(false);
      setTripStartTime(null);
      setTripElapsed(0);
      setLowAccuracyActive(false);
      setTripDetailsExpanded(false);
    }
    await storage.multiRemove([
      PROFILE_KEY,
      TRIPS_KEY,
      ACTIVE_TRIP_KEY,
      RECENT_DESTINATION_KEY,
      SAVED_PLACES_KEY,
      TRAIL_KEY,
      PREFS_KEY,
    ]);
    setTrips([]);
    setProfile(DEFAULT_PROFILE);
    setSavedPlaces([]);
    setRecentDestinations([]);
    const freshPrefs = parsePrefs(null);
    prefsRef.current = freshPrefs;
    setPrefs(freshPrefs);
    setDetailTripId(null);
    setDraftTripId(null);
    setReplayTripId(null);
    setView('profile');
  };

  const resetRouteStateForSearch = () => {
    setCandidates([]);
    setSelectedId(null);
    setPreference(PREFERENCES.MANUAL);
    setDestinationCoord(null);
    setRouteError(null);
  };

  const acquireOrigin = async (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const pt = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setCurrentCoords(pt);
            setCurrentAccuracy(pos.coords.accuracy || 10);
            if (!location) setLocation(pt);
            resolve(pt);
          },
          () => {
            const fallback = currentCoords || location || DEFAULT_REGION;
            resolve(fallback);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        const fallback = currentCoords || location || DEFAULT_REGION;
        resolve(fallback);
      }
    });
  };

  const applyRouteResults = (result: any) => {
    const list = result.candidates || [];
    if (list.length === 0) return;

    setCandidates(list);
    setSelectedId(list[0].id);
    setPreference(PREFERENCES.MANUAL);
    setPanelExpanded(true);

    const prefsNow = prefsRef.current;
    const storedGoal =
      prefsNow?.rememberRouteGoal === true && isValidRouteGoal(prefsNow.lastRouteGoal)
        ? prefsNow.lastRouteGoal
        : null;

    if (storedGoal !== null) {
      setPreference(storedGoal);
      const picked = selectByPreference(list, storedGoal);
      if (picked) setSelectedId(picked.id);
    }

    const dest = result.destination;
    if (dest && typeof dest.latitude === 'number' && typeof dest.longitude === 'number') {
      setDestinationCoord({ latitude: dest.latitude, longitude: dest.longitude });
    }
  };

  const findRoute = async (queryOverride?: string) => {
    const query = (typeof queryOverride === 'string' ? queryOverride : destination).trim();
    if (routeStatus === 'loading' || routeBusyRef.current) return;
    lastRouteAttemptRef.current = { kind: 'text', query };
    const epochAtStart = dataEpochRef.current;

    if (!query) {
      resetRouteStateForSearch();
      setRouteStatus('error');
      setRouteError('Enter a destination first.');
      return;
    }

    routeBusyRef.current = true;
    resetRouteStateForSearch();
    setRouteStatus('loading');

    try {
      const origin = await acquireOrigin();
      const res = await fetch(`${API_BASE_URL}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: origin.latitude,
          longitude: origin.longitude,
          destination: query,
          mode,
          alternatives: 3,
        }),
      });

      if (dataEpochRef.current !== epochAtStart) {
        setRouteStatus('idle');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || ERROR_MESSAGES.NETWORK);
      }

      applyRouteResults(data);
      setRouteStatus('success');

      const pushed = pushRecentDestination(recentDestinations, query);
      if (pushed.changed) {
        setRecentDestinations(pushed.list);
        storage.setItem(RECENT_DESTINATION_KEY, JSON.stringify(pushed.list)).catch(() => {});
      }
    } catch (err: any) {
      setRouteStatus('error');
      setRouteError(err?.message || ERROR_MESSAGES.NETWORK);
    } finally {
      routeBusyRef.current = false;
    }
  };

  const routeToSavedPlace = async (place: SavedPlace) => {
    if (!place || routeStatus === 'loading' || routeBusyRef.current) return;
    lastRouteAttemptRef.current = { kind: 'saved', place };
    const epochAtStart = dataEpochRef.current;

    routeBusyRef.current = true;
    setDestination(place.name);
    setView('map');
    resetRouteStateForSearch();
    setRouteStatus('loading');

    try {
      const origin = await acquireOrigin();
      const res = await fetch(`${API_BASE_URL}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: origin.latitude,
          longitude: origin.longitude,
          destination: place.name,
          destinationLatitude: place.latitude,
          destinationLongitude: place.longitude,
          destinationName: place.name,
          mode,
          alternatives: 3,
        }),
      });

      if (dataEpochRef.current !== epochAtStart) {
        setRouteStatus('idle');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || ERROR_MESSAGES.NETWORK);
      }

      applyRouteResults(data);
      setRouteStatus('success');
    } catch (err: any) {
      setRouteStatus('error');
      setRouteError(err?.message || ERROR_MESSAGES.NETWORK);
    } finally {
      routeBusyRef.current = false;
    }
  };

  const retryRoute = () => {
    const last = lastRouteAttemptRef.current;
    if (!last) {
      findRoute();
    } else if (last.kind === 'saved') {
      routeToSavedPlace(last.place);
    } else {
      findRoute(last.query);
    }
  };

  const applyPreference = (pref: string) => {
    if (isValidRouteGoal(pref) && prefsRef.current?.lastRouteGoal !== pref) {
      updatePrefs({ lastRouteGoal: pref });
    }
    if (candidates.length === 0) return;
    setPreference(pref);
    const picked = selectByPreference(candidates, pref);
    if (picked) setSelectedId(picked.id);
  };

  const primary = candidates.find((c) => c.id === selectedId) || candidates[0];

  const startTrip = async () => {
    if (!primary || tripActiveRef.current) return;
    tripActiveRef.current = true;
    setTripActive(true);
    setTripStartTime(Date.now());
    setTripElapsed(0);
    setTripDistance(0);
    setTripDetailsExpanded(false);
    tripDistanceRef.current = 0;
    distanceAccountantRef.current = createTripDistanceAccountant();
    lastTrustedPairRef.current = null;
    consecutiveLowAccuracyRef.current = 0;
    setDistancePaused(false);
    tripFilterRef.current = null;
    trailRef.current = [];
    simStepIndexRef.current = 0;
    setLowAccuracyActive(false);
    setFollowUser(true);

    const pmEstimate = primary?.pm25_estimate;
    const plannedPm25 =
      pmEstimate?.available === true && typeof pmEstimate.value === 'number' && Number.isFinite(pmEstimate.value)
        ? pmEstimate.value
        : null;
    plannedPm25Ref.current = plannedPm25;

    // Start GPS watch
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          handleIncomingGpsFix({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
      locationSubRef.current = watchId;
    }
  };

  const handleIncomingGpsFix = (cur: any) => {
    const prevFix = tripFilterRef.current;
    const step = tripStep(prevFix, cur);

    if (prevFix == null || step.quality === 'ok') {
      const p = { latitude: cur.latitude, longitude: cur.longitude };
      setUserPos(p);

      if (prevFix) {
        const account = distanceStep(distanceAccountantRef.current, step, prevFix, cur);
        distanceAccountantRef.current = account.state;
        tripDistanceRef.current = account.state.decidedMeters;
        if (account.added) {
          setTripDistance(account.state.decidedMeters);
        }
      }

      tripFilterRef.current = cur;
      lastTrustedPairRef.current = { prev: prevFix, cur };

      const trail = trailRef.current;
      const lastTrail = trail.length > 0 ? trail[trail.length - 1] : null;
      if (shouldRetainSample(lastTrail, cur)) {
        trail.push({ latitude: cur.latitude, longitude: cur.longitude });
      }
    }

    if (step.quality === 'low_accuracy') {
      consecutiveLowAccuracyRef.current += 1;
      setDistancePaused(consecutiveLowAccuracyRef.current >= 2);
    } else if (step.quality === 'ok') {
      consecutiveLowAccuracyRef.current = 0;
      setDistancePaused(false);
    }
    setLowAccuracyActive(step.lowAccuracy);
  };

  // Simulation step forward along candidate polyline for browser testing
  const simulateStep = () => {
    if (!tripActive || !primary?.coordinates || primary.coordinates.length === 0) return;
    const coords = primary.coordinates;
    const nextIdx = Math.min(simStepIndexRef.current + 3, coords.length - 1);
    simStepIndexRef.current = nextIdx;
    const target = coords[nextIdx];

    handleIncomingGpsFix({
      latitude: target.latitude,
      longitude: target.longitude,
      accuracy: 5,
      timestamp: Date.now(),
    });
  };

  const finishTrip = async () => {
    if (!tripActiveRef.current) return;
    tripActiveRef.current = false;
    const end = Date.now();
    const elapsedSec = tripStartTime ? (end - tripStartTime) / 1000 : tripElapsed;

    const finishAccount = finishTripDistance(
      distanceAccountantRef.current,
      lastTrustedPairRef.current ? lastTrustedPairRef.current.prev : null,
      tripFilterRef.current
    );
    const distM = finishAccount.meters;
    tripDistanceRef.current = distM;

    if (locationSubRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(locationSubRef.current);
      locationSubRef.current = null;
    }

    const trip: any = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mode,
      actualDistanceM: distM,
      durationSec: elapsedSec,
    };

    const plannedPm25 = plannedPm25Ref.current;
    if (typeof plannedPm25 === 'number' && Number.isFinite(plannedPm25)) {
      trip.plannedPm25 = plannedPm25;
    }
    plannedPm25Ref.current = null;

    const updated = [trip, ...trips];
    setTrips(updated);
    await storage.setItem(TRIPS_KEY, JSON.stringify(updated));

    // Save trail for Replay
    if (trailRef.current.length >= 2) {
      try {
        const raw = await storage.getItem(TRAIL_KEY);
        const map = parseTrails(raw);
        map[String(trip.id)] = thinTrailPoints(
          trailRef.current.map((pt) => [pt.latitude, pt.longitude]),
          TRAIL_MAX_POINTS
        );
        await storage.setItem(TRAIL_KEY, JSON.stringify(map));
      } catch {}
    }

    setTripActive(false);
    setTripStartTime(null);
    setTripElapsed(0);
    setLowAccuracyActive(false);
    setDistancePaused(false);
    consecutiveLowAccuracyRef.current = 0;
    distanceAccountantRef.current = createTripDistanceAccountant();
    lastTrustedPairRef.current = null;
    setTripDetailsExpanded(false);
  };

  useEffect(() => {
    if (!tripActive || !tripStartTime) return;
    const id = setInterval(() => {
      setTripElapsed((Date.now() - tripStartTime) / 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [tripActive, tripStartTime]);

  const saveProfile = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    try {
      await storage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    } catch {}
  };

  const clearRecentDestinations = () => {
    setRecentDestinations([]);
    storage.removeItem(RECENT_DESTINATION_KEY).catch(() => {});
  };

  // Saved places
  const persistSavedPlaces = async (updated: SavedPlace[]) => {
    setSavedPlaces(updated);
    try {
      await storage.setItem(SAVED_PLACES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const openSavedPlaces = () => {
    setPendingPlace(null);
    setSavedAddError(null);
    setSavedCoordError(null);
    setView('saved');
  };

  const showPendingPlace = ({ name, category, latitude, longitude }: any) => {
    setSavedAddError(null);
    setSavedCoordError(null);
    setPendingPlace({
      name,
      category: PLACE_CATEGORIES.some((cat) => cat.id === category) ? category : 'other',
      latitude,
      longitude,
    });
  };

  const addPlaceFromSearch = async (queryText: string) => {
    const q = (queryText || '').trim();
    if (!q) {
      setSavedAddError('Type a place to search for.');
      return;
    }
    setPendingPlace(null);
    setSavedCoordError(null);
    setSavedAddError(null);
    setSavedAddStatus('searching');
    try {
      const res = await fetch(`${API_BASE_URL}/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || ERROR_MESSAGES.NETWORK);
      }
      showPendingPlace({
        name: data.displayName || q,
        category: 'other',
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch (err: any) {
      setSavedAddError(err?.message || ERROR_MESSAGES.NETWORK);
    } finally {
      setSavedAddStatus('idle');
    }
  };

  const addPlaceFromCurrentLocation = async () => {
    setPendingPlace(null);
    setSavedCoordError(null);
    setSavedAddError(null);
    setSavedAddStatus('locating');
    try {
      const origin = await acquireOrigin();
      showPendingPlace({
        name: 'Current Spot',
        category: 'other',
        latitude: origin.latitude,
        longitude: origin.longitude,
      });
    } catch {
      setSavedAddError('Could not determine current location.');
    } finally {
      setSavedAddStatus('idle');
    }
  };

  const addPlaceFromCoordinates = (latStr: string, lngStr: string) => {
    const lat = Number(latStr);
    const lng = Number(lngStr);
    const errors: any = {};
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.latitude = 'Latitude must be between -90 and 90';
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.longitude = 'Longitude must be between -180 and 180';
    }
    setSavedCoordError(errors);
    if (errors.latitude || errors.longitude) return;
    showPendingPlace({ name: '', category: 'other', latitude: lat, longitude: lng });
  };

  const submitPendingPlace = async ({ name, category }: any) => {
    if (!pendingPlace) return;
    try {
      const place = buildSavedPlace({
        name,
        category,
        latitude: pendingPlace.latitude,
        longitude: pendingPlace.longitude,
      });
      await persistSavedPlaces([place, ...savedPlaces].slice(0, SAVED_PLACES_MAX));
      setPendingPlace(null);
    } catch (err: any) {
      setSavedAddError(err?.message || 'Could not save that place.');
    }
  };

  const updateSavedPlace = async (id: string, fields: any) => {
    const existing = savedPlaces.find((pl) => pl.id === id);
    if (!existing) return { ok: false, field: 'id' };
    const name = (fields.name || existing.name).trim();
    if (!name || name.length > 60) return { ok: false, field: 'name' };
    const category = fields.category || existing.category;
    await persistSavedPlaces(
      savedPlaces.map((pl) => (pl.id === id ? { ...pl, name, category } : pl))
    );
    return { ok: true };
  };

  const confirmDeleteSavedPlace = (id: string) => {
    if (window.confirm('Delete this saved place?')) {
      persistSavedPlaces(savedPlaces.filter((pl) => pl.id !== id));
    }
  };

  // History & detail notes
  const openTripDetail = (id: string) => {
    const trip = trips.find((tr) => tr && tr.id === id);
    if (!trip) return;
    setDraftTripId(id);
    setDraftTitle(typeof trip.title === 'string' ? trip.title : '');
    setDraftDescription(typeof trip.description === 'string' ? trip.description : '');
    setDetailTripId(id);
  };

  const saveTripNotes = async (tripId: string) => {
    if (!tripId) return;
    const trip = trips.find((tr) => tr && tr.id === tripId);
    if (!trip) return;
    const title = draftTitle.trim() || null;
    const description = draftDescription.trim() || null;
    if (trip.title === title && trip.description === description) return;
    const updatedTrip = { ...trip, title, description };
    const nextTrips = trips.map((tr) => (tr.id === tripId ? updatedTrip : tr));
    setTrips(nextTrips);
    await storage.setItem(TRIPS_KEY, JSON.stringify(nextTrips));
  };

  const closeDetail = () => {
    if (draftTripId) {
      saveTripNotes(draftTripId);
    }
    setDraftTripId(null);
    setDetailTripId(null);
  };

  const confirmDeleteTrip = async (id: string) => {
    if (window.confirm('Delete this trip permanently?')) {
      const nextTrips = trips.filter((tr) => tr && tr.id !== id);
      setTrips(nextTrips);
      await storage.setItem(TRIPS_KEY, JSON.stringify(nextTrips));
      if (detailTripId === id) {
        setDraftTripId(null);
        setDetailTripId(null);
      }
    }
  };

  const openReplay = (id: string) => {
    setReplayTripId(id);
    setView('replay');
  };

  // Router views
  if (view === 'savedPick') {
    return (
      <MapPickerScreen
        t={t}
        isDark={isDark}
        initialRegion={location}
        onPick={(coords: any) => {
          setView('saved');
          showPendingPlace({ name: '', category: 'other', latitude: coords.latitude, longitude: coords.longitude });
        }}
        onClose={() => setView('saved')}
      />
    );
  }

  if (view === 'saved') {
    return (
      <SavedPlacesScreen
        t={t}
        isDark={isDark}
        savedPlaces={savedPlaces}
        pendingPlace={pendingPlace}
        savedAddStatus={savedAddStatus}
        savedAddError={savedAddError}
        savedCoordError={savedCoordError}
        addPlaceFromSearch={addPlaceFromSearch}
        addPlaceFromCurrentLocation={addPlaceFromCurrentLocation}
        addPlaceFromCoordinates={addPlaceFromCoordinates}
        openMapPicker={() => setView('savedPick')}
        submitPendingPlace={submitPendingPlace}
        cancelPendingPlace={() => setPendingPlace(null)}
        updateSavedPlace={updateSavedPlace}
        confirmDeleteSavedPlace={confirmDeleteSavedPlace}
        routeToSavedPlace={routeToSavedPlace}
        setView={setView}
      />
    );
  }

  if (view === 'profile') {
    return (
      <ProfileScreen
        t={t}
        isDark={isDark}
        trips={trips}
        profile={profile}
        prefs={prefs}
        distUnit={distUnit}
        saveProfile={saveProfile}
        removeProfilePhoto={() => saveProfile({ ...profile, photo: null })}
        openHistory={() => {
          setDetailTripId(null);
          setView('history');
        }}
        setView={setView}
      />
    );
  }

  if (view === 'settings') {
    return (
      <SettingsScreen
        t={t}
        isDark={isDark}
        profile={profile}
        trips={trips}
        savedPlaces={savedPlaces}
        themeMode={themeMode}
        accentName={accentName}
        prefs={prefs}
        applyTheme={applyTheme}
        applyAccent={applyAccent}
        applyPreferredMode={applyPreferredMode}
        applyRememberRouteGoal={applyRememberRouteGoal}
        applyDashboardToggle={applyDashboardToggle}
        setDistanceUnit={setDistanceUnit}
        confirmEraseAll={doEraseAll}
        openSavedPlaces={openSavedPlaces}
        setView={setView}
      />
    );
  }

  if (view === 'history') {
    return (
      <HistoryScreen
        t={t}
        isDark={isDark}
        trips={trips}
        tripsLoaded={tripsLoaded}
        detailTripId={detailTripId}
        draftTripId={draftTripId}
        draftTitle={draftTitle}
        setDraftTitle={setDraftTitle}
        draftDescription={draftDescription}
        setDraftDescription={setDraftDescription}
        distUnit={distUnit}
        openTripDetail={openTripDetail}
        closeDetail={closeDetail}
        confirmDeleteTrip={confirmDeleteTrip}
        saveTripNotes={saveTripNotes}
        openReplay={openReplay}
        setView={setView}
      />
    );
  }

  if (view === 'replay') {
    const replayTrip = replayTripId ? trips.find((tr) => tr && tr.id === replayTripId) : null;
    return (
      <ReplayScreen
        t={t}
        isDark={isDark}
        trip={replayTrip}
        distUnit={distUnit}
        onBack={() => {
          setReplayTripId(null);
          setView('history');
        }}
      />
    );
  }

  return (
    <MapScreen
      t={t}
      isDark={isDark}
      primary={primary}
      location={location}
      currentCoords={currentCoords}
      currentAccuracy={currentAccuracy}
      locationError={locationError}
      locationBannerDismissed={locationBannerDismissed}
      setLocationBannerDismissed={setLocationBannerDismissed}
      userPos={userPos}
      followUser={followUser}
      setFollowUser={setFollowUser}
      destinationCoord={destinationCoord}
      destination={destination}
      setDestination={setDestination}
      routeStatus={routeStatus}
      routeError={routeError}
      recentDestinations={recentDestinations}
      clearRecentDestinations={clearRecentDestinations}
      savedPlaces={savedPlaces}
      routeToSavedPlace={routeToSavedPlace}
      candidates={candidates}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
      preference={preference}
      applyPreference={applyPreference}
      mode={mode}
      setMode={setMode}
      panelExpanded={panelExpanded}
      setPanelExpanded={setPanelExpanded}
      profile={profile}
      tripActive={tripActive}
      tripElapsed={tripElapsed}
      tripDistance={tripDistance}
      lowAccuracyActive={lowAccuracyActive}
      distancePaused={distancePaused}
      tripDetailsExpanded={tripDetailsExpanded}
      setTripDetailsExpanded={setTripDetailsExpanded}
      distUnit={distUnit}
      findRoute={findRoute}
      retryRoute={retryRoute}
      startTrip={startTrip}
      finishTrip={finishTrip}
      setView={setView}
      onSimulateStep={simulateStep}
    />
  );
}
