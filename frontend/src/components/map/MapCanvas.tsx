/**
 * Native map canvas — stylized SVG stand-in for the Leaflet web map so the
 * draw → analyze flow also works in Expo Go / native builds without a tile
 * backend. Same MapCanvasProps contract as MapCanvas.web.tsx.
 *
 * Gestures: drag = pan, tap = add polygon vertex (double-tap closes),
 * rectangle mode = tap two opposite corners.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import Svg, { G, Path, Rect, Circle, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';
import {
  MapCanvasProps,
  MapCanvasApi,
  computeRegion,
  projectPoint,
  unprojectMeters,
  DrawMode,
} from './mapTypes';
import { MapLatLng } from '../../services/mapAnalysisService';

/** Base "world" of the stylized SVG map. */
const WORLD_W = 1000;
const WORLD_H = 750;
const METERS_PER_UNIT = 4.2;
/** Real-world origin at the center of the artwork (Cubbon Park, Bengaluru). */
const ORIGIN: MapLatLng = { lat: 12.9716, lng: 77.5946 };

interface BasePoint {
  u: number;
  v: number;
}

interface Viewport {
  scale: number;
  tx: number;
  ty: number;
}

const baseToLatLng = (p: BasePoint): MapLatLng =>
  unprojectMeters(
    (p.u - WORLD_W / 2) * METERS_PER_UNIT,
    (WORLD_H / 2 - p.v) * METERS_PER_UNIT,
    ORIGIN
  );

const latLngToBase = (p: MapLatLng): BasePoint => {
  const m = projectPoint(p, ORIGIN);
  return { u: WORLD_W / 2 + m.x / METERS_PER_UNIT, v: WORLD_H / 2 - m.y / METERS_PER_UNIT };
};

const REGION_FILL = colors.forestGreen;
const DRAFT_FILL = colors.forestGreen;

