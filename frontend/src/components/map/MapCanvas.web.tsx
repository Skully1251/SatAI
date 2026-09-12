/**
 * Web map canvas — MapLibre GL renders a free, key-less satellite globe
 * (Google Satellite tiles in the 'globe' projection). Tiles are a real
 * XYZ pyramid, so zooming swaps in ever-finer imagery exactly like Google
 * Earth (unlike the previous globe.gl approach, where a single texture
 * just blurred when enlarged).
 *
 * Drawing:
 *   · polygon mode — click vertices on the map; click the hollow first
 *     vertex to close (screen-space proximity via map.project)
 *   · rectangle mode — press & drag a box; corners are unprojected on every
 *     pointermove (globe rotation/panning is paused so the drag isn't eaten
 *     as a gesture)
 *
 * The popup anchor is the region centroid re-projected with map.project
 * whenever the camera moves. Metro only bundles this file on web; the
 * native build resolves MapCanvas.tsx instead.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import type {
  SkySpecification,
  StyleSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import 'maplibre-gl/dist/maplibre-gl.css';
import { colors } from '../../theme/colors';
import {
  MapCanvasProps,
  MapCanvasApi,
  computeRegion,
  DrawMode,
} from './mapTypes';
import { MapLatLng } from '../../services/mapAnalysisService';

// MapLibre's web worker ships as an ES module that imports a sibling chunk
// (./maplibre-gl-shared.mjs), so it must be served from a real URL where that
// relative import resolves — Metro's query-string asset URLs can't host it.
// Expo serves public/ at the site root on web; scripts/sync-maplibre-worker.js
// (npm postinstall) copies both chunks into public/maplibre/. Same-origin
// worker URLs skip MapLibre's blob wrapper entirely (new Worker(url, module)).
setWorkerUrl(new URL('/maplibre/maplibre-gl-worker.mjs', window.location.origin).href);

/** Cubbon Park, Bengaluru — home view over India. */
const HOME = { center: [77.5946, 12.9716] as [number, number], zoom: 3.6 };
const MIN_ZOOM = 1;
// Google's keyless satellite endpoint serves real tiles through z22
// (probed across Indian cities + rural areas); z23 returns 400, so cap
// here to never show blank/placeholder tiles.
const MAX_ZOOM = 22;
/** Close-polygon tap tolerance around the hollow first vertex (px). */
const CLOSE_TAP_PX = 16;
/** Minimum drag distance (px) before a rect gesture counts. */
const RECT_MIN_DRAG_PX = 6;
/** Rendered radius of the hollow first-vertex marker (keep in sync with the circle paint). */
const FIRST_POINT_CIRCLE_RADIUS = 7;
/** Camera zoom after a region is drawn (Google-Earth-style ease-down). */
const FLY_TO_REGION_ZOOM = 11.5;

const FILL_COLOR = '#4E8D66'; // forestGreen
const STROKE_COLOR = colors.terracotta;

/** Free Google Satellite raster pyramid + dark background + drawing layers.
 *  (Esri World Imagery was the original source but returns "Map data not
 *  yet available" placeholder tiles beyond z18–19 in India; Google's
 *  keyless endpoint serves real imagery through z22.) */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'google-sat': {
      type: 'raster',
      tiles: [
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      maxzoom: 22,
      attribution: 'Google',
    },
    draw: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#04070d' } },
    {
      id: 'satellite',
      type: 'raster',
      source: 'google-sat',
      paint: { 'raster-fade-duration': 200 },
    },
    {
      id: 'draw-fill',
      type: 'fill',
      source: 'draw',
      paint: {
        'fill-color': FILL_COLOR,
        'fill-opacity': ['match', ['get', 'kind'], 'region', 0.38, 0.2],
      },
    },
    {
      id: 'draw-line',
      type: 'line',
      source: 'draw',
      paint: { 'line-color': STROKE_COLOR, 'line-width': 2 },
    },
    {
      id: 'draw-points',
      type: 'circle',
      source: 'draw',
      paint: {
        'circle-radius': [
          'match', ['get', 'kind'],
          'first', FIRST_POINT_CIRCLE_RADIUS,
          'centroid', 5,
          4,
        ],
        'circle-color': [
          'match', ['get', 'kind'],
          'first', colors.creamSidebar,
          'centroid', colors.white,
          'vertex', colors.forestDark,
          colors.terracotta,
        ],
        'circle-stroke-width': ['match', ['get', 'kind'], 'first', 2.5, 0],
        'circle-stroke-color': STROKE_COLOR,
      },
    },
  ],
};

