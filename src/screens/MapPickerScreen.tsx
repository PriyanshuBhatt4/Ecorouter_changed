import React, { useState } from 'react';
import { WebMap } from '../components/WebMap';
import { DEFAULT_REGION } from '../constants';
import { ScreenHeader, PrimaryButton, GhostButton } from '../components/ui';
import { formatLatLng } from '../lib/format';
import { MapPin } from 'lucide-react';

export default function MapPickerScreen({
  t,
  isDark,
  initialRegion,
  onPick,
  onClose,
}: any) {
  const [picked, setPicked] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleMapClick = (coords: { latitude: number; longitude: number }) => {
    if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return;
    setPicked(coords);
  };

  return (
    <div className={`relative w-full h-full flex flex-col ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <ScreenHeader
        onBackPress={onClose}
        backText="‹ Cancel"
        title="Choose on Map"
        isDark={isDark}
      />

      {/* Map */}
      <div className="flex-1 relative">
        <WebMap
          isDark={isDark}
          initialCenter={initialRegion || DEFAULT_REGION}
          initialZoom={14}
          pickedLocation={picked}
          onMapClick={handleMapClick}
          accentColor={t.primary}
        />

        {/* Tip floating card */}
        <div className="absolute top-4 left-4 right-4 max-w-sm mx-auto z-10 pointer-events-none">
          <div className="p-3 rounded-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-800 shadow-lg backdrop-blur-md text-xs text-center font-medium">
            Tap anywhere on the map to place the location pin.
          </div>
        </div>
      </div>

      {/* Bottom confirmation sheet */}
      <div className={`p-4 border-t shadow-2xl backdrop-blur-md z-10 ${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-md mx-auto flex flex-col gap-2.5">
          {picked ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" /> Selected Point
              </span>
              <span className="font-mono font-bold">{formatLatLng(picked.latitude, picked.longitude)}</span>
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic text-center">
              No point selected yet.
            </div>
          )}

          <div className="flex gap-2">
            <PrimaryButton
              disabled={!picked}
              onClick={() => picked && onPick(picked)}
              label="Use this location"
              accentColor={t.primary}
            />
            <GhostButton onClick={onClose} label="Cancel" isDark={isDark} />
          </div>
        </div>
      </div>
    </div>
  );
}
