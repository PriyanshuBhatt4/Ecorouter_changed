// Pure GPS trip-filtering helpers

export const TRIP_FILTER = {
  MIN_STEP_M: 1.5,
  MAX_TRUSTED_ACCURACY_M: 30,
  LOW_ACCURACY_NOTICE_M: 15,
  JITTER_ACCURACY_FACTOR: 1.0,
  MAX_SPEED_MPS: 25,
  MAX_STEP_NO_TIMESTAMP_M: 50,
  DISTANCE_COMMIT_MIN_M: 50,
  DISTANCE_NET_RATIO_MIN: 0.5,
};

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const aHav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aHav), Math.sqrt(1 - aHav));
  return R * c;
}

export function distanceBetweenFixes(a: any, b: any): number {
  if (!readablePoint(a) || !readablePoint(b)) return 0;
  return haversineMeters(a, b);
}

function readablePoint(p: any): boolean {
  return (
    !!p &&
    typeof p.latitude === 'number' &&
    Number.isFinite(p.latitude) &&
    typeof p.longitude === 'number' &&
    Number.isFinite(p.longitude)
  );
}

export function tripStep(prev: any, cur: any) {
  if (!readablePoint(cur)) {
    return { meters: 0, quality: 'low_accuracy', lowAccuracy: true };
  }

  const lowAccuracy =
    cur.accuracy == null || cur.accuracy > TRIP_FILTER.LOW_ACCURACY_NOTICE_M;

  if (!readablePoint(prev)) {
    return { meters: 0, quality: 'ok', lowAccuracy };
  }

  const dist = haversineMeters(prev, cur);

  if (cur.accuracy == null || cur.accuracy > TRIP_FILTER.MAX_TRUSTED_ACCURACY_M) {
    return { meters: 0, quality: 'low_accuracy', lowAccuracy };
  }

  if (dist < TRIP_FILTER.MIN_STEP_M) {
    return { meters: 0, quality: 'jitter', lowAccuracy };
  }

  const prevRadius =
    prev.accuracy == null || !Number.isFinite(prev.accuracy)
      ? TRIP_FILTER.MAX_TRUSTED_ACCURACY_M
      : prev.accuracy;
  const curRadius = cur.accuracy;
  const worseRadius = Math.max(prevRadius, curRadius);
  if (dist <= TRIP_FILTER.JITTER_ACCURACY_FACTOR * worseRadius) {
    return { meters: 0, quality: 'jitter', lowAccuracy };
  }

  const dt = (cur.timestamp - prev.timestamp) / 1000;
  if (Number.isFinite(dt) && dt > 0) {
    if (dist / dt > TRIP_FILTER.MAX_SPEED_MPS) {
      return { meters: 0, quality: 'jump', lowAccuracy };
    }
  } else if (dist > TRIP_FILTER.MAX_STEP_NO_TIMESTAMP_M) {
    return { meters: 0, quality: 'jump', lowAccuracy };
  }

  return { meters: dist, quality: 'ok', lowAccuracy };
}

export function createTripDistanceAccountant() {
  return { decidedMeters: 0, driftDiscardedMeters: 0, queue: [] as any[], anchor: null as any };
}

function normalizeAccountant(state: any) {
  const s = state && typeof state === 'object' ? state : {};
  const num = (v: any) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
  const queue = Array.isArray(s.queue)
    ? s.queue.filter((e: any) => e && readablePoint(e && e.point) && num(e.meters) > 0)
    : [];
  return {
    decidedMeters: num(s.decidedMeters),
    driftDiscardedMeters: num(s.driftDiscardedMeters),
    queue,
    anchor: readablePoint(s.anchor) ? s.anchor : null,
  };
}

export function distanceStep(state: any, step: any, prevFix: any, curFix: any) {
  const s = normalizeAccountant(state);
  if (
    !step ||
    step.quality !== 'ok' ||
    typeof step.meters !== 'number' ||
    !Number.isFinite(step.meters) ||
    step.meters <= 0 ||
    !readablePoint(curFix)
  ) {
    return { state: s, added: 0 };
  }

  const anchor =
    s.anchor ||
    (readablePoint(prevFix)
      ? { latitude: prevFix.latitude, longitude: prevFix.longitude }
      : null);
  const entries = s.queue.concat([
    { meters: step.meters, point: { latitude: curFix.latitude, longitude: curFix.longitude } },
  ]);
  let path = 0;
  for (const e of entries) path += e.meters;

  if (path < TRIP_FILTER.DISTANCE_COMMIT_MIN_M) {
    s.queue = entries;
    s.anchor = anchor;
    return { state: s, added: 0 };
  }

  const lastCur = entries[entries.length - 1].point;
  const net = readablePoint(anchor) ? haversineMeters(anchor, lastCur) : 0;
  let added = 0;
  if (net >= TRIP_FILTER.DISTANCE_NET_RATIO_MIN * path) {
    s.decidedMeters += path;
    added = path;
  } else {
    s.driftDiscardedMeters += path;
  }
  s.queue = [];
  s.anchor = lastCur;
  return { state: s, added };
}

export function finishTripDistance(state: any, lastPrevFix: any, lastCurFix: any) {
  const s = normalizeAccountant(state);
  if (s.queue.length === 0) {
    return { meters: s.decidedMeters, drifted: s.driftDiscardedMeters };
  }
  let path = 0;
  for (const e of s.queue) path += e.meters;
  const anchor = readablePoint(s.anchor)
    ? s.anchor
    : readablePoint(lastPrevFix)
      ? lastPrevFix
      : s.queue[0] && readablePoint(s.queue[0].point)
        ? s.queue[0].point
        : null;
  const end = readablePoint(lastCurFix)
    ? lastCurFix
    : s.queue[s.queue.length - 1].point;
  const net = readablePoint(anchor) && readablePoint(end) ? haversineMeters(anchor, end) : 0;
  if (net >= TRIP_FILTER.DISTANCE_NET_RATIO_MIN * path) {
    s.decidedMeters += path;
  } else {
    s.driftDiscardedMeters += path;
  }
  return { meters: s.decidedMeters, drifted: s.driftDiscardedMeters };
}
