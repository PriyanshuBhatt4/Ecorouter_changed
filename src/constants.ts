// Module-scope constants shared across the app shell and screens.

import { PREFERENCES } from './lib/preferences';
import { distanceBetweenFixes } from './lib/track';

// Appearance choices
export const THEME_CHOICES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export const ATTRIBUTION_TEXT =
  'Data: OpenStreetMap (Nominatim, Valhalla public server) · Air: Open-Meteo CAMS (regional model, not street-level) · Prototype, no SLA · Durations are estimates, not live traffic';

// In browser, relative URL "" targets the same host
export const API_BASE_URL = typeof window !== 'undefined'
  ? ((import.meta as any).env?.VITE_API_BASE_URL || '')
  : '';

export const ERROR_MESSAGES: Record<string, string> = {
  NO_GEOCODING_RESULT: 'No location found for that destination. Try a more specific name.',
  NO_ROUTE_FOUND: 'No route found between your location and that destination.',
  UPSTREAM_TIMEOUT: 'The mapping service timed out. Please try again.',
  UPSTREAM_ERROR: 'The mapping service is currently unavailable. Please try again later.',
  INVALID_REQUEST: 'Invalid request. Check your destination and try again.',
  NETWORK: 'Could not reach the backend. Check your internet connection and try again.',
};

export const MODES = {
  WALKING: 'walking',
  CYCLING: 'cycling',
} as const;

export type TravelMode = typeof MODES[keyof typeof MODES];

export const PROFILE_KEY = '@EcoRoute/profile';
export const TRIPS_KEY = '@EcoRoute/trips';
export const ACTIVE_TRIP_KEY = '@EcoRoute/activeTrip';
export const THEME_KEY = '@EcoRoute/theme';
export const ACCENT_KEY = '@EcoRoute/accent';
export const RECENT_DESTINATION_KEY = '@EcoRoute/recentDestinations';
export const RECENT_DESTINATIONS_MAX = 5;

export const SAVED_PLACES_KEY = '@EcoRoute/savedPlaces';
export const SAVED_PLACES_MAX = 12;

export const PLACE_CATEGORIES = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'other', label: 'Other' },
] as const;

export const PREFS_KEY = '@EcoRoute/prefs';

export interface DashboardPrefs {
  week: boolean;
  achievements: boolean;
  streak: boolean;
  recent: boolean;
  [key: string]: boolean;
}

export interface UserPrefs {
  preferredMode: 'walking' | 'cycling';
  dashboard: DashboardPrefs;
  rememberRouteGoal: boolean;
  lastRouteGoal: string | null;
}

export const DEFAULT_PREFS: UserPrefs = {
  preferredMode: 'walking',
  dashboard: { week: true, achievements: true, streak: true, recent: true },
  rememberRouteGoal: false,
  lastRouteGoal: null,
};

export const PREF_DASHBOARD_KEYS = ['week', 'achievements', 'streak', 'recent'] as const;

export function isValidRouteGoal(value: any): boolean {
  return typeof value === 'string' && Object.values(PREFERENCES).includes(value as any);
}

export function parsePrefs(raw: string | null): UserPrefs {
  const dashboard: DashboardPrefs = {
    week: true,
    achievements: true,
    streak: true,
    recent: true,
  };
  const result: UserPrefs = {
    preferredMode: 'walking',
    dashboard,
    rememberRouteGoal: false,
    lastRouteGoal: null,
  };
  if (raw == null || raw === '') return prefsClone(result);
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return prefsClone(result);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return prefsClone(result);
  }
  if (parsed.preferredMode === 'walking' || parsed.preferredMode === 'cycling') {
    result.preferredMode = parsed.preferredMode;
  }
  result.rememberRouteGoal = parsed.rememberRouteGoal === true;
  result.lastRouteGoal = isValidRouteGoal(parsed.lastRouteGoal) ? parsed.lastRouteGoal : null;
  const dash = parsed.dashboard;
  if (dash && typeof dash === 'object' && !Array.isArray(dash)) {
    for (const key of PREF_DASHBOARD_KEYS) {
      dashboard[key] = dash[key] !== false;
    }
  }
  return prefsClone(result);
}

function prefsClone(source: UserPrefs): UserPrefs {
  return {
    preferredMode: source.preferredMode,
    dashboard: { ...source.dashboard },
    rememberRouteGoal: source.rememberRouteGoal,
    lastRouteGoal: source.lastRouteGoal,
  };
}

export function isValidLatLng(latitude: any, longitude: any): boolean {
  return (
    typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
  );
}

export function normalizePlaceCategory(category: any): string {
  return PLACE_CATEGORIES.some((cat) => cat.id === category) ? category : 'other';
}

export interface SavedPlace {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
}

export function parseSavedPlaces(raw: string | null): SavedPlace[] {
  if (raw == null || raw === '') return [];
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const list: SavedPlace[] = [];
  const seenPlaceIds = new Set<string>();
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) continue;
    if (!isValidLatLng(item.latitude, item.longitude)) continue;
    let id = typeof item.id === 'string' && item.id ? item.id : '';
    if (!id || seenPlaceIds.has(id)) id = `${Date.now().toString(36)}-${list.length}`;
    seenPlaceIds.add(id);
    list.push({
      id,
      name,
      category: normalizePlaceCategory(item.category),
      latitude: item.latitude,
      longitude: item.longitude,
    });
    if (list.length >= SAVED_PLACES_MAX) break;
  }
  return list;
}