/** Google-Earth-style dark space + atmosphere rim around the globe. */
const SKY = {
  'sky-color': '#0b1626',
  'horizon-color': '#27466e',
  // Full halo on the globe view, fading as the camera drops to street level.
  'atmosphere-blend': [
    'interpolate', ['linear'], ['zoom'],
    1, 0.9,
    6, 0.35,
    18, 0.1,
  ],
} as SkySpecification;

type DrawFeature =
  | { kind: 'region' | 'draft' | 'rect'; ring: [number, number][] }
  | { kind: 'first' | 'vertex' | 'draftVtx' | 'centroid'; lat: number; lng: number };

const ring = (verts: MapLatLng[]) =>
  verts.map((v) => [v.lng, v.lat] as [number, number]);

/** Assemble the draw-source FeatureCollection (rings get closed here). */
const buildDrawData = (features: DrawFeature[]) => ({
  type: 'FeatureCollection',
  features: features.map((f) =>
    'lat' in f
      ? {
          type: 'Feature',
          properties: { kind: f.kind },
          geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
        }
      : {
          type: 'Feature',
          properties: { kind: f.kind },
          geometry: { type: 'Polygon', coordinates: [[...f.ring, f.ring[0]]] },
        }
  ),
});

export const MapCanvas: React.FC<MapCanvasProps> = ({
  drawMode,
  region,
  onRegionComplete,
  onAnchorChange,
  registerApi,
}) => {
  const hostRef = useRef<any>(null); // DOM node of the host View (map container)
  const mapRef = useRef<MapLibreMap | null>(null);

  // Live refs so map event handlers never read stale props
  const drawModeRef = useRef<DrawMode>(drawMode);
  const regionRef = useRef(region);
  const onRegionCompleteRef = useRef(onRegionComplete);
  const onAnchorChangeRef = useRef(onAnchorChange);

  const draftRef = useRef<MapLatLng[]>([]);
  const rectRef = useRef<{
    start: MapLatLng;
    current: MapLatLng;
    active: boolean;
    downPos: { x: number; y: number };
  } | null>(null);
  const downPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastAnchorRef = useRef<{ x: number; y: number } | null>(null);

  drawModeRef.current = drawMode;
  regionRef.current = region;
  onRegionCompleteRef.current = onRegionComplete;
  onAnchorChangeRef.current = onAnchorChange;

  /** Rebuild the draw source: completed region + in-progress drafts. */
  const renderLayers = () => {
    const source = mapRef.current?.getSource('draw') as GeoJSONSource | undefined;
    if (!source) return;

    const features: DrawFeature[] = [];

    const reg = regionRef.current;
    if (reg) {
      features.push({ kind: 'region', ring: ring(reg.vertices) });
      reg.vertices.forEach((v) =>
        features.push({ kind: 'vertex', lat: v.lat, lng: v.lng })
      );
      features.push({ kind: 'centroid', lat: reg.centroid.lat, lng: reg.centroid.lng });
    }

    const pts = draftRef.current;
    if (pts.length >= 3) {
      features.push({ kind: 'draft', ring: ring(pts) });
    }
    pts.forEach((p, i) =>
      features.push({ kind: i === 0 ? 'first' : 'draftVtx', lat: p.lat, lng: p.lng })
    );

    const rc = rectRef.current;
    if (rc?.active && rc.current) {
      const { start, current } = rc;
      features.push({
        kind: 'rect',
        ring: [
          [start.lng, start.lat],
          [current.lng, start.lat],
          [current.lng, current.lat],
          [start.lng, current.lat],
        ],
      });
    }

    source.setData(buildDrawData(features));
  };

  /** Re-project the region centroid to container coords for the popup anchor. */
  const emitAnchor = () => {
    const map = mapRef.current;
    const reg = regionRef.current;
    if (!map || !reg) {
      lastAnchorRef.current = null;
      onAnchorChangeRef.current(null);
      return;
    }
    const s = map.project([reg.centroid.lng, reg.centroid.lat]);
    const last = lastAnchorRef.current;
    if (last && Math.abs(last.x - s.x) < 1 && Math.abs(last.y - s.y) < 1) return;
    lastAnchorRef.current = { x: s.x, y: s.y };
    onAnchorChangeRef.current({ x: s.x, y: s.y });
  };

  const finishPolygon = (vertices: MapLatLng[]) => {
    const built = computeRegion(vertices);
    draftRef.current = [];
    rectRef.current = null;
    renderLayers();
    if (built) {
      // Google-Earth-style: ease the camera down onto the drawn region.
      mapRef.current?.flyTo({
        center: [built.centroid.lng, built.centroid.lat],
        zoom: FLY_TO_REGION_ZOOM,
        duration: 900,
      });
      onRegionCompleteRef.current(built);
    }
  };

  /* ---------------- Map click (polygon vertices) ---------------- */

  const handleMapClick = (e: MapLayerMouseEvent) => {
    const map = mapRef.current;
    if (!map) return;
    const mode = drawModeRef.current;

    // Ignore clicks that ended a drag (belt-and-braces: maplibre already
    // suppresses these, but a drag-release must never plant a vertex).
    const down = downPosRef.current;
    if (down && Math.hypot(e.point.x - down.x, e.point.y - down.y) > 8) {
      return;
    }

    if (mode !== 'polygon') return;

    const pts = draftRef.current;
    const vertex: MapLatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };

    // Clicking the hollow first vertex closes the polygon. The marker is a
    // constant-pixel circle, so the tolerance is a fixed px radius.
    if (pts.length >= 3) {
      const anchorScreen = map.project([pts[0].lng, pts[0].lat]);
      const dist = Math.hypot(e.point.x - anchorScreen.x, e.point.y - anchorScreen.y);
      if (dist <= CLOSE_TAP_PX + FIRST_POINT_CIRCLE_RADIUS) {
        finishPolygon([...pts]);
        return;
      }
    }

    draftRef.current = [...pts, vertex];
    renderLayers();
  };

  /* ---------------- Mount / unmount ---------------- */

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    let disposed = false;
    let rafId = 0;
    let ro: ResizeObserver | null = null;
    let map: MapLibreMap | null = null;

    // In v6 both setProjection and setSky are style-level: they throw
    // "Style is not done loading" until the async style load finishes.
    // Apply defensively up front and re-apply once the style is ready.
    const applyGlobeLook = () => {
      if (disposed || !map) return;
      map.setProjection({ type: 'globe' });
      map.setSky(SKY);
    };

    const relPos = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    /* ----- pointer plumbing for press-drag rectangles + click guards ----- */

    const onPointerDown = (e: PointerEvent) => {
      const p = relPos(e);
      downPosRef.current = p;
      if (drawModeRef.current !== 'rect' || !map) return;
      e.preventDefault();
      const g = map.unproject([p.x, p.y]);
      rectRef.current = {
        start: { lat: g.lat, lng: g.lng },
        current: { lat: g.lat, lng: g.lng },
        active: true,
        downPos: p,
      };
      renderLayers();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rc = rectRef.current;
      if (!rc?.active || drawModeRef.current !== 'rect' || !map) return;
      const p = relPos(e);
      const g = map.unproject([p.x, p.y]);
      rc.current = { lat: g.lat, lng: g.lng };
      renderLayers();
    };

    const onPointerUp = (e: PointerEvent) => {
      const rc = rectRef.current;
      if (!rc?.active || drawModeRef.current !== 'rect') return;
      const p = relPos(e);
      const moved = Math.hypot(p.x - rc.downPos.x, p.y - rc.downPos.y);
      rectRef.current = null;
      if (moved >= RECT_MIN_DRAG_PX) {
        const { start, current } = rc;
        finishPolygon([
          start,
          { lat: start.lat, lng: current.lng },
          current,
          { lat: current.lat, lng: start.lng },
        ]);
      } else {
        renderLayers(); // too short to count — clear the stray preview
      }
    };

    const attempt = () => {
      if (disposed) return;
      const size = host.getBoundingClientRect();
      if (size.width < 2 || size.height < 2) {
        // canvasWrap lays out just after mount; retry until it has a size.
        rafId = requestAnimationFrame(attempt);
        return;
      }

      try {
        map = new MapLibreMap({
          container: host,
          style: MAP_STYLE,
          center: HOME.center,
          zoom: HOME.zoom,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          attributionControl: false,
          maplibreLogo: false,
          // Opaque context: if the sky backdrop pass doesn't paint (software
          // GL, screenshots, etc.), the space outside the globe reads black
          // instead of showing the page background through a transparent canvas.
          canvasContextAttributes: { alpha: false },
        });
      } catch (err) {
        // WebGL unavailable — show a quiet note instead of crashing the page.
        host.style.display = 'flex';
        host.style.alignItems = 'center';
        host.style.justifyContent = 'center';
        host.style.color = colors.textMuted;
        host.style.fontSize = '14px';
        host.textContent = '3D globe requires WebGL — try a WebGL-capable browser.';
        return;
      }

      mapRef.current = map;
      // Dev-only handle so smoke tests can assert camera state after flights.
      if (process.env.NODE_ENV !== 'production') {
        (window as any).__mlMap = map;
      }
      try {
        applyGlobeLook();
      } catch {
        /* style still loading — the once-listeners below re-apply */
      }
      // style.load fires as soon as the style JSON is parsed (avoids a
      // mercator flash); load is guaranteed after the first render.
      map.once('style.load', applyGlobeLook);
      map.once('load', applyGlobeLook);

      // Click → polygon vertices (maplibre suppresses clicks that end drags).
      map.on('click', handleMapClick);
      // Re-anchor the popup while the camera glides (orbit/zoom transitions).
      map.on('move', emitAnchor);
      map.on('resize', emitAnchor);

      host.addEventListener('pointerdown', onPointerDown);
      host.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      ro = new ResizeObserver(() => {
        map?.resize();
        emitAnchor();
      });
      ro.observe(host);

      registerApi(apiRef.current);
    };

    rafId = requestAnimationFrame(attempt);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (!map) return;
      map.off('click', handleMapClick);
      map.off('move', emitAnchor);
      map.off('resize', emitAnchor);
      if ((window as any).__mlMap === map) delete (window as any).__mlMap;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Imperative API (toolbar) ---------------- */

  const apiRef = useRef<MapCanvasApi>({
    zoomIn: () => {
      const map = mapRef.current;
      if (!map) return;
      map.easeTo({ zoom: Math.min(MAX_ZOOM, map.getZoom() + 0.55), duration: 350 });
      setTimeout(emitAnchor, 400);
    },
    zoomOut: () => {
      const map = mapRef.current;
      if (!map) return;
      map.easeTo({ zoom: Math.max(MIN_ZOOM, map.getZoom() - 0.55), duration: 350 });
      setTimeout(emitAnchor, 400);
    },
    resetView: () => {
      mapRef.current?.flyTo({ center: HOME.center, zoom: HOME.zoom, duration: 900 });
      setTimeout(emitAnchor, 1000);
    },
    clearDrawing: () => {
      draftRef.current = [];
      rectRef.current = null;
      renderLayers();
      emitAnchor();
    },
    flyToLocation: (target: MapLatLng, zoom: number) => {
      const map = mapRef.current;
      if (!map) return;
      // Deep arc (curve > 1.42) for the Google-Earth feel; duration is
      // auto-scaled by MapLibre from the flight distance.
      map.flyTo({
        center: [target.lng, target.lat],
        zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)),
        curve: 1.5,
      });
      setTimeout(emitAnchor, 2500); // popup anchor after the camera settles
    },
  });

  /* ---------------- Prop-driven effects ---------------- */

  // Draw-mode toggling: reset drafts, pause globe gestures that conflict with
  // the pointer drag (rect) or double-tap vertex planting (polygon).
  useEffect(() => {
    draftRef.current = [];
    rectRef.current = null;
    renderLayers();

    const map = mapRef.current;
    if (!map) return;
    if (drawMode === 'rect') {
      map.dragPan.disable();
      map.dragRotate.disable();
      map.boxZoom.disable();
    } else if (drawMode === 'polygon') {
      map.dragPan.enable();
      map.dragRotate.enable();
      map.boxZoom.enable();
    } else {
      map.dragPan.enable();
      map.dragRotate.enable();
      map.boxZoom.enable();
    }
    // Vertex taps land ~200 ms apart, which reads as a double-click to the
    // zoom handler — disable it while any draw mode is active.
    if (drawMode) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
    const canvas = map.getCanvas();
    if (canvas) canvas.style.cursor = drawMode ? 'crosshair' : 'grab';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMode]);

  // Render the completed region overlay + keep the popup anchor fresh
  useEffect(() => {
    renderLayers();
    emitAnchor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  return <View ref={hostRef} style={styles.host} testID="map-canvas-host" />;
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
