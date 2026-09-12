/**
 * Web map canvas — globe.gl (Three.js/WebGL) renders a free, key-less
 * NASA Blue Marble globe the user can orbit and zoom like Google Earth.
 *
 * Drawing works by ray-picking against the globe surface:
 *   · polygon mode — tap vertices on the globe, tap the hollow first
 *     vertex to close (screen-space proximity via getScreenCoords;
 *     native dblclick is unreliable for the same reason as before)
 *   · rectangle mode — press & drag a box; corners are projected with
 *     toGlobeCoords on every pointermove (orbiting is paused so the
 *     drag isn't eaten as a rotation gesture)
 *
 * The popup anchor is the region centroid re-projected with
 * getScreenCoords whenever the camera moves. Metro only bundles this
 * file on web; the native build resolves MapCanvas.tsx instead.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Globe, { GlobeInstance } from 'globe.gl';
import { colors } from '../../theme/colors';
import {
  MapCanvasProps,
  MapCanvasApi,
  computeRegion,
  DrawMode,
} from './mapTypes';
import { MapLatLng } from '../../services/mapAnalysisService';

/**
 * Cubbon Park, Bengaluru — home view. `altitude` is in globe-radius units
 * (0 = surface, ~1.6 = subcontinental view, 3+ = whole Earth).
 */
const HOME_POV = { lat: 12.9716, lng: 77.5946, altitude: 1.6 };
const MIN_ALTITUDE = 0.02;
const MAX_ALTITUDE = 3.2;

/** Free imagery shipped with the three-globe package (NASA Blue Marble, PD). */
const IMG_BASE = 'https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/';
const GLOBE_IMAGE = `${IMG_BASE}earth-blue-marble.jpg`;
const BUMP_IMAGE = `${IMG_BASE}earth-topology.png`;
const NIGHT_SKY_IMAGE = `${IMG_BASE}night-sky.png`;

/** Globe renderer keeps the globe radius at 100 three-units. */
const GLOBE_RADIUS = 100;
/** Close-polygon tap tolerance around the hollow first vertex (px). */
const CLOSE_TAP_PX = 16;
/** Minimum drag distance (px) before a rect gesture counts. */
const RECT_MIN_DRAG_PX = 6;

const FILL_REGION = 'rgba(78, 141, 102, 0.38)'; // forestGreen
const FILL_DRAFT = 'rgba(78, 141, 102, 0.22)';
const STROKE_COLOR = colors.terracotta;

// Marker spheres: altitude/radius are GLOBE-RADIUS FRACTIONS (three-globe
// convention: getCoords(lat, lng, altitude) → r = R * (1 + altitude)). Keep
// the altitude ~0 so markers sit on their surface anchors — at close zoom a
// 0.025 "altitude" is a 159 km lift that shifts the projected marker far
// from the point the user actually picked.
const POINT_ALTITUDE = 0.0005;
const FIRST_POINT_RADIUS = 0.5;
const CENTROID_POINT_RADIUS = 0.34;
const VERTEX_POINT_RADIUS = 0.24;
const DRAFT_VTX_POINT_RADIUS = 0.26;

type LayerPoint = {
  kind: 'first' | 'draftVtx' | 'vertex' | 'centroid';
  lat: number;
  lng: number;
};

type LayerPolygon = {
  kind: 'region' | 'draft' | 'rect';
  geometry: { type: 'Polygon'; coordinates: number[][][] };
};

const ring = (verts: MapLatLng[]) =>
  verts.map((v) => [v.lng, v.lat] as [number, number]);

