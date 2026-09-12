/**
 * Web map canvas — Leaflet + free CARTO/OSM raster tiles (no API key).
 * Custom polygon (tap vertices, double-tap to close) and rectangle
 * (press-drag) drawing. Metro only bundles this file on web; the native
 * build resolves MapCanvas.tsx instead.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors } from '../../theme/colors';
import {
  MapCanvasProps,
  MapCanvasApi,
  computeRegion,
  DrawMode,
} from './mapTypes';
import { MapLatLng } from '../../services/mapAnalysisService';

/** Cubbon Park, Bengaluru — an urban green reserve matching the app's story. */
const INITIAL_CENTER: [number, number] = [12.9716, 77.5946];
const INITIAL_ZOOM = 14;

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const REGION_STYLE: L.PathOptions = {
  color: colors.terracotta,
  weight: 2.5,
  fillColor: colors.forestGreen,
  fillOpacity: 0.26,
};

const DRAFT_STYLE: L.PathOptions = {
  color: colors.terracotta,
  weight: 2.5,
  dashArray: '8 8',
  fillColor: colors.forestGreen,
  fillOpacity: 0.16,
};

export const MapCanvas: React.FC<MapCanvasProps> = ({
  drawMode,
  region,
  onRegionComplete,
  onAnchorChange,
  registerApi,
}) => {
  const hostRef = useRef<any>(null); // DOM node of the host View
  const mapRef = useRef<L.Map | null>(null);
  const draftLayerRef = useRef<L.LayerGroup | null>(null);
  const regionLayerRef = useRef<L.LayerGroup | null>(null);

  // Live refs so Leaflet event handlers never read stale props
  const drawModeRef = useRef<DrawMode>(drawMode);
  const regionRef = useRef(region);
  const onRegionCompleteRef = useRef(onRegionComplete);
  const onAnchorChangeRef = useRef(onAnchorChange);

  const draftPointsRef = useRef<MapLatLng[]>([]);
  const rectStartRef = useRef<MapLatLng | null>(null);

  drawModeRef.current = drawMode;
  regionRef.current = region;
  onRegionCompleteRef.current = onRegionComplete;
  onAnchorChangeRef.current = onAnchorChange;

  /** Re-project the region centroid to container coords for the popup anchor. */
  const emitAnchor = () => {
    const reg = regionRef.current;
    if (!reg) {
      onAnchorChangeRef.current(null);
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const pt = map.latLngToContainerPoint([reg.centroid.lat, reg.centroid.lng]);
    onAnchorChangeRef.current({ x: pt.x, y: pt.y });
  };

  const clearDraft = () => {
    draftLayerRef.current?.clearLayers();
    draftPointsRef.current = [];
    rectStartRef.current = null;
  };

  const updateDraftPolygon = () => {
    const group = draftLayerRef.current;
    if (!group) return;
    group.clearLayers();
    const pts = draftPointsRef.current;
    const latlngs = pts.map((p) => [p.lat, p.lng] as [number, number]);

    if (latlngs.length >= 1) {
      L.polyline(latlngs, DRAFT_STYLE).addTo(group);
      if (latlngs.length >= 3) {
        L.polygon(latlngs, DRAFT_STYLE).addTo(group);
      }
    }
    // First vertex is a hollow ring — clicking it closes the polygon.
    pts.forEach((p, i) => {
      const isFirst = i === 0;
      L.circleMarker([p.lat, p.lng], {
        radius: isFirst ? 7 : 5,
        color: isFirst ? colors.terracotta : colors.creamSidebar,
        weight: 2,
        fillColor: isFirst ? colors.creamSidebar : colors.forestGreen,
        fillOpacity: 1,
      }).addTo(group);
    });
  };

  const updateDraftRect = (current: L.LatLng) => {
    const start = rectStartRef.current;
    const group = draftLayerRef.current;
    if (!start || !group) return;
    group.clearLayers();
    L.rectangle(
      L.latLngBounds([start.lat, start.lng], [current.lat, current.lng]),
      DRAFT_STYLE
    ).addTo(group);
  };

  const finishPolygon = (vertices: MapLatLng[]) => {
    const built = computeRegion(vertices);
    clearDraft();
    if (built) onRegionCompleteRef.current(built);
  };

  /* ---------------- Leaflet event handlers ---------------- */

  const onMapClick = (e: L.LeafletMouseEvent) => {
    if (drawModeRef.current !== 'polygon') return;
    const pts = draftPointsRef.current;

    // Clicking near the first vertex closes the polygon. (Native dblclick is
    // unreliable for this: the first click adds a vertex marker under the
    // cursor, so the second click hits a different element and browsers
    // never synthesize the dblclick event.)
    if (pts.length >= 3) {
      const map = mapRef.current;
      const first = map?.latLngToContainerPoint([pts[0].lat, pts[0].lng]);
      if (first) {
        const dist = Math.hypot(
          e.containerPoint.x - first.x,
          e.containerPoint.y - first.y
        );
        if (dist <= 15) {
          finishPolygon([...pts]);
          return;
        }
      }
    }

    pts.push({ lat: e.latlng.lat, lng: e.latlng.lng });
    updateDraftPolygon();
  };

  const onMapDblClick = () => {
    if (drawModeRef.current !== 'polygon') return;
    // The two click events that precede dblclick added duplicate vertices.
    if (draftPointsRef.current.length >= 2) draftPointsRef.current.pop();
    if (draftPointsRef.current.length >= 2) draftPointsRef.current.pop();
    if (draftPointsRef.current.length < 3) {
      updateDraftPolygon();
      return;
    }
    finishPolygon([...draftPointsRef.current]);
  };

  const onMouseDown = (e: L.LeafletMouseEvent) => {
    if (drawModeRef.current !== 'rect') return;
    rectStartRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
    updateDraftRect(e.latlng);
  };

  const onMouseMove = (e: L.LeafletMouseEvent) => {
    if (drawModeRef.current !== 'rect' || !rectStartRef.current) return;
    updateDraftRect(e.latlng);
  };

  const onMouseUp = (e: L.LeafletMouseEvent) => {
    if (drawModeRef.current !== 'rect' || !rectStartRef.current) return;
    const start = rectStartRef.current;
    rectStartRef.current = null;
    const end: MapLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
    finishPolygon([
      start,
      { lat: start.lat, lng: end.lng },
      end,
      { lat: end.lat, lng: start.lng },
    ]);
  };

  /* ---------------- Mount / unmount ---------------- */

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    host.appendChild(div);

    const map = L.map(div, {
      zoomControl: false,
      minZoom: 3,
      maxZoom: 19,
    });
    map.setView(INITIAL_CENTER, INITIAL_ZOOM);

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Warm parchment tint so the basemap sits inside the sage/cream theme.
    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter = 'sepia(0.14) saturate(0.85) brightness(1.02)';
    }

    draftLayerRef.current = L.layerGroup().addTo(map);
    regionLayerRef.current = L.layerGroup().addTo(map);

    map.attributionControl.setPosition('bottomleft');

    map.on('click', onMapClick);
    map.on('dblclick', onMapDblClick);
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('move zoom resize', emitAnchor);

    const raf = requestAnimationFrame(() => map.invalidateSize());
    const settleTimer = setTimeout(() => map.invalidateSize(), 300);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    mapRef.current = map;
    registerApi(apiRef.current);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
      draftLayerRef.current = null;
      regionLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Imperative API (toolbar) ---------------- */

  const apiRef = useRef<MapCanvasApi>({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    clearDrawing: () => {
      clearDraft();
      emitAnchor();
    },
  });

  /* ---------------- Prop-driven effects ---------------- */

  // Draw-mode toggling: reset drafts, tune map gestures, set crosshair
  useEffect(() => {
    clearDraft();
    const map = mapRef.current;
    if (!map) return;

    if (drawMode === 'rect') {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }

    if (drawMode === 'polygon') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }

    map.getContainer().style.cursor = drawMode ? 'crosshair' : '';
  }, [drawMode]);

  // Render the completed region overlay + keep the popup anchor fresh
  useEffect(() => {
    const group = regionLayerRef.current;
    if (!group) return;
    group.clearLayers();
    if (region) {
      const latlngs = region.vertices.map((v) => [v.lat, v.lng] as [number, number]);
      L.polygon(latlngs, REGION_STYLE).addTo(group);
      region.vertices.forEach((v) => {
        L.circleMarker([v.lat, v.lng], {
          radius: 3.5,
          color: colors.creamSidebar,
          weight: 1.5,
          fillColor: colors.forestDark,
          fillOpacity: 1,
        }).addTo(group);
      });
      L.circleMarker([region.centroid.lat, region.centroid.lng], {
        radius: 4,
        color: colors.white,
        weight: 2,
        fillColor: colors.terracotta,
        fillOpacity: 1,
      }).addTo(group);
    }
    emitAnchor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  return <View ref={hostRef} style={styles.host} />;
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
