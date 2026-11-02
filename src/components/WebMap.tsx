import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons with clean SVG divIcons
export const createPinIcon = (color: string, label?: string) => {
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid #ffffff;">
          <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%;"></div>
        </div>
        ${label ? `<span style="background: rgba(17,24,39,0.85); color: #fff; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-top: 4px; white-space: nowrap;">${label}</span>` : ''}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

export const createGpsIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-gps-pin',
    html: `
      <div style="position: relative; width: 20px; height: 20px; transform: translate(-50%, -50%);">
        <div style="position: absolute; inset: -6px; border-radius: 50%; background-color: ${color}; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; inset: 0; border-radius: 50%; background-color: ${color}; border: 3px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export const createReplayIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-replay-pin',
    html: `
      <div style="position: relative; width: 22px; height: 22px; transform: translate(-50%, -50%);">
        <div style="position: absolute; inset: -4px; border-radius: 50%; background-color: ${color}; opacity: 0.4;"></div>
        <div style="position: absolute; inset: 0; border-radius: 50%; background-color: ${color}; border: 3px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.4);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick?: (coords: { latitude: number; longitude: number }) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      }
    },
  });
  return null;
}

// Component to auto-fit coordinates or follow user
function MapBoundsUpdater({
  boundsPoints,
  userPos,
  followUser,
}: {
  boundsPoints?: { latitude: number; longitude: number }[];
  userPos?: { latitude: number; longitude: number } | null;
  followUser?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (followUser && userPos && Number.isFinite(userPos.latitude) && Number.isFinite(userPos.longitude)) {
      map.setView([userPos.latitude, userPos.longitude], Math.max(map.getZoom(), 16), { animate: true });
      return;
    }

    if (boundsPoints && boundsPoints.length > 0) {
      const validPoints = boundsPoints.filter(
        (p) => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      );
      if (validPoints.length === 1) {
        map.setView([validPoints[0].latitude, validPoints[0].longitude], 15, { animate: true });
      } else if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints.map((p) => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      }
    }
  }, [boundsPoints, userPos, followUser, map]);

  return null;
}

interface WebMapProps {
  isDark?: boolean;
  initialCenter?: { latitude: number; longitude: number };
  initialZoom?: number;
  userPos?: { latitude: number; longitude: number } | null;
  destinationCoord?: { latitude: number; longitude: number } | null;
  candidates?: Array<{
    id: string;
    coordinates: { latitude: number; longitude: number }[];
  }>;
  selectedId?: string | null;
  onSelectCandidate?: (id: string) => void;
  connectorLine?: { latitude: number; longitude: number }[] | null;
  trailPoints?: { latitude: number; longitude: number }[];
  replayMarkerPos?: { latitude: number; longitude: number } | null;
  pickedLocation?: { latitude: number; longitude: number } | null;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  followUser?: boolean;
  fitPoints?: { latitude: number; longitude: number }[];
  accentColor?: string;
  className?: string;
}

export function WebMap({
  isDark = false,
  initialCenter = { latitude: 28.5494, longitude: 77.2001 },
  initialZoom = 13,
  userPos,
  destinationCoord,
  candidates = [],
  selectedId,
  onSelectCandidate,
  connectorLine,
  trailPoints = [],
  replayMarkerPos,
  pickedLocation,
  onMapClick,
  followUser = false,
  fitPoints,
  accentColor = '#10B981',
  className = 'w-full h-full min-h-[300px]',
}: WebMapProps) {
  // Tile URLs
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Determine points to fit
  const pointsToFit = fitPoints || [
    ...(userPos ? [userPos] : []),
    ...(destinationCoord ? [destinationCoord] : []),
    ...(pickedLocation ? [pickedLocation] : []),
  ];

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[initialCenter.latitude, initialCenter.longitude]}
        zoom={initialZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer attribution={attribution} url={tileUrl} maxZoom={19} />

        <MapClickHandler onMapClick={onMapClick} />
        <MapBoundsUpdater
          boundsPoints={pointsToFit.length > 0 ? pointsToFit : undefined}
          userPos={userPos}
          followUser={followUser}
        />

        {/* Trail Polyline */}
        {trailPoints.length > 1 && (
          <Polyline
            positions={trailPoints.map((p) => [p.latitude, p.longitude])}
            pathOptions={{ color: '#F97316', weight: 4, opacity: 0.85, lineCap: 'round' }}
          />
        )}

        {/* Dashed connector line */}
        {connectorLine && connectorLine.length >= 2 && (
          <Polyline
            positions={connectorLine.map((p) => [p.latitude, p.longitude])}
            pathOptions={{ color: '#9CA3AF', weight: 3, dashArray: '6, 8', opacity: 0.9 }}
          />
        )}

        {/* Unselected Route Candidates */}
        {candidates.map((c) => {
          if (c.id === selectedId) return null;
          return (
            <Polyline
              key={c.id}
              positions={c.coordinates.map((p) => [p.latitude, p.longitude])}
              pathOptions={{
                color: isDark ? '#4B5563' : '#9CA3AF',
                weight: 5,
                opacity: 0.7,
                lineCap: 'round',
              }}
              eventHandlers={{
                click: () => onSelectCandidate && onSelectCandidate(c.id),
              }}
            />
          );
        })}

        {/* Selected Route Candidate */}
        {candidates.map((c) => {
          if (c.id !== selectedId) return null;
          return (
            <React.Fragment key={c.id}>
              {/* Outer glow line */}
              <Polyline
                positions={c.coordinates.map((p) => [p.latitude, p.longitude])}
                pathOptions={{
                  color: accentColor,
                  weight: 9,
                  opacity: 0.35,
                  lineCap: 'round',
                }}
              />
              {/* Core polyline */}
              <Polyline
                positions={c.coordinates.map((p) => [p.latitude, p.longitude])}
                pathOptions={{
                  color: accentColor,
                  weight: 5,
                  opacity: 1,
                  lineCap: 'round',
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Destination Marker */}
        {destinationCoord && (
          <Marker
            position={[destinationCoord.latitude, destinationCoord.longitude]}
            icon={createPinIcon('#F59E0B', 'Destination')}
          />
        )}

        {/* User GPS Location Marker */}
        {userPos && (
          <Marker
            position={[userPos.latitude, userPos.longitude]}
            icon={createGpsIcon(accentColor)}
          />
        )}

        {/* Picked Location Marker */}
        {pickedLocation && (
          <Marker
            position={[pickedLocation.latitude, pickedLocation.longitude]}
            icon={createPinIcon('#F59E0B', 'Selected Spot')}
          />
        )}

        {/* Replay moving marker */}
        {replayMarkerPos && (
          <Marker
            position={[replayMarkerPos.latitude, replayMarkerPos.longitude]}
            icon={createReplayIcon('#3B82F6')}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default WebMap;