export function buildSavedPlace({
  name,
  category,
  latitude,
  longitude,
}: {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
}): SavedPlace {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    throw Object.assign(new Error('Give the place a name before saving.'), {
      code: 'INVALID_PLACE',
      field: 'name',
    });
  }
  if (trimmedName.length > 60) {
    throw Object.assign(new Error('Keep the place name to 60 characters or fewer.'), {
      code: 'INVALID_PLACE',
      field: 'name',
    });
  }
  if (!isValidLatLng(latitude, longitude)) {
    throw Object.assign(
      new Error('Coordinates must be finite numbers inside ±90 latitude / ±180 longitude.'),
      {
        code: 'INVALID_PLACE',
        field: !(typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90)
          ? 'latitude'
          : 'longitude',
      }
    );
  }
  return {
    id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
    name: trimmedName,
    category: normalizePlaceCategory(category),
    latitude,
    longitude,
  };
}

function recentNameKey(text: any): string {
  return typeof text === 'string' ? text.trim().toLowerCase() : '';
}

export function parseRecentDestinations(raw: string | null): { list: string[]; ok: boolean } {
  if (raw == null || raw === '') return { list: [], ok: true };
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { list: [], ok: false };
  }
  if (!Array.isArray(parsed)) return { list: [], ok: false };
  const list: string[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = recentNameKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(trimmed);
    if (list.length >= RECENT_DESTINATIONS_MAX) break;
  }
  return { list, ok: true };
}

export function pushRecentDestination(list: string[], entry: string): { list: string[]; changed: boolean } {
  const name = typeof entry === 'string' ? entry.trim() : '';
  if (!name) return { list, changed: false };
  const current = Array.isArray(list) ? list.slice() : [];
  const lower = recentNameKey(name);
  const without = current.filter((item) => recentNameKey(item) !== lower);
  const next = [name, ...without].slice(0, RECENT_DESTINATIONS_MAX);
  const changed =
    next.length !== current.length || next.some((item, i) => item !== current[i]);
  return { list: next, changed };
}

export const TRAIL_KEY = '@EcoRoute/tripTrails';
export const TRAIL_MAX_POINTS = 600;
export const TRAIL_MIN_STEP_M = 10;

function isValidTrailPair(pair: any): boolean {
  return (
    Array.isArray(pair) &&
    pair.length === 2 &&
    typeof pair[0] === 'number' && Number.isFinite(pair[0]) && pair[0] >= -90 && pair[0] <= 90 &&
    typeof pair[1] === 'number' && Number.isFinite(pair[1]) && pair[1] >= -180 && pair[1] <= 180
  );
}

export function thinTrailPoints(points: any[], maxPoints = TRAIL_MAX_POINTS): [number, number][] {
  const clean = Array.isArray(points) ? points.filter(isValidTrailPair) : [];
  if (clean.length <= maxPoints) return clean;
  if (maxPoints < 2) return [clean[0], clean[clean.length - 1]].filter(Boolean);
  const kept = new Set<number>();
  for (let k = 0; k < maxPoints; k += 1) {
    const index = Math.round((k * (clean.length - 1)) / (maxPoints - 1));
    kept.add(Math.min(clean.length - 1, Math.max(0, index)));
  }
  kept.add(0);
  kept.add(clean.length - 1);
  return clean.filter((_, i) => kept.has(i));
}

export function parseTrails(raw: string | null): Record<string, [number, number][]> {
  if (raw == null || raw === '') return {};
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const map: Record<string, [number, number][]> = {};
  for (const tripId of Object.keys(parsed)) {
    const points = thinTrailPoints(parsed[tripId], TRAIL_MAX_POINTS);
    if (points.length === 0) continue;
    map[String(tripId)] = points;
  }
  return map;
}

export function trailToCoords(points: any[]): { latitude: number; longitude: number }[] {
  if (!Array.isArray(points)) return [];
  const coords: { latitude: number; longitude: number }[] = [];
  for (const pair of points) {
    if (!isValidTrailPair(pair)) continue;
    coords.push({ latitude: pair[0], longitude: pair[1] });
  }
  return coords;
}

export function shouldRetainSample(last: any, cur: any, minStepM = TRAIL_MIN_STEP_M): boolean {
  const readable =
    !!cur &&
    typeof cur.latitude === 'number' && Number.isFinite(cur.latitude) &&
    typeof cur.longitude === 'number' && Number.isFinite(cur.longitude);
  if (!readable) return false;
  if (!last) return true;
  return distanceBetweenFixes(last, cur) >= minStepM;
}

export function progressToIndex(progress: number, count: number): number {
  if (!Number.isFinite(progress) || count !== Math.floor(count) || count <= 0) {
    return 0;
  }
  if (count === 1) return 0;
  const clamped = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  return Math.floor(clamped * (count - 1));
}

export function pointAtProgress(
  points: { latitude: number; longitude: number }[],
  progress: number
): { latitude: number; longitude: number } | null {
  const count = Array.isArray(points) ? points.length : 0;
  if (count === 0) return null;
  if (count === 1) return { ...points[0] };
  const idx = progressToIndex(progress, count);
  const a = points[idx];
  const b = points[idx < count - 1 ? idx + 1 : idx];
  if (b === a) return { ...a };
  const startSpan = idx / (count - 1);
  const endSpan = (idx + 1) / (count - 1);
  const frac =
    progress <= startSpan ? 0 : progress >= endSpan ? 1 : (progress - startSpan) / (endSpan - startSpan);
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * frac,
    longitude: a.longitude + (b.longitude - a.longitude) * frac,
  };
}

export interface UserProfile {
  name: string;
  weightKg: string | number;
  photo?: string | null;
  distanceUnit?: 'metric' | 'imperial';
}

export const DEFAULT_PROFILE: UserProfile = { name: '', weightKg: '' };

export const DEFAULT_REGION = {
  latitude: 28.5494,
  longitude: 77.2001,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
