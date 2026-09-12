/**
 * Map analysis API client.
 *
 * The request/response contract AND the mock generator live in the backend
 * package (/backend/shared) so the server and this client can never drift
 * apart. At runtime the client calls the real backend; if it isn't running
 * (or is slow to answer) it falls back to the same local mock the server
 * would have run, so the dashboard stays fully demo-able standalone.
 *
 *   cd backend && npm install && npm run dev   → http://localhost:4000
 */
import { MAP_ANALYSIS_PATH } from '../../../backend/shared/mapApi';
import type {
  MapAnalysisRequest,
  MapAnalysisResult,
} from '../../../backend/shared/mapApi';
import { analyzeRegionLocally, MOCK_LATENCY_MS } from '../../../backend/shared/mockAnalysis';
import { getCachedIdToken } from './authService';

// Public surface — re-export the shared contract so existing UI imports
// (AnalysisPopup, MapCanvas, mapTypes…) keep working unchanged.
export type {
  MapDetailType,
  MapLatLng,
  MapRegion,
  MapDateRange,
  MapAnalysisRequest,
  ExplanationFactor,
  AnalysisMetric,
  MapAnalysisResult,
} from '../../../backend/shared/mapApi';
import type { MapDetailType } from '../../../backend/shared/mapApi';

/** Where the spatial-intelligence backend lives (see /backend). */
export const MAP_ANALYSIS_ENDPOINT = `http://localhost:4000${MAP_ANALYSIS_PATH}`;

/** How long to wait on the backend before falling back to the local mock. */
const BACKEND_TIMEOUT_MS = 4000;

/** UI labels for the land-detail picker (presentation-only, not part of the API). */
export const DETAIL_TYPE_OPTIONS: { id: MapDetailType; label: string }[] = [
  { id: 'land_use', label: 'Land Use & Zoning' },
  { id: 'vegetation', label: 'Vegetation Health' },
  { id: 'soil_carbon', label: 'Soil & Carbon' },
  { id: 'biodiversity', label: 'Biodiversity' },
  { id: 'water', label: 'Water & Hydrology' },
  { id: 'climate', label: 'Climate & Weather' },
];

/**
 * Analyze a drawn region. Calls the real backend when it is up; otherwise
 * runs the shared local mock so the explainable flow always completes.
 */
export const analyzeMapRegion = async (
  request: MapAnalysisRequest
): Promise<MapAnalysisResult> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
    // Attach the Firebase ID token when signed in — the backend verifies it.
    const idToken = await getCachedIdToken();
    const res = await fetch(MAP_ANALYSIS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      if (res.status === 401 || res.status === 503) {
        // Auth misconfigured (or not signed in) — surface it during development.
        console.warn(`[map-analysis] backend responded ${res.status} — falling back to local mock`);
      }
      throw new Error(`Backend responded ${res.status}`);
    }
    return (await res.json()) as MapAnalysisResult;
  } catch {
    // Backend offline — run the shared local mock so the flow still works.
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return analyzeRegionLocally(request);
  }
};
