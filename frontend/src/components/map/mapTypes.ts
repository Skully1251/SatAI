import { MapLatLng, MapRegion } from '../../services/mapAnalysisService';

/** Active drawing gesture on the map canvas. */
export type DrawMode = 'polygon' | 'rect' | null;

export interface ContainerPoint {
  x: number;
  y: number;
}

/** Imperative controls the page wires to the toolbar. */
export interface MapCanvasApi {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Return the camera to the initial home view. */
  resetView?: () => void;
  /** Abort any in-progress drawing and drop the finished region. */
  clearDrawing: () => void;
  /** Smoothly fly the camera to a searched location (Google-Earth-style arc). */
  flyToLocation: (target: MapLatLng, zoom: number) => void;
}

/** Contract both the web (globe) and native (SVG) canvas implementations share. */
export interface MapCanvasProps {
  drawMode: DrawMode;
  /** Completed region owned by the page; rendered as a filled overlay. */
  region: MapRegion | null;
  onRegionComplete: (region: MapRegion) => void;
  /**
   * Container-space anchor for the analysis popup (projection of the region
   * centroid), re-emitted whenever the map moves/zooms/resizes.
   */
  onAnchorChange: (anchor: ContainerPoint | null) => void;
  registerApi: (api: MapCanvasApi) => void;
}

/* ------------------------------------------------------------------ */
/* Geometry: equirectangular projection + shoelace area/centroid, so   */
/* both canvases compute identical MapRegion payloads.                 */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_M = 6378137;

function projectToMeters(point: MapLatLng, origin: MapLatLng) {
  const latRad = (origin.lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return {
    x: ((point.lng - origin.lng) * Math.PI * EARTH_RADIUS_M * cosLat) / 180,
    y: ((point.lat - origin.lat) * Math.PI * EARTH_RADIUS_M) / 180,
  };
}

/**
 * Close-free polygon area (shoelace) and area-weighted centroid.
 * Vertices may be in either winding order.
 */
export function computeRegion(vertices: MapLatLng[]): MapRegion | null {
  if (vertices.length < 3) return null;

  const origin = vertices[0];
  const pts = vertices.map((v) => projectToMeters(v, origin));
  const n = pts.length;

  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const cross = p.x * q.y - q.x * p.y;
    twiceArea += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }

  const areaSqm = Math.abs(twiceArea) / 2;
  if (areaSqm < 1) return null;

  const sixArea = 3 * twiceArea;
  const latRad = (origin.lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const centroid: MapLatLng = {
    lat: origin.lat + (cy / sixArea) * (180 / Math.PI) / EARTH_RADIUS_M,
    lng:
      origin.lng +
      (cx / sixArea) * (180 / Math.PI) / (EARTH_RADIUS_M * cosLat),
  };

  return { vertices, centroid, areaSqm };
}

/** Inverse projection used by the native SVG canvas to fake lat/lng coords. */
export function unprojectMeters(
  xMeters: number,
  yMeters: number,
  origin: MapLatLng
): MapLatLng {
  const latRad = (origin.lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return {
    lat: origin.lat + (yMeters * 180) / (Math.PI * EARTH_RADIUS_M),
    lng: origin.lng + (xMeters * 180) / (Math.PI * EARTH_RADIUS_M * cosLat),
  };
}

export function projectPoint(point: MapLatLng, origin: MapLatLng) {
  return projectToMeters(point, origin);
}
