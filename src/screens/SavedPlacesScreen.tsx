import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  Map as MapIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Navigation,
  Home,
  Briefcase,
  Bookmark,
} from 'lucide-react';
import { PLACE_CATEGORIES, SavedPlace } from '../constants';
import { formatLatLng } from '../lib/format';
import { ScreenHeader, PrimaryButton, GhostButton, EmptyState } from '../components/ui';

export default function SavedPlacesScreen({
  t,
  isDark,
  savedPlaces = [],
  pendingPlace,
  savedAddStatus,
  savedAddError,
  savedCoordError,
  addPlaceFromSearch,
  addPlaceFromCurrentLocation,
  addPlaceFromCoordinates,
  openMapPicker,
  submitPendingPlace,
  cancelPendingPlace,
  updateSavedPlace,
  confirmDeleteSavedPlace,
  routeToSavedPlace,
  setView,
}: any) {
  const [searchText, setSearchText] = useState('');
  const [coordsVisible, setCoordsVisible] = useState(false);
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');

  const [pendingName, setPendingName] = useState('');
  const [pendingCategory, setPendingCategory] = useState('other');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('other');
  const [rowError, setRowError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingPlace) {
      setPendingName(typeof pendingPlace.name === 'string' ? pendingPlace.name : '');
      setPendingCategory(
        PLACE_CATEGORIES.some((cat) => cat.id === pendingPlace.category) ? pendingPlace.category : 'other'
      );
    }
  }, [pendingPlace]);

  const busy = savedAddStatus !== 'idle';

  const handleStartEdit = (pl: SavedPlace) => {
    setEditingId(pl.id);
    setEditName(pl.name);
    setEditCategory(pl.category);
    setRowError(null);
  };

  const saveRowEdit = async () => {
    if (!editingId) return;
    setRowError(null);
    const res = await updateSavedPlace(editingId, { name: editName, category: editCategory });
    if (res && res.ok === false) {
      setRowError('Name must be 1-60 characters.');
      return;
    }
    setEditingId(null);
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'home') return <Home className="w-3.5 h-3.5 text-blue-500" />;
    if (category === 'work') return <Briefcase className="w-3.5 h-3.5 text-emerald-500" />;
    return <Bookmark className="w-3.5 h-3.5 text-gray-500" />;
  };

  return (
    <div className={`w-full min-h-full pb-16 flex flex-col ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <ScreenHeader
        onBackPress={() => setView('settings')}
        backText="‹ Settings"
        title="Saved Places"
        isDark={isDark}
      />

      <div className="max-w-xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Pending Place Confirmation Card */}
        {pendingPlace && (
          <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-lg flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Confirm New Place
            </span>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Place Name
              </label>
              <input
                type="text"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder="e.g. Home, Office, Central Park"
                className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                  isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Category
              </label>
              <div className="flex gap-2">
                {PLACE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPendingCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      pendingCategory === cat.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : isDark
                        ? 'bg-gray-800 text-gray-300 border-gray-700'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Coordinates: {formatLatLng(pendingPlace.latitude, pendingPlace.longitude)}
            </div>

            {savedAddError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{savedAddError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <PrimaryButton
                onClick={() => submitPendingPlace({ name: pendingName, category: pendingCategory })}
                label="Save Place"
                accentColor={t.primary}
              />
              <GhostButton onClick={cancelPendingPlace} label="Cancel" isDark={isDark} />
            </div>
          </div>
        )}

        {/* Add a Place Section */}
        <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">
            Add New Location
          </span>

          {/* Search method */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addPlaceFromSearch(searchText);
            }}
            className="flex gap-2 mb-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search place name (e.g. India Gate)..."
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none ${
                  isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={busy || !searchText.trim()}
              style={{ backgroundColor: t.primary }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {savedAddStatus === 'searching' ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Quick Add Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={addPlaceFromCurrentLocation}
              disabled={busy}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
              <span>Use Current GPS</span>
            </button>

            <button
              type="button"
              onClick={openMapPicker}
              disabled={busy}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>Pick on Map</span>
            </button>

            <button
              type="button"
              onClick={() => setCoordsVisible(!coordsVisible)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>Coordinates</span>
            </button>
          </div>

          {/* Coordinates form */}
          {coordsVisible && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    value={latText}
                    onChange={(e) => setLatText(e.target.value)}
                    placeholder="Latitude (-90 to 90)"
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                      isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300'
                    }`}
                  />
                  {savedCoordError?.latitude && (
                    <span className="text-[10px] text-red-500 mt-0.5 block">{savedCoordError.latitude}</span>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    value={lngText}
                    onChange={(e) => setLngText(e.target.value)}
                    placeholder="Longitude (-180 to 180)"
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                      isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300'
                    }`}
                  />
                  {savedCoordError?.longitude && (
                    <span className="text-[10px] text-red-500 mt-0.5 block">{savedCoordError.longitude}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => addPlaceFromCoordinates(latText, lngText)}
                className="self-end px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Add Coordinates
              </button>
            </div>
          )}

          {savedAddError && !pendingPlace && (
            <p className="text-xs text-red-500 mt-2 font-medium">{savedAddError}</p>
          )}
        </div>

        {/* Saved Places List */}
        <div className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Your Places ({savedPlaces.length})
            </span>
          </div>

          {savedPlaces.length === 0 ? (
            <EmptyState
              title="No saved places yet"
              hint="Save Home, Work, or favorite spots for instant one-tap eco-routing on the map."
              isDark={isDark}
            />
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {savedPlaces.map((pl: SavedPlace) => {
                const isEditing = editingId === pl.id;

                if (isEditing) {
                  return (
                    <div key={pl.id} className="py-3 flex flex-col gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`w-full px-3 py-1.5 text-sm rounded-lg border font-semibold ${
                          isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                          {PLACE_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setEditCategory(cat.id)}
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                editCategory === cat.id
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : isDark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-300'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveRowEdit}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Save changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {rowError && <span className="text-[11px] text-red-500">{rowError}</span>}
                    </div>
                  );
                }

                return (
                  <div key={pl.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 flex-shrink-0 mt-0.5">
                        {getCategoryIcon(pl.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm truncate">{pl.name}</h4>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 uppercase">
                            {pl.category}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 block font-mono">
                          {formatLatLng(pl.latitude, pl.longitude)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => routeToSavedPlace(pl)}
                        style={{ backgroundColor: t.primary }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1 shadow-sm active:scale-95"
                        title="Route here"
                      >
                        <Navigation className="w-3.5 h-3.5 fill-white" />
                        <span>Route</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(pl)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit place"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => confirmDeleteSavedPlace(pl.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Delete place"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
