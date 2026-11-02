// Pure formatting helpers

export function formatDistance(meters: number | null | undefined, unit: 'metric' | 'imperial' = 'metric'): string | null {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return null;
  if (unit === 'imperial') {
    const miles = meters / 1609.344;
    if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
    return `${miles.toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return null;
  const totalSeconds = Math.max(0, Math.round(seconds));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

export function formatDurationLong(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatPmUnits(units: string | null | undefined): string {
  if (typeof units !== 'string') return '';
  if (units === 'ug/m3') return 'µg/m³';
  return '';
}

export function formatLatLng(latitude: number | null | undefined, longitude: number | null | undefined): string | null {
  if (
    typeof latitude !== 'number' || !Number.isFinite(latitude) ||
    typeof longitude !== 'number' || !Number.isFinite(longitude)
  ) {
    return null;
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export const TRIP_DATE_FALLBACK = 'Date not available';

export function formatTripDate(value: any): string {
  if (typeof value !== 'string' && typeof value !== 'number') return TRIP_DATE_FALLBACK;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return TRIP_DATE_FALLBACK;
  return parsed.toLocaleString();
}
