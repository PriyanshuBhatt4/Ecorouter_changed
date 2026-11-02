// Pure lifetime-stat computation

const MET_BY_MODE: Record<string, number> = { walking: 3.5, cycling: 7.0 };

function finiteNumber(value: any): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseWeightKg(raw: any): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function accumulateKcal(trip: any, weightKg: number): number {
  const met = MET_BY_MODE[trip?.mode] != null ? MET_BY_MODE[trip.mode] : MET_BY_MODE.walking;
  const hours = finiteNumber(trip?.durationSec) / 3600;
  return met * weightKg * hours;
}

function tripAirValue(trip: any): number | null {
  for (const key of ['pm25', 'pm25Estimate', 'exposureUgM3', 'plannedPm25']) {
    const v = trip[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

export function lifetimeStats(trips: any[], profile: any) {
  const list = Array.isArray(trips) ? trips : [];
  const tripCount = list.length;

  const distanceM = list.reduce((s, t) => s + finiteNumber(t && t.actualDistanceM), 0);
  const timeSec = list.reduce((s, t) => s + finiteNumber(t && t.durationSec), 0);

  const weightKg = parseWeightKg(profile && profile.weightKg);
  let kcal: number | null = null;
  if (weightKg !== null && weightKg > 0) {
    kcal = list.reduce((s, t) => s + (t ? accumulateKcal(t, weightKg) : 0), 0);
  }

  const airValues: number[] = [];
  for (const trip of list) {
    if (!trip) continue;
    const v = tripAirValue(trip);
    if (v !== null) airValues.push(v);
  }
  const exposureUgM3 =
    airValues.length > 0
      ? airValues.reduce((a, b) => a + b, 0) / airValues.length
      : null;

  return { distanceM, timeSec, tripCount, kcal, exposureUgM3 };
}

function pad2(n: number): string {
  return n >= 10 ? String(n) : `0${n}`;
}

export function dayKey(ts: any): string | null {
  const date = ts instanceof Date ? ts : new Date(ts);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function shiftDayKey(key: string, deltaDays: number): string | null {
  const parts = key.split('-');
  return dayKey(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + deltaDays));
}

function levelForCount(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

export function streakCalendar(trips: any[], now: any = new Date()) {
  const src = Array.isArray(trips) ? trips : [];
  const counts = new Map<string, number>();
  let firstTripDate: string | null = null;

  for (const t of src) {
    if (!t || !t.date) continue;
    const parsed = new Date(t.date);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = dayKey(parsed);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (firstTripDate === null || key < firstTripDate) firstTripDate = key;
  }

  const nowDate = now instanceof Date ? now : new Date(now);
  const todayKey = dayKey(nowDate);
  if (todayKey === null) {
    return { cells: [], currentStreak: 0, longestStreak: 0, firstTripDate };
  }

  const cells = new Array(365);
  let cursor: string | null = todayKey;
  for (let i = 364; i >= 0; i--) {
    const count = cursor ? counts.get(cursor) || 0 : 0;
    const inHistory = firstTripDate !== null && cursor !== null && cursor >= firstTripDate;
    cells[i] = {
      key: cursor,
      count,
      level: inHistory ? levelForCount(count) : 0,
      inHistory,
    };
    if (cursor) cursor = shiftDayKey(cursor, -1);
  }

  let streakIdx = 364;
  if (cells[364].count === 0 && cells[363]) streakIdx = 363;
  let currentStreak = 0;
  for (let i = streakIdx; i >= 0 && cells[i]?.count > 0; i--) currentStreak++;

  const keys = Array.from(counts.keys()).sort();
  let longestStreak = 0;
  let run = 0;
  let prevMs: number | null = null;
  for (const key of keys) {
    const parts = key.split('-');
    const ms = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const step = prevMs === null ? Infinity : Math.round((ms - prevMs) / 86400000);
    run = step === 1 ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    prevMs = ms;
  }

  return { cells, currentStreak, longestStreak, firstTripDate };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function streakCalendarHeatmap(trips: any[], now: any = new Date()) {
  const ring = streakCalendar(trips, now);
  if (ring.cells.length === 0) return { months: [] };

  const weekdayOfKey = (key: string) => {
    const p = key.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay();
  };

  const firstDow = weekdayOfKey(ring.cells[0].key);
  const lastDow = weekdayOfKey(ring.cells[ring.cells.length - 1].key);

  const slots = new Array(firstDow).fill(null).concat(ring.cells);
  for (let pad = lastDow + 1; pad <= 6; pad++) slots.push(null);

  const weeks: any[][] = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));

  const monthIndexOfWeek = (week: any[]) => {
    const middle = week[3] || week.find((c) => c !== null);
    return Number(middle.key.split('-')[1]) - 1;
  };

  const months: any[] = [];
  for (const week of weeks) {
    const label = MONTH_LABELS[monthIndexOfWeek(week)];
    const last = months[months.length - 1];
    if (last && last.label === label) {
      last.weeks.push(week);
    } else {
      months.push({ label, startKey: week.find((c) => c !== null).key, weeks: [week] });
    }
  }

  return { months };
}

export function computeBadges(trips: any[], now: any = new Date()) {
  const list = Array.isArray(trips) ? trips : [];
  const tripCount = list.length;
  const distanceM = list.reduce((s, t) => s + finiteNumber(t && t.actualDistanceM), 0);
  const timeSec = list.reduce((s, t) => s + finiteNumber(t && t.durationSec), 0);
  const ring = streakCalendar(list, now);

  const defs = [
    { id: 'first-trip', label: 'First trip', description: 'Your first completed trip', target: 1, current: tripCount },
    { id: 'five-trips', label: 'Getting around', description: '5 trips', target: 5, current: tripCount },
    { id: 'streak-3', label: 'Habit streak', description: '3 days in a row', target: 3, current: ring.currentStreak },
    { id: 'streak-7', label: 'Week warrior', description: '7 days in a row', target: 7, current: ring.longestStreak },
    { id: 'dist-25', label: '25 km club', description: '25 km total distance, any mode', target: 25000, current: distanceM },
    { id: 'dist-100', label: 'Century club', description: '100 km by foot or bike', target: 100000, current: distanceM },
    { id: 'time-6', label: 'Six hours moving', description: '6 hours of tracked movement', target: 21600, current: timeSec },
  ];

  return defs.map((b) => ({ ...b, earned: b.current >= b.target }));
}

export function weekSummary(trips: any[], now: any = new Date()) {
  const src = Array.isArray(trips) ? trips : [];
  const nowDate = now instanceof Date ? now : new Date(now);
  const todayKey = dayKey(nowDate);
  if (todayKey === null) return { tripCount: 0, distanceM: 0 };

  const windowKeys = new Set<string>();
  let cursor: string | null = todayKey;
  for (let i = 0; i < 7; i++) {
    if (cursor) {
      windowKeys.add(cursor);
      cursor = shiftDayKey(cursor, -1);
    }
  }

  let tripCount = 0;
  let distanceM = 0;
  for (const t of src) {
    if (!t || !t.date) continue;
    const parsed = new Date(t.date);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = dayKey(parsed);
    if (key === null || !windowKeys.has(key)) continue;
    tripCount++;
    distanceM += finiteNumber(t.actualDistanceM);
  }

  return { tripCount, distanceM };
}

export function paceLabel(trip: any, unit: 'metric' | 'imperial' = 'metric'): string | null {
  if (!trip || typeof trip !== 'object') return null;
  const mode = trip.mode;
  if (mode !== 'walking' && mode !== 'cycling') return null;

  const distanceM = trip.actualDistanceM;
  const durationSec = trip.durationSec;
  if (
    typeof distanceM !== 'number' || !Number.isFinite(distanceM) || distanceM <= 0 ||
    typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec <= 0
  ) return null;

  if (mode === 'cycling') {
    const hours = durationSec / 3600;
    return unit === 'imperial'
      ? `${((distanceM / 1609.344) / hours).toFixed(1)} mph`
      : `${((distanceM / 1000) / hours).toFixed(1)} km/h`;
  }
  const minutes = durationSec / 60;
  return unit === 'imperial'
    ? `${Math.round(minutes / (distanceM / 1609.344))} min/mi`
    : `${Math.round(minutes / (distanceM / 1000))} min/km`;
}

export { MET_BY_MODE };
