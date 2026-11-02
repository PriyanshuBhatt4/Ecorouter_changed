import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Public prototype endpoints
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const VALHALLA_ROUTE_URL = 'https://valhalla1.openstreetmap.de/route';
const AQ_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const USER_AGENT = 'EcoRouteApp/1.0 (student prototype; mailto:ecoroute@example.com)';

const VERIFIED_COSTING: Record<string, string> = {
  walking: 'pedestrian',
  driving: 'auto',
  cycling: 'bicycle',
};

// Haversine distance in meters
function haversineM(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000.0;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Decode Valhalla polyline6
function decodePolyline6(encoded: string): [number, number][] {
  if (!encoded || typeof encoded !== 'string') return [];
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const length = encoded.length;

  while (index < length) {
    let result = 0;
    let shift = 0;
    while (true) {
      if (index >= length) break;
      const byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
      if (byte < 0x20) break;
    }
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    while (true) {
      if (index >= length) break;
      const byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
      if (byte < 0x20) break;
    }
    const dlon = result & 1 ? ~(result >> 1) : result >> 1;
    lon += dlon;

    coords.push([lon / 1e6, lat / 1e6]);
  }
  return coords;
}

function samplePoints(coords: [number, number][], maxSamples = 12, minSpacingM = 250): [number, number][] {
  if (coords.length === 0) return [];
  if (coords.length === 1) return [coords[0]];
  const points: [number, number][] = [coords[0]];
  let dist = 0.0;
  for (let i = 1; i < coords.length; i++) {
    const p = coords[i];
    const prev = coords[i - 1];
    dist += haversineM(prev[0], prev[1], p[0], p[1]);
    if (dist >= minSpacingM) {
      points.push(p);
      dist = 0.0;
      if (points.length >= maxSamples) break;
    }
  }
  if (points.length === 1) {
    points.push(coords[coords.length - 1]);
  } else if (
    points[points.length - 1] !== coords[coords.length - 1] &&
    points.length < maxSamples
  ) {
    const lastDist = haversineM(
      points[points.length - 1][0],
      points[points.length - 1][1],
      coords[coords.length - 1][0],
      coords[coords.length - 1][1]
    );
    if (lastDist >= minSpacingM / 2 || points.length < 3) {
      points.push(coords[coords.length - 1]);
    }
  }
  return points.slice(0, maxSamples);
}

function currentAsOf(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Geocode helper
async function geocodeDestination(destination: string): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(destination)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Geocoding HTTP error ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  const first = data[0];
  const lat = parseFloat(first.lat);
  const lon = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Invalid coordinates returned from geocoding');
  }
  return {
    latitude: lat,
    longitude: lon,
    displayName: (first.display_name || destination).trim(),
  };
}

// OSRM fallback router if Valhalla times out or fails
async function fetchOsrmFallbackRoutes(
  startLat: number,
  startLon: number,
  destLat: number,
  destLon: number,
  mode: string
): Promise<any> {
  const profile = mode === 'cycling' ? 'bike' : 'foot';
  const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('OSRM fallback failed');
  const data = await res.json();
  if (!data || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error('OSRM returned no routes');
  }
  const candidates = data.routes.slice(0, 3).map((r: any, idx: number) => ({
    id: `route-${idx}`,
    distance_m: r.distance || 0,
    duration_s: r.duration || 0,
    coordinates: r.geometry && Array.isArray(r.geometry.coordinates) ? r.geometry.coordinates : [],
  }));
  return {
    candidates,
    provider: 'osrm_public',
    provider_note: 'OSRM public server used as fallback routing provider.',
  };
}

// PM2.5 exposure estimation
async function estimatePm25(coords: [number, number][], timeoutMs = 2500): Promise<any> {
  const samples = samplePoints(coords);
  if (samples.length === 0) {
    return {
      available: false,
      reason: 'no_sample_points',
      metric: 'pm2_5',
      units: 'ug/m3',
      source: 'open-meteo-cams',
      caveat: 'regional model estimate (CAMS) - not street-level; coarse resolution may make values indistinguishable',
      as_of: currentAsOf(),
    };
  }

  const lats = samples.map((p) => p[1].toFixed(4)).join(',');
  const lons = samples.map((p) => p[0].toFixed(4)).join(',');
  const url = `${AQ_API_URL}?latitude=${lats}&longitude=${lons}&current=pm2_5&timezone=auto`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      return {
        available: false,
        reason: `http_${res.status}`,
        metric: 'pm2_5',
        units: 'ug/m3',
        source: 'open-meteo-cams',
        caveat: 'regional model estimate (CAMS) - not street-level',
        as_of: currentAsOf(),
      };
    }
    const data = await res.json();
    const values: number[] = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        const val = item?.current?.pm2_5;
        if (typeof val === 'number' && Number.isFinite(val)) {
          values.push(val);
        }
      }
    } else if (data?.current?.pm2_5 !== undefined) {
      const val = data.current.pm2_5;
      if (typeof val === 'number' && Number.isFinite(val)) {
        values.push(val);
      }
    }

    if (values.length === 0) {
      return {
        available: false,
        reason: 'no_values',
        metric: 'pm2_5',
        units: 'ug/m3',
        source: 'open-meteo-cams',
        caveat: 'regional model estimate (CAMS) - not street-level',
        as_of: currentAsOf(),
      };
    }

    const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
    const value = Math.round(meanVal * 10) / 10;
    const isIndistinguishable = new Set(values).size === 1 && values.length > 1;

    return {
      available: true,
      metric: 'pm2_5',
      value,
      units: 'ug/m3',
      source: 'open-meteo-cams',
      samples: samples.length,
      value_variance: values,
      indistinguishable: isIndistinguishable,
      caveat: 'regional model estimate (CAMS) - not street-level; coarse resolution may make values indistinguishable between nearby routes',
      as_of: currentAsOf(),
    };
  } catch (err: any) {
    return {
      available: false,
      reason: err?.name === 'TimeoutError' ? 'timeout' : 'upstream_error',
      metric: 'pm2_5',
      units: 'ug/m3',
      source: 'open-meteo-cams',
      caveat: 'regional model estimate (CAMS) - not street-level',
      as_of: currentAsOf(),
    };
  }
}

// Routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    database_configured: false,
    auth_configured: false,
    providers: {
      geocoding: 'nominatim',
      routing: 'valhalla_public',
      air_quality: 'open-meteo-cams',
    },
  });
});

app.get('/geocode', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    return res.status(422).json({ error: { code: 'INVALID_REQUEST', message: 'q must not be blank' } });
  }

  try {
    const result = await geocodeDestination(q);
    if (!result) {
      return res.status(404).json({
        error: {
          code: 'NO_GEOCODING_RESULT',
          message: `no location found for '${q}'. Try a more specific name.`,
        },
      });
    }
    return res.json(result);
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: { code: 'UPSTREAM_TIMEOUT', message: 'geocoding service timed out, try again' } });
    }
    return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'geocoding service is unavailable' } });
  }
});

app.post('/route', async (req: Request, res: Response) => {
  const {
    latitude,
    longitude,
    destination,
    mode = 'walking',
    alternatives = 3,
    destinationLatitude,
    destinationLongitude,
    destinationName,
  } = req.body || {};

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(422).json({ error: { code: 'INVALID_REQUEST', message: 'Invalid start coordinates' } });
  }

  let destLat: number;
  let destLon: number;
  let finalDestName = (destinationName || destination || '').trim();

  const hasCoords = typeof destinationLatitude === 'number' && typeof destinationLongitude === 'number';
  if (hasCoords) {
    destLat = destinationLatitude;
    destLon = destinationLongitude;
    if (!finalDestName) {
      finalDestName = `${destLat.toFixed(4)}, ${destLon.toFixed(4)}`;
    }
  } else {
    const destQuery = (destination || '').trim();
    if (!destQuery) {
      return res.status(422).json({ error: { code: 'INVALID_REQUEST', message: 'destination must not be blank' } });
    }
    try {
      const geo = await geocodeDestination(destQuery);
      if (!geo) {
        return res.status(404).json({
          error: { code: 'NO_GEOCODING_RESULT', message: `no location found for '${destQuery}'` },
        });
      }
      destLat = geo.latitude;
      destLon = geo.longitude;
      finalDestName = geo.displayName || destQuery;
    } catch (err: any) {
      if (err.name === 'TimeoutError') {
        return res.status(504).json({ error: { code: 'UPSTREAM_TIMEOUT', message: 'geocoding service timed out, try again' } });
      }
      return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'geocoding service is unavailable' } });
    }
  }

  // Fetch routing
  let routesResult: any = null;
  const costing = VERIFIED_COSTING[mode] || 'pedestrian';
  const valhallaBody = {
    locations: [
      { lat: latitude, lon: longitude },
      { lat: destLat, lon: destLon },
    ],
    costing,
    alternates: Math.max(0, Math.min(Number(alternatives) || 3, 3)),
    directions_options: { units: 'kilometers' },
  };

  try {
    const valhallaRes = await fetch(VALHALLA_ROUTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valhallaBody),
      signal: AbortSignal.timeout(12000),
    });

    if (valhallaRes.ok) {
      const data = await valhallaRes.json();
      const candidates: any[] = [];

      const extractTrip = (trip: any) => {
        if (!trip || !Array.isArray(trip.legs)) return null;
        const allCoords: [number, number][] = [];
        for (const leg of trip.legs) {
          if (leg && leg.shape) {
            allCoords.push(...decodePolyline6(leg.shape));
          }
        }
        if (allCoords.length === 0) return null;
        const summary = trip.summary || {};
        return {
          distance_m: (parseFloat(summary.length) || 0) * 1000,
          duration_s: parseFloat(summary.time) || 0,
          coordinates: allCoords,
        };
      };

      const primary = extractTrip(data.trip);
      if (primary) {
        primary.id = 'route-0';
        candidates.push(primary);
      }
      if (Array.isArray(data.alternates)) {
        for (const alt of data.alternates) {
          if (candidates.length >= 1 + (Number(alternatives) || 3)) break;
          const extracted = extractTrip(alt.trip || alt);
          if (extracted) {
            extracted.id = `route-${candidates.length}`;
            candidates.push(extracted);
          }
        }
      }
      if (candidates.length > 0) {
        routesResult = {
          candidates,
          provider: 'valhalla_public',
          provider_note: 'Valhalla public server used (prototype only, no SLA).',
        };
      }
    }
  } catch (err) {
    console.warn('Valhalla routing failed or timed out, trying fallback OSRM...', err);
  }

  // Fallback to OSRM if Valhalla was unreachable
  if (!routesResult) {
    try {
      routesResult = await fetchOsrmFallbackRoutes(latitude, longitude, destLat, destLon, mode);
    } catch (osrmErr) {
      console.warn('OSRM fallback also failed:', osrmErr);
    }
  }

  // If both public routers failed, generate direct multi-waypoint straight-line/spline route so user can still test!
  if (!routesResult || !routesResult.candidates || routesResult.candidates.length === 0) {
    const directDist = haversineM(longitude, latitude, destLon, destLat);
    if (directDist > 0) {
      const speedMps = mode === 'cycling' ? 5.5 : 1.35; // ~20 km/h bike, 4.8 km/h walk
      const midLat = (latitude + destLat) / 2;
      const midLon = (longitude + destLon) / 2;
      const directCandidates = [
        {
          id: 'route-0',
          distance_m: Math.round(directDist * 1.05),
          duration_s: Math.round((directDist * 1.05) / speedMps),
          coordinates: [
            [longitude, latitude],
            [midLon + 0.001, midLat + 0.001],
            [destLon, destLat],
          ],
        },
      ];
      routesResult = {
        candidates: directCandidates,
        provider: 'fallback_estimate',
        provider_note: 'Public routing services were temporarily unavailable; estimate generated.',
      };
    } else {
      return res.status(404).json({
        error: { code: 'NO_ROUTE_FOUND', message: 'no route found between the given points' },
      });
    }
  }

  // Enrich with PM2.5 exposure
  const candidates = routesResult.candidates;
  const enrichedCandidates: any[] = [];
  for (const c of candidates) {
    const coords = c.coordinates || [];
    const exp = await estimatePm25(coords);
    enrichedCandidates.push({
      ...c,
      pm25_estimate: exp,
    });
  }

  // Cross-route distinguishability calculation
  let allAvailable = true;
  const values: number[] = [];
  for (const c of enrichedCandidates) {
    const exp = c.pm25_estimate;
    if (!exp?.available || exp.value === null || exp.value === undefined) {
      allAvailable = false;
      break;
    }
    values.push(exp.value);
  }

  let allEqualOrUnavailable = false;
  let canCompareCleanest = false;
  if (!allAvailable) {
    allEqualOrUnavailable = true;
    canCompareCleanest = false;
  } else {
    const rounded = values.map((v) => Math.floor(v * 10 + 0.5) / 10);
    if (new Set(rounded).size === 1) {
      allEqualOrUnavailable = true;
      canCompareCleanest = false;
    } else {
      allEqualOrUnavailable = false;
      canCompareCleanest = true;
    }
  }

  for (const c of enrichedCandidates) {
    const exp = { ...c.pm25_estimate };
    exp.indistinguishable_across_routes = allEqualOrUnavailable;
    exp.can_compare_cleanest = canCompareCleanest;
    if (!allAvailable) {
      exp.cross_route_note =
        'PM₂.₅ estimates missing for some routes; cannot compare reliably. Regional model estimate (CAMS) — not street-level.';
    } else if (allEqualOrUnavailable) {
      exp.cross_route_note =
        'All candidate routes have equal regional model PM₂.₅ estimates; cannot identify a cleaner route. Regional model estimate (CAMS).';
    } else {
      exp.cross_route_note =
        'Regional model PM₂.₅ estimates differ across routes; Cleanest uses lowest estimated PM₂.₅ (model-based). Regional model estimate (CAMS) — not street-level.';
    }
    c.pm25_estimate = exp;
  }

  return res.json({
    origin: { latitude, longitude },
    destination: {
      name: finalDestName,
      latitude: destLat,
      longitude: destLon,
    },
    mode,
    provider: routesResult.provider,
    provider_note: routesResult.provider_note,
    route: enrichedCandidates[0],
    candidates: enrichedCandidates,
    attribution: {
      air_quality: {
        source: 'Open-Meteo Air Quality API',
        provider: 'Copernicus Atmosphere Monitoring Service (CAMS)',
        url: 'https://open-meteo.com/en/docs/air-quality-api',
        note: 'Regional model estimate - not street-level pollution or measured personal exposure',
      },
    },
  });
});

// Cloud sync endpoints graceful 503 fallback
app.all('/me/*', (_req: Request, res: Response) => {
  res.status(503).json({
    error: {
      code: 'AUTH_NOT_CONFIGURED',
      message: 'Cloud profile/trip sync is optional and not configured in local prototype.',
    },
  });
});

// Vite middleware or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoRoute server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
