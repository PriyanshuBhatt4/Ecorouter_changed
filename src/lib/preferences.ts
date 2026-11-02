// Pure route-preference selection logic

export const PREFERENCES = {
  MANUAL: 'manual',
  FASTEST: 'fastest',
  SHORTEST: 'shortest',
  CLEANEST: 'cleanest',
  OPTIMAL: 'optimal',
} as const;

function pickMinWithTiebreak(candidates: any[], primaryKey: string, tiebreakKey: string) {
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const b = best;
    const cKey = c[primaryKey] ?? Infinity;
    const bKey = b[primaryKey] ?? Infinity;
    if (cKey < bKey - 1e-9) {
      best = c;
    } else if (Math.abs(cKey - bKey) < 1e-9) {
      if ((c[tiebreakKey] ?? Infinity) < (b[tiebreakKey] ?? Infinity)) {
        best = c;
      }
    }
  }
  return best;
}

export function pickFastest(candidates: any[]) {
  return pickMinWithTiebreak(candidates, 'durationSeconds', 'distanceMeters');
}

export function pickShortest(candidates: any[]) {
  return pickMinWithTiebreak(candidates, 'distanceMeters', 'durationSeconds');
}

export function pickCleanest(candidates: any[]) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const firstExp = candidates[0].pm25_estimate;
  if (!firstExp || firstExp.can_compare_cleanest !== true) return null;
  if (!firstExp.available || firstExp.value === undefined || firstExp.value === null) {
    return null;
  }
  let best = candidates[0];
  let bestVal = firstExp.value;
  for (let i = 1; i < candidates.length; i++) {
    const exp = candidates[i].pm25_estimate;
    if (!exp || !exp.available || exp.value === undefined || exp.value === null) {
      return null;
    }
    const v = exp.value;
    if (v < bestVal) {
      best = candidates[i];
      bestVal = v;
    }
  }
  return best;
}

export function pickOptimal(candidates: any[]) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  let allPmAvailable = true;
  for (let i = 0; i < candidates.length; i++) {
    const exp = candidates[i].pm25_estimate;
    if (!exp || !exp.available || exp.value === undefined || exp.value === null) {
      allPmAvailable = false;
      break;
    }
  }
  if (!allPmAvailable) return null;
  const pmValues = candidates.map((c) => c.pm25_estimate.value);
  const pmEqual = new Set(pmValues.map((v) => Math.round(v * 10) / 10)).size === 1;
  const distVals = candidates.map((c) => c.distanceMeters ?? 0);
  const durVals = candidates.map((c) => c.durationSeconds ?? 0);
  const dMin = Math.min(...distVals);
  const dMax = Math.max(...distVals);
  const tMin = Math.min(...durVals);
  const tMax = Math.max(...durVals);
  const pMin = Math.min(...pmValues);
  const pMax = Math.max(...pmValues);
  const norm = (v: number, minv: number, maxv: number) => {
    if (maxv === minv) return 0.5;
    return (v - minv) / (maxv - minv);
  };
  let best = candidates[0];
  let bestScore = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const nd = norm(c.distanceMeters ?? 0, dMin, dMax);
    const nt = norm(c.durationSeconds ?? 0, tMin, tMax);
    const np = pmEqual ? 0.5 : norm(c.pm25_estimate.value, pMin, pMax);
    const score = (nd + nt + np) / 3.0;
    if (score < bestScore - 1e-9) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export function preferenceNote(preference: string, candidates: any[]) {
  if (typeof preference !== 'string' || !Object.values(PREFERENCES).includes(preference as any)) {
    return null;
  }
  const list = Array.isArray(candidates) ? candidates : [];
  if (list.length === 0 || preference === PREFERENCES.MANUAL) {
    return { show: false, text: '' };
  }
  if (list.length === 1) {
    return {
      show: true,
      text: 'Only one route returned by the routing service — comparison is limited.',
    };
  }
  switch (preference) {
    case PREFERENCES.FASTEST:
      return { show: true, text: 'Picks the route with the lowest travel time.' };
    case PREFERENCES.SHORTEST:
      return { show: true, text: 'Picks the route with the lowest distance.' };
    case PREFERENCES.CLEANEST: {
      if (pickCleanest(list) != null) {
        return { show: true, text: 'Picks the route with the lowest modelled PM2.5 (µg/m³).' };
      }
      const first = list[0]?.pm25_estimate;
      if (first?.indistinguishable_across_routes === true) {
        return {
          show: true,
          text: 'Exposure estimates are too similar to rank these routes reliably.',
        };
      }
      return {
        show: true,
        text: 'Cleanest needs comparable exposure estimates for all routes.',
      };
    }
    case PREFERENCES.OPTIMAL: {
      if (pickOptimal(list) != null) {
        return {
          show: true,
          text: 'Balances travel time, distance and exposure equally (1/3 each, normalised).',
        };
      }
      return {
        show: true,
        text: 'Optimal needs an exposure estimate for every route.',
      };
    }
    default:
      return { show: false, text: '' };
  }
}

export function selectByPreference(candidates: any[], preference: string) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (preference === PREFERENCES.MANUAL) return null;
  if (candidates.length === 1) return candidates[0];
  switch (preference) {
    case PREFERENCES.FASTEST:
      return pickFastest(candidates);
    case PREFERENCES.SHORTEST:
      return pickShortest(candidates);
    case PREFERENCES.CLEANEST:
      return pickCleanest(candidates);
    case PREFERENCES.OPTIMAL:
      return pickOptimal(candidates);
    default:
      return null;
  }
}