export const MapCanvas: React.FC<MapCanvasProps> = ({
  drawMode,
  region,
  onRegionComplete,
  onAnchorChange,
  registerApi,
}) => {
  const hostRef = useRef<any>(null); // DOM node of the host View
  const globeRef = useRef<GlobeInstance | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live refs so globe event handlers never read stale props
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

  /** Rebuild the globe's draft + completed-region layers from current refs. */
  const renderLayers = () => {
    const globe = globeRef.current;
    if (!globe) return;

    const polys: LayerPolygon[] = [];
    const points: LayerPoint[] = [];

    const reg = regionRef.current;
    if (reg) {
      polys.push({
        kind: 'region',
        geometry: { type: 'Polygon', coordinates: [[...ring(reg.vertices), ring(reg.vertices)[0]]] },
      });
      reg.vertices.forEach((v) =>
        points.push({ kind: 'vertex', lat: v.lat, lng: v.lng })
      );
      points.push({ kind: 'centroid', lat: reg.centroid.lat, lng: reg.centroid.lng });
    }

    const pts = draftRef.current;
    if (pts.length >= 3) {
      polys.push({
        kind: 'draft',
        geometry: { type: 'Polygon', coordinates: [[...ring(pts), ring(pts)[0]]] },
      });
    }
    pts.forEach((p, i) =>
      points.push({ kind: i === 0 ? 'first' : 'draftVtx', lat: p.lat, lng: p.lng })
    );

    const rc = rectRef.current;
    if (rc?.active && rc.current) {
      const { start, current } = rc;
      const corners: MapLatLng[] = [
        start,
        { lat: start.lat, lng: current.lng },
        current,
        { lat: current.lat, lng: start.lng },
      ];
      polys.push({
        kind: 'rect',
        geometry: { type: 'Polygon', coordinates: [[...ring(corners), ring(corners)[0]]] },
      });
    }

    globe
      .polygonsData(polys as object[])
      .polygonCapColor((d: object) =>
        (d as LayerPolygon).kind === 'region' ? FILL_REGION : FILL_DRAFT
      )
      .polygonSideColor((d: object) =>
        (d as LayerPolygon).kind === 'region' ? FILL_REGION : FILL_DRAFT
      )
      .polygonStrokeColor(STROKE_COLOR)
      .pointsData(points as object[])
      .pointLat((d: object) => (d as LayerPoint).lat)
      .pointLng((d: object) => (d as LayerPoint).lng)
      .pointColor((d: object) => {
        switch ((d as LayerPoint).kind) {
          case 'first':
            return colors.creamSidebar; // hollow-ring stand-in: big cream sphere
          case 'centroid':
            return colors.white;
          case 'vertex':
            return colors.forestDark;
          default:
            return colors.terracotta;
        }
      })
      .pointRadius((d: object) => {
        switch ((d as LayerPoint).kind) {
          case 'first':
            return FIRST_POINT_RADIUS;
          case 'centroid':
            return CENTROID_POINT_RADIUS;
          case 'vertex':
            return VERTEX_POINT_RADIUS;
          default:
            return DRAFT_VTX_POINT_RADIUS;
        }
      })
      .pointAltitude(POINT_ALTITUDE);
  };

  /** Re-project the region centroid to container coords for the popup anchor. */
  const emitAnchor = () => {
    const globe = globeRef.current;
    const reg = regionRef.current;
    if (!globe || !reg) {
      lastAnchorRef.current = null;
      onAnchorChangeRef.current(null);
      return;
    }
    const s = globe.getScreenCoords(reg.centroid.lat, reg.centroid.lng, 0);
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
      const globe = globeRef.current;
      if (globe) {
        globe.pointOfView(
          { lat: built.centroid.lat, lng: built.centroid.lng, altitude: 0.08 },
          900
        );
      }
      onRegionCompleteRef.current(built);
    }
  };

  /* ---------------- Globe click (polygon vertices / rect fallback) ---------------- */

  const handleGlobeClick = (coords: { lat: number; lng: number }, event: MouseEvent) => {
    const globe = globeRef.current;
    const canvas = canvasRef.current;
    if (!globe || !canvas) return;
    const mode = drawModeRef.current;

    // Ignore clicks that ended an orbit drag (belt-and-braces: globe.gl
    // usually suppresses these, but a drag-release must never plant a vertex).
    const down = downPosRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    if (down && Math.hypot(canvasX - down.x, canvasY - down.y) > 8) {
      return;
    }

    // Rectangle fallback when toGlobeCoords is unavailable: two clicks pick
    // opposite corners. (The primary path is press-drag via pointer events.)
    if (mode === 'rect' && typeof globe.toGlobeCoords !== 'function') {
      const rc = rectRef.current;
      if (!rc?.active) {
        rectRef.current = {
          start: coords,
          current: coords,
          active: true,
          downPos: { x: 0, y: 0 },
        };
        renderLayers();
        return;
      }
      const { start } = rc;
      rectRef.current = null;
      finishPolygon([
        start,
        { lat: start.lat, lng: coords.lng },
        coords,
        { lat: coords.lat, lng: start.lng },
      ]);
      return;
    }

    if (mode !== 'polygon') return;

    // Recompute the pick ourselves: the coords globe.gl passes back can be a
    // stale cached intersection when the click ray first hits a filtered
    // object (vertex spheres / draft polygon caps). toGlobeCoords raycasts
    // for the globe specifically, so it is immune to that.
    const picked = globe.toGlobeCoords(canvasX, canvasY);
    const vertex: MapLatLng = picked ?? { lat: coords.lat, lng: coords.lng };

    const pts = draftRef.current;

    // Clicking the hollow first vertex closes the polygon. The marker is a
    // sphere of radius FIRST_POINT_RADIUS centred just above the surface, so
    // accept clicks anywhere on its visible silhouette: the base tap
    // tolerance plus the sphere's rendered radius at the current zoom.
    if (pts.length >= 3) {
      const anchorScreen = globe.getScreenCoords(pts[0].lat, pts[0].lng, 0);
      const topScreen = globe.getScreenCoords(
        pts[0].lat,
        pts[0].lng,
        POINT_ALTITUDE + FIRST_POINT_RADIUS / GLOBE_RADIUS
      );
      const renderedRadius = Math.hypot(
        topScreen.x - anchorScreen.x,
        topScreen.y - anchorScreen.y
      );
      const dist = Math.hypot(canvasX - anchorScreen.x, canvasY - anchorScreen.y);
      if (dist <= CLOSE_TAP_PX + renderedRadius) {
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
    if (!host || globeRef.current) return;

    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    host.appendChild(div);

    const size = host.getBoundingClientRect();

    let globe: GlobeInstance;
    try {
      globe = new Globe(div, { rendererConfig: { antialias: true } })
        .globeImageUrl(GLOBE_IMAGE)
        .bumpImageUrl(BUMP_IMAGE)
        .backgroundImageUrl(NIGHT_SKY_IMAGE)
        .showAtmosphere(true)
        .backgroundColor('rgba(0,0,0,0)')
        .width(Math.max(1, size.width))
        .height(Math.max(1, size.height))
        .polygonAltitude(0.012)
        .polygonsData([])
        .pointsData([])
        .pointLat((d: object) => (d as LayerPoint).lat)
        .pointLng((d: object) => (d as LayerPoint).lng)
        .pointColor(() => colors.terracotta)
        .pointRadius(0.3)
        .pointAltitude(POINT_ALTITUDE)
        // Drawing UX: vertex spheres and draft/region polygon caps must not
        // intercept clicks — otherwise a click on the hollow first vertex (or
        // anywhere inside a drawn polygon) dispatches onPointClick/onPolygonClick
        // instead of onGlobeClick and the polygon can never be closed.
        .pointerEventsFilter(
          (o) => (o as any).__globeObjType !== 'point' && (o as any).__globeObjType !== 'polygon'
        )
        .onGlobeClick(handleGlobeClick);
    } catch (err) {
      // WebGL unavailable — show a quiet note instead of crashing the page.
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
      div.style.color = colors.textMuted;
      div.style.fontSize = '14px';
      div.textContent = '3D globe requires WebGL — try a WebGL-capable browser.';
      return;
    }

    globeRef.current = globe;
    canvasRef.current = globe.renderer().domElement as HTMLCanvasElement;
    const canvas = canvasRef.current;

    const controls = globe.controls();
    controls.autoRotate = false;
    controls.enablePan = false;
    // Keep the camera between just-above-surface and a whole-Earth view.
    controls.minDistance = GLOBE_RADIUS * (1 + MIN_ALTITUDE);
    controls.maxDistance = GLOBE_RADIUS * (1 + MAX_ALTITUDE);
    controls.zoomSpeed = 0.55;
    controls.rotateSpeed = 0.65;

    globe.pointOfView(HOME_POV, 0);

    /* ----- pointer plumbing for press-drag rectangles + click guards ----- */

    const relPos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      downPosRef.current = relPos(e);
      if (drawModeRef.current !== 'rect') return;
      const p = downPosRef.current;
      const g = globe.toGlobeCoords(p.x, p.y);
      rectRef.current = {
        start: g ?? { lat: 0, lng: 0 },
        current: g ?? { lat: 0, lng: 0 },
        active: !!g,
        downPos: p,
      };
      if (g) renderLayers();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rc = rectRef.current;
      if (!rc?.active || drawModeRef.current !== 'rect') return;
      const p = relPos(e);
      const g = globe.toGlobeCoords(p.x, p.y);
      if (g) rc.current = { lat: g.lat, lng: g.lng };
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

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    /* ----- sizing + anchor freshness ----- */

    const ro = new ResizeObserver(() => {
      const r = host.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        globe.width(r.width).height(r.height);
      }
      emitAnchor();
    });
    ro.observe(host);

    // Re-anchor the popup while the camera glides (orbit/zoom transitions).
    const anchorTimer = window.setInterval(() => {
      if (regionRef.current) emitAnchor();
    }, 400);

    registerApi(apiRef.current);

    return () => {
      clearInterval(anchorTimer);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      globe._destructor();
      globeRef.current = null;
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Imperative API (toolbar) ---------------- */

  const zoomBy = (factor: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    const next = Math.min(MAX_ALTITUDE, Math.max(MIN_ALTITUDE, pov.altitude * factor));
    if (next === pov.altitude) return;
    globe.pointOfView({ ...pov, altitude: next }, 600);
    setTimeout(emitAnchor, 700);
  };

  const apiRef = useRef<MapCanvasApi>({
    zoomIn: () => zoomBy(0.7),
    zoomOut: () => zoomBy(1.45),
    resetView: () => {
      globeRef.current?.pointOfView(HOME_POV, 900);
      setTimeout(emitAnchor, 1000);
    },
    clearDrawing: () => {
      draftRef.current = [];
      rectRef.current = null;
      renderLayers();
      emitAnchor();
    },
  });

  /* ---------------- Prop-driven effects ---------------- */

  // Draw-mode toggling: reset drafts, pause orbiting while rect-dragging
  useEffect(() => {
    draftRef.current = [];
    rectRef.current = null;
    renderLayers();

    const globe = globeRef.current;
    if (!globe) return;
    globe.controls().enabled = drawMode !== 'rect';
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = drawMode ? 'crosshair' : 'grab';
    }
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
