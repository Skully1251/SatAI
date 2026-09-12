/**
 * Free, key-less place search: OpenStreetMap's Nominatim geocoder plus a
 * local coordinate parser, so "12.9716, 77.5946" flies straight to the spot
 * without a network round-trip.
 *
 * Nominatim is free with a fair-use policy (max ~1 req/sec — the search bar
 * debounces 450 ms and aborts in-flight requests, which fits). If you ever
 * move to a keyed provider (Google Maps / Mapbox / …), only this file
 * changes: searchPlaces() just has to map one JSON shape to
 * PlaceSuggestion[] (e.g. Google: https://maps.googleapis.com/maps/api/
 * geocode/json?key=YOUR_KEY&address=…).
 */
import { MapLatLng } from './mapAnalysisService';

export interface PlaceSuggestion {
  /** Primary row label (place name / formatted coordinates). */
  title: string;
  /** Secondary row label (region, country…). */
  subtitle: string;
  /** Short badge: city / town / village / coords / … */
  badge: string;
  lat: number;
  lng: number;
  /** Camera zoom the map should fly to for this result. */
  zoom: number;
}

/** Flight target handed to the canvas — "go here, at this zoom". */
export interface SearchTarget extends MapLatLng {
  zoom: number;
  label: string;
}

/** Zoom a raw coordinate query flies to (a specific point deserves a close look). */
export const COORDINATE_ZOOM = 15;

/** Fallback zoom when Nominatim's result type isn't in the table. */
export const DEFAULT_PLACE_ZOOM = 13;

/** Nominatim type → camera zoom (a city flies higher than a house). */
const ZOOM_BY_TYPE: Record<string, number> = {
  country: 6,
  state: 7,
  region: 8,
  county: 10,
  city: 11,
  town: 12,
  village: 13,
  suburb: 13,
  quarter: 13,
  neighbourhood: 14,
  hamlet: 14,
  locality: 14,
  isolated_dwelling: 14,
  building: 16,
  house: 16,
  amenity: 15,
  shop: 16,
  tourism: 15,
  airport: 13,
  railway: 13,
  administrative: 10,
  boundary: 7,
};

/* ------------------------------------------------------------------ */
/* Coordinate parsing                                                  */
/* ------------------------------------------------------------------ */

const NUM = '(-?\\d+(?:\\.\\d+)?)';
const CARD = '([NnSsEeWw]?)';

// "12.9716, 77.5946" · "12.9716 77.5946" · "12.9716°N, 77.5946°E" · "12.97N 77.59E"
const PLAIN_RE = new RegExp(`^${NUM}\\s*°?\\s*${CARD}\\s*[,;\\s]+\\s*${NUM}\\s*°?\\s*${CARD}$`);
// "lat: 12.9716, lng: 77.5946" · "latitude 12.97, longitude 77.59" · "lat=-12, lon=77"
const LABELED_RE = new RegExp(
  `^(?:lat(?:itude)?\\s*[:=]?\\s*)?${NUM}\\s*°?\\s*${CARD}\\s*[,;\\s]+\\s*(?:lng|lon|long|longitude)\\s*[:=]?\\s*${NUM}\\s*°?\\s*${CARD}$`,
  'i'
);

/** Parse "lat, lng" style queries (with or without N/S/E/W or ° suffixes).
 *  Returns null when the text is not coordinates — then geocode it instead. */
export function parseCoordinates(query: string): MapLatLng | null {
  const text = query.trim();
  if (!text) return null;
  const m = PLAIN_RE.exec(text) || LABELED_RE.exec(text);
  if (!m) return null;
  let lat = parseFloat(m[1]);
  let lng = parseFloat(m[3]);
  if (/[Ss]/.test(m[2] || '')) lat = -lat;
  if (/[Ww]/.test(m[4] || '')) lng = -lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** "12.9716°N, 77.5946°E" — the label shown after picking a coordinate. */
export const formatCoordinateLabel = (c: MapLatLng) =>
  `${Math.abs(c.lat).toFixed(4)}°${c.lat >= 0 ? 'N' : 'S'}, ${Math.abs(c.lng).toFixed(4)}°${c.lng >= 0 ? 'E' : 'W'}`;

/* ------------------------------------------------------------------ */
/* Nominatim geocoding                                                 */
/* ------------------------------------------------------------------ */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimResult {
  lat: string;
  lon: string;
  type?: string;
  display_name?: string;
}

/** Forward-geocode a free-text place query via OpenStreetMap Nominatim.
 *  Pass an AbortSignal to cancel (the search bar aborts the previous
 *  request on every keystroke). Rejections bubble up to the caller. */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const url =
    `${NOMINATIM_URL}?format=jsonv2&limit=6&addressdetails=0` +
    `&accept-language=en&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);
  const json: NominatimResult[] = await res.json();
  return json.map((r) => {
    const parts = (r.display_name || '').split(',').map((s) => s.trim()).filter(Boolean);
    const title = parts[0] || 'Unnamed place';
    const subtitle = parts.slice(1).join(', ');
    const type = r.type || 'place';
    return {
      title,
      subtitle,
      badge: type.replace(/_/g, ' '),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      zoom: ZOOM_BY_TYPE[type] ?? DEFAULT_PLACE_ZOOM,
    };
  });
}

/** Flight target for a coordinate query, or null if it isn't one. */
export function coordinateTarget(query: string): SearchTarget | null {
  const c = parseCoordinates(query);
  if (!c) return null;
  return { lat: c.lat, lng: c.lng, zoom: COORDINATE_ZOOM, label: formatCoordinateLabel(c) };
}

/** Flight target for a geocoded suggestion. */
export function suggestionTarget(s: PlaceSuggestion): SearchTarget {
  return {
    lat: s.lat,
    lng: s.lng,
    zoom: s.zoom,
    label: s.subtitle ? `${s.title}, ${s.subtitle}` : s.title,
  };
}