export const MapCanvas: React.FC<MapCanvasProps> = ({
  drawMode,
  region,
  onRegionComplete,
  onAnchorChange,
  registerApi,
}) => {
  const viewRef = useRef<Viewport>({ scale: 1, tx: 0, ty: 0 });
  const [view, setViewState] = useState<Viewport>(viewRef.current);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const canvasSizeRef = useRef(canvasSize);
  const viewInitializedRef = useRef(false);

  const draftRef = useRef<BasePoint[]>([]);
  const [draftPts, setDraftPts] = useState<BasePoint[]>([]);
  const rectCornerRef = useRef<BasePoint | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  // Live refs for gesture handlers
  const drawModeRef = useRef<DrawMode>(drawMode);
  const regionRef = useRef(region);
  const onRegionCompleteRef = useRef(onRegionComplete);
  const onAnchorChangeRef = useRef(onAnchorChange);
  drawModeRef.current = drawMode;
  regionRef.current = region;
  onRegionCompleteRef.current = onRegionComplete;
  onAnchorChangeRef.current = onAnchorChange;

  const setView = (next: Viewport) => {
    viewRef.current = next;
    setViewState(next);
  };

  const clearDraft = () => {
    draftRef.current = [];
    setDraftPts([]);
    rectCornerRef.current = null;
  };

  const pushDraftPoint = (p: BasePoint) => {
    draftRef.current = [...draftRef.current, p];
    setDraftPts(draftRef.current);
  };

  const finishPolygon = (vertices: MapLatLng[]) => {
    const built = computeRegion(vertices);
    clearDraft();
    if (built) onRegionCompleteRef.current(built);
  };

  /* ---------------- Tap / pan gestures ---------------- */

  const gestureRef = useRef({ sx: 0, sy: 0, startView: viewRef.current, moved: false });

  const handleTap = (x: number, y: number) => {
    const mode = drawModeRef.current;
    const v = viewRef.current;
    const base: BasePoint = { u: (x - v.tx) / v.scale, v: (y - v.ty) / v.scale };

    if (mode === 'polygon') {
      // Tapping the first vertex closes the polygon (mirrors the web canvas).
      const existing = draftRef.current;
      if (existing.length >= 3) {
        const first = existing[0];
        const scale = viewRef.current.scale;
        if (Math.hypot((base.u - first.u) * scale, (base.v - first.v) * scale) <= 22) {
          lastTapRef.current = null;
          finishPolygon(existing.map(baseToLatLng));
          return;
        }
      }

      const now = Date.now();
      const last = lastTapRef.current;
      const isDoubleTap =
        !!last && now - last.time < 320 && Math.hypot(x - last.x, y - last.y) < 26;

      if (isDoubleTap) {
        // The previous tap already added a vertex at this spot; drop it and close.
        lastTapRef.current = null;
        const pts = draftRef.current.slice(0, -1);
        if (pts.length >= 3) {
          draftRef.current = [];
          setDraftPts([]);
          finishPolygon(pts.map(baseToLatLng));
        } else {
          draftRef.current = pts;
          setDraftPts(pts);
        }
        return;
      }

      pushDraftPoint(base);
      lastTapRef.current = { time: now, x, y };
      return;
    }

    if (mode === 'rect') {
      const corner = rectCornerRef.current;
      if (!corner) {
        rectCornerRef.current = base;
        return;
      }
      rectCornerRef.current = null;
      finishPolygon([
        baseToLatLng(corner),
        baseToLatLng({ u: base.u, v: corner.v }),
        baseToLatLng(base),
        baseToLatLng({ u: corner.u, v: base.v }),
      ]);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        gestureRef.current = {
          sx: locationX,
          sy: locationY,
          startView: viewRef.current,
          moved: false,
        };
      },
      onPanResponderMove: (_evt, gesture) => {
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6) {
          gestureRef.current.moved = true;
        }
        // Pan freely except in rectangle mode, where taps pick corners.
        if (gestureRef.current.moved && drawModeRef.current !== 'rect') {
          const sv = gestureRef.current.startView;
          setView({ scale: sv.scale, tx: sv.tx + gesture.dx, ty: sv.ty + gesture.dy });
        }
      },
      onPanResponderRelease: (evt) => {
        if (gestureRef.current.moved) return;
        const { locationX, locationY } = evt.nativeEvent;
        handleTap(locationX, locationY);
      },
    })
  ).current;

  /* ---------------- Imperative API (toolbar) ---------------- */

  const zoomAt = (factor: number) => {
    const { w, h } = canvasSizeRef.current;
    if (w === 0) return;
    const v = viewRef.current;
    const nextScale = Math.min(4, Math.max(0.7, v.scale * factor));
    if (nextScale === v.scale) return;
    const cx = w / 2;
    const cy = h / 2;
    setView({
      scale: nextScale,
      tx: cx - ((cx - v.tx) * nextScale) / v.scale,
      ty: cy - ((cy - v.ty) * nextScale) / v.scale,
    });
  };

  const apiRef = useRef<MapCanvasApi>({
    zoomIn: () => zoomAt(1.25),
    zoomOut: () => zoomAt(0.8),
    clearDrawing: () => {
      clearDraft();
      emitAnchor();
    },
  });

  useEffect(() => {
    registerApi(apiRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Layout & anchor ---------------- */

  const emitAnchor = () => {
    const reg = regionRef.current;
    if (!reg) {
      onAnchorChangeRef.current(null);
      return;
    }
    const base = latLngToBase(reg.centroid);
    const v = viewRef.current;
    onAnchorChangeRef.current({ x: base.u * v.scale + v.tx, y: base.v * v.scale + v.ty });
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    canvasSizeRef.current = { w: width, h: height };
    setCanvasSize({ w: width, h: height });
    if (!viewInitializedRef.current && width > 0 && height > 0) {
      viewInitializedRef.current = true;
      const scale = Math.min(width / WORLD_W, height / WORLD_H) * 0.92;
      setView({
        scale,
        tx: (width - WORLD_W * scale) / 2,
        ty: (height - WORLD_H * scale) / 2,
      });
    }
  };

  // Keep the popup anchor synced to region + view changes
  useEffect(() => {
    emitAnchor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, view]);

  // Abort drafts when the mode changes
  useEffect(() => {
    clearDraft();
  }, [drawMode]);

  /* ---------------- Rendering helpers ---------------- */

  const regionBasePts = region ? region.vertices.map(latLngToBase) : [];
  const regionPathD =
    regionBasePts.length > 0
      ? `M ${regionBasePts[0].u} ${regionBasePts[0].v} ` +
        regionBasePts.slice(1).map((p) => `L ${p.u} ${p.v}`).join(' ') +
        ' Z'
      : '';

  const draftPathD =
    draftPts.length > 0
      ? `M ${draftPts[0].u} ${draftPts[0].v} ` +
        draftPts.slice(1).map((p) => `L ${p.u} ${p.v}`).join(' ') +
        (draftPts.length >= 3 ? ' Z' : '')
      : '';

  const rectCorner = rectCornerRef.current;
  const draftHasRect = !!rectCorner;

  const transform = `translate(${view.tx} ${view.ty}) scale(${view.scale})`;

  return (
    <View
      style={styles.host}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {canvasSize.w > 0 && (
        <Svg width={canvasSize.w} height={canvasSize.h}>
          <G transform={transform}>
            {/* -------- Stylized basemap artwork (base coords) -------- */}
            <Rect x={0} y={0} width={WORLD_W} height={WORLD_H} fill="#EAE5DB" />

            {/* City block fill */}
            <G fill="#E0DAD0" opacity={0.85}>
              <Rect x={40} y={40} width={90} height={70} rx={4} />
              <Rect x={170} y={180} width={70} height={90} rx={4} />
              <Rect x={770} y={40} width={110} height={80} rx={4} />
              <Rect x={840} y={200} width={80} height={110} rx={4} />
              <Rect x={60} y={520} width={100} height={90} rx={4} />
              <Rect x={200} y={620} width={80} height={80} rx={4} />
              <Rect x={820} y={580} width={90} height={100} rx={4} />
              <Rect x={730} y={420} width={90} height={70} rx={4} />
            </G>

            {/* Road grid */}
            <G stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" opacity={0.95}>
              <Path d={`M0 ${WORLD_H * 0.2} L${WORLD_W} ${WORLD_H * 0.2}`} />
              <Path d={`M0 ${WORLD_H * 0.42} L${WORLD_W} ${WORLD_H * 0.42}`} />
              <Path d={`M0 ${WORLD_H * 0.64} L${WORLD_W} ${WORLD_H * 0.64}`} />
              <Path d={`M0 ${WORLD_H * 0.82} L${WORLD_W} ${WORLD_H * 0.82}`} />
              <Path d={`M${WORLD_W * 0.18} 0 L${WORLD_W * 0.18} ${WORLD_H}`} />
              <Path d={`M${WORLD_W * 0.46} 0 L${WORLD_W * 0.46} ${WORLD_H}`} />
              <Path d={`M${WORLD_W * 0.72} 0 L${WORLD_W * 0.72} ${WORLD_H}`} />
              <Path d={`M${WORLD_W * 0.9} 0 L${WORLD_W * 0.9} ${WORLD_H}`} />
            </G>
            <G stroke="#FFFFFF" strokeWidth={13} strokeLinecap="round" opacity={0.9}>
              <Path d={`M60 ${WORLD_H - 40} L${WORLD_W - 60} 40`} />
            </G>

            {/* Central nature reserve */}
            <Path
              d="M500 120 C560 128, 640 160, 645 240 C650 315, 610 385, 545 420 C470 460, 390 445, 355 385 C315 320, 330 235, 380 180 C420 130, 460 114, 500 120 Z"
              fill="#9CC59A"
              stroke="#FFFFFF"
              strokeWidth={5}
            />
            <Path
              d="M500 150 C545 157, 610 185, 615 245 C620 305, 588 355, 540 385 C480 420, 415 408, 390 360 C362 308, 372 240, 410 195 C445 153, 468 145, 500 150 Z"
              fill="#A8D1A6"
            />
            {/* Lake */}
            <Path
              d="M560 235 C572 248, 580 278, 570 295 C560 310, 543 308, 539 291 C535 276, 545 256, 540 245 C537 233, 548 226, 560 235 Z"
              fill="#99CDE6"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
            {/* Trails */}
            <G stroke="#FBF8F2" strokeWidth={3} strokeDasharray="6 6" fill="none" opacity={0.9}>
              <Path d="M400 330 C440 310, 460 280, 495 285 C530 290, 550 330, 585 340" />
              <Path d="M470 180 C500 200, 515 240, 505 300" />
              <Path d="M420 250 C455 265, 520 260, 555 225" />
            </G>

            {/* Tree clusters */}
            <G fill="#8FBF8D">
              <Circle cx={420} cy={210} r={14} />
              <Circle cx={440} cy={225} r={12} />
              <Circle cx={600} cy={330} r={13} />
              <Circle cx={585} cy={345} r={11} />
              <Circle cx={450} cy={340} r={12} />
            </G>

            {/* Labels */}
            <SvgText
              x={500}
              y={395}
              fontSize={15}
              fontWeight="700"
              fill="#2E4A36"
              textAnchor="middle"
              fontStyle="italic"
            >
              Cubbon Park
            </SvgText>
            <SvgText x={230} y={320} fontSize={10} fill="#7A8F7F" transform="rotate(-4 230 320)">
              Kasturba Rd
            </SvgText>
            <SvgText x={770} y={505} fontSize={10} fill="#7A8F7F" transform="rotate(-4 770 505)">
              MG Road
            </SvgText>

            {/* -------- Draft rectangle preview (corner marker) -------- */}
            {draftHasRect && rectCorner && (
              <Circle
                cx={rectCorner.u}
                cy={rectCorner.v}
                r={6}
                fill="none"
                stroke={colors.terracotta}
                strokeWidth={3}
                strokeDasharray="4 4"
              />
            )}

            {/* -------- In-progress polygon draft -------- */}
            {draftPts.length > 0 && (
              <>
                <Path
                  d={draftPathD}
                  fill={draftPts.length >= 3 ? DRAFT_FILL : 'none'}
                  fillOpacity={0.18}
                  stroke={colors.terracotta}
                  strokeWidth={2.5}
                  strokeDasharray="8 8"
                />
                {draftPts.map((p, i) =>
                  i === 0 ? (
                    <Circle
                      key={i}
                      cx={p.u}
                      cy={p.v}
                      r={7}
                      fill={colors.creamSidebar}
                      stroke={colors.terracotta}
                      strokeWidth={2}
                    />
                  ) : (
                    <Circle
                      key={i}
                      cx={p.u}
                      cy={p.v}
                      r={5}
                      fill={colors.forestGreen}
                      stroke={colors.creamSidebar}
                      strokeWidth={2}
                    />
                  )
                )}
              </>
            )}

            {/* -------- Completed region -------- */}
            {regionPathD !== '' && (
              <>
                <Path
                  d={regionPathD}
                  fill={REGION_FILL}
                  fillOpacity={0.26}
                  stroke={colors.terracotta}
                  strokeWidth={2.5}
                />
                {regionBasePts.map((p, i) => (
                  <Circle
                    key={i}
                    cx={p.u}
                    cy={p.v}
                    r={3.5}
                    fill={colors.forestDark}
                    stroke={colors.creamSidebar}
                    strokeWidth={1.5}
                  />
                ))}
                {region && (
                  <Circle
                    cx={latLngToBase(region.centroid).u}
                    cy={latLngToBase(region.centroid).v}
                    r={4}
                    fill={colors.terracotta}
                    stroke={colors.white}
                    strokeWidth={2}
                  />
                )}
              </>
            )}
          </G>
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
