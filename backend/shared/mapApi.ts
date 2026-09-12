/**
 * Shared API contract for the spatial XAI map analysis.
 *
 * This module is the single source of truth for the request/response shapes.
 * It is imported by BOTH sides so they can never drift apart:
 *   · the Express server in /backend/src serves this contract over HTTP
 *   · the frontend client (src/services/mapAnalysisService.ts) consumes it,
 *     falling back to the same local mock when the server isn't running
 */

/** REST path the frontend client calls on the backend. */
export const MAP_ANALYSIS_PATH = '/v1/map/analyze';

/** Every land-detail type the model can explain (validated server-side). */
export const MAP_DETAIL_TYPES = [
  'land_use',
  'vegetation',
  'soil_carbon',
  'biodiversity',
  'water',
  'climate',
] as const;

/** The kind of land detail the user wants explained. */
export type MapDetailType = (typeof MAP_DETAIL_TYPES)[number];

export interface MapLatLng {
  lat: number;
  lng: number;
}

/** A completed user-drawn region on the map. */
export interface MapRegion {
  /** Clockwise/closed loop of vertices (in display order). */
  vertices: MapLatLng[];
  /** Rough geographic center, used for anchoring the analysis popup. */
  centroid: MapLatLng;
  /** Approximate area in square meters (shoelace on projected coords). */
  areaSqm: number;
}

export interface MapDateRange {
  /** ISO date, e.g. "2025-06-12" */
  start: string;
  /** ISO date, e.g. "2026-09-12" */
  end: string;
}

export interface MapAnalysisRequest {
  region: MapRegion;
  detailType: MapDetailType;
  dateRange: MapDateRange;
}

/** One explainability factor: what the model weighted, and why. */
export interface ExplanationFactor {
  label: string;
  /** Share of the model's decision, 0–100. Weights sum to ~100 per result. */
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  rationale: string;
}

export interface AnalysisMetric {
  label: string;
  value: string;
  delta?: string;
}

export interface MapAnalysisResult {
  id: string;
  /** The XAI verdict sentence. */
  summary: string;
  /** Model confidence, 0–1. */
  confidence: number;
  metrics: AnalysisMetric[];
  factors: ExplanationFactor[];
  /** Satellite products / datasets the model claims to have used. */
  evidence: string[];
  modelNote: string;
}
