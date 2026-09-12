# IMPLEMENTATION_PLAN — Eco Map Dashboard (3D Globe + Draw + Explainable-AI)

This document describes the complete map-dashboard feature of the SIH2026
app: an interactive Google-Earth-style 3D globe with real multi-resolution
satellite imagery, rectangle/polygon region drawing, a hovering analysis
popup, and an explainable-AI result flow. It is written so that another AI
(or developer) can implement the feature from scratch, or modify the
existing implementation, without rediscovering the pitfalls.

**Status: fully implemented and smoke-tested.** The plan below matches the
working code in `frontend/src/components/map/` and `frontend/scripts/`.

---

## 1. Requirements

| # | Requirement |
|---|-------------|
| R1 | Full-screen map dashboard page, theme: sage / cream / terracotta |
| R2 | Interactive **3D globe** (like Google Earth) — drag to orbit/rotate, scroll to zoom |
| R3 | **Real tile pyramid**: zooming in loads ever-finer satellite imagery (z1→z22), never a blurred enlargement |
| R4 | **Free API, no API key** |
| R5 | Draw tools: polygon (tap vertices, tap hollow first vertex to close) and rectangle (press-drag) |
| R6 | After drawing, a **hovering popup** near the region asks: land-detail type + date duration → "Go — Explain this region" |
| R7 | "Go" expands the popup into an **explainable-AI analysis** (metrics, top model inputs with weights, evidence, confidence) |
| R8 | "Ask in Chat" hands a prefilled query to the chat page |
| R9 | Top bar: "Go to Chat View" (left), title pill (center), profile button (right); vertical tool cluster bottom-right (draw, zoom, reset, clear); credit pill bottom-left; status hint bottom-center |
| R10 | Works on web (primary target) and native (fallback canvas — see §5.5) |
| R11 | Page is auth-gated: only reachable when `useAuthStore().status === 'authenticated'` |
| R12 | **Search bar** top-center (replaces the title pill): free-text place search plus raw lat/lng parsing; selecting a result makes the camera glide there and zoom in smoothly |

---

## 2. Tech decisions (and why)

| Choice | Decision | Rationale |
|--------|----------|-----------|
| Map engine | **MapLibre GL JS v6** (`maplibre-gl@^6.9.0`), `globe` projection | Free (BSD-3), no API key, first-class 3D globe + sky/atmosphere support, real XYZ raster tile pyramid |
| Imagery | **Google Satellite** (`mt1-3.google.com/vt/lyrs=s` XYZ tiles, maxzoom 22) | Free, keyless, and the only probe-verified deep source: real imagery through **z22** everywhere tested in India. Esri was the original source but returns "Map data not yet available" placeholder tiles beyond z18–19 in India despite advertising LOD 23; z23 on Google returns 400, so the source is capped at 22. (Google's `/vt/` endpoint is undocumented — fine for a demo; swap for an official API if this ships commercially.) |
| Rejected: globe.gl | — | Single-wrapped-texture globe → pixels just blur when zoomed; no tile LOD (this was the bug that motivated the rewrite) |
| Rejected: Cesium | — | Heavy, and its imagery defaults need an Ion token |
| Sky | MapLibre `setSky` with dark space colors + atmosphere blend | Google-Earth-like dark space rim around the sphere |
| Worker | Copied `maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs` into `public/maplibre/` via npm `postinstall` script | See §6.3 — the worker is an ES module with a relative import, which Metro's asset URLs cannot host |
| Native | Stylized SVG stand-in (`MapCanvas.tsx`) sharing the same props contract | Draw→analyze flow works in Expo Go without a tile backend |

Metro resolves `./MapCanvas` to `MapCanvas.web.tsx` on web and `MapCanvas.tsx`
elsewhere (Expo's standard platform extensions — no config needed).

**Before choosing any tile provider, probe it** — curl a handful of tiles at
z17–z22 for the regions you care about and check the response: ArcGIS-style
services answer missing tiles with a small placeholder JPEG (identical byte
size across locations = placeholder), while a real tile varies in size and is
clearly imagery. Choose the `maxzoom` from the probe, not from the service
metadata.

---

## 3. Dependencies to add

In `frontend/package.json`:

```jsonc
"dependencies": {
  "maplibre-gl": "^6.9.0",
  "@maplibre/maplibre-gl-style-spec": "^26.4.2"   // types only (SkySpecification, StyleSpecification)
},
"scripts": {
  "postinstall": "node scripts/sync-maplibre-worker.js"
}
```

Dev dependency already present for verification: `playwright-core` (uses the
system Edge — no browser download).

Also create `frontend/expo-env.d.ts` if missing (required so TS accepts
`import 'maplibre-gl/dist/maplibre-gl.css'`):

```ts
/// <reference types="expo/types" />
```

---

## 4. File map

```
frontend/
├── package.json                     # deps + postinstall script
├── expo-env.d.ts                    # enables *.css module declaration
├── scripts/
│   └── sync-maplibre-worker.js      # copies worker chunks → public/maplibre/
├── public/maplibre/                 # generated: worker + shared chunks
└── src/
    ├── services/mapAnalysisService.ts   # MapRegion/MapLatLng types, analyzeMapRegion (mock + backend-ready)
    ├── services/geocodeService.ts       # Nominatim place search + coordinate parsing (free, no API key)
    ├── theme/colors.ts              # sage/cream/terracotta palette (already exists)
    └── components/map/
        ├── mapTypes.ts              # SHARED CONTRACTS: DrawMode, MapCanvasApi, MapCanvasProps, computeRegion
        ├── MapCanvas.web.tsx        # ★ MapLibre globe implementation (web)
        ├── MapCanvas.tsx            # SVG fallback (native)
        ├── MapToolbar.tsx           # vertical tool cluster
        ├── MapSearchBar.tsx         # top-center search bar (geocode + coordinate flight)
        ├── AnalysisPopup.tsx        # form → loading → XAI result popup
        └── MapDashboardPage.tsx     # page shell: top bar, frame, canvas, overlays
```

---

## 5. Implementation steps

### 5.1 `mapTypes.ts` — the shared contract (do this first)

Everything hangs off these types; both canvases and the page implement them.

```ts
export type DrawMode = 'polygon' | 'rect' | null;

export interface ContainerPoint { x: number; y: number }

export interface MapCanvasApi {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView?: () => void;
  clearDrawing: () => void;
  flyToLocation: (target: MapLatLng, zoom: number) => void; // search flight
}

export interface MapCanvasProps {
  drawMode: DrawMode;
  region: MapRegion | null;              // completed region, owned by the PAGE
  onRegionComplete: (region: MapRegion) => void;
  onAnchorChange: (anchor: ContainerPoint | null) => void;  // popup anchor, container-space
  registerApi: (api: MapCanvasApi) => void;
}
```

Also export `computeRegion(vertices): MapRegion | null` — polygon area via
shoelace formula and area-weighted centroid on an **equirectangular local
projection** (origin = first vertex, `x = Δlng·R·cos(lat₀)`, `y = Δlat·R`),
returning `{ vertices, centroid, areaSqm }` (reject area < 1 m²). Both
canvases use this so the popup/analysis payloads are identical.

`MapLatLng`/`MapRegion` come from `services/mapAnalysisService.ts`
(`{ lat, lng }` and `{ vertices, centroid, areaSqm }`).

### 5.2 `mapAnalysisService.ts` — analysis API (backend-ready mock)

- Export `DETAIL_TYPE_OPTIONS` (e.g. Vegetation Health, Water Stress, Soil Quality, Land Use Change), `MapDetailType`, `MapDateRange`, `MapAnalysisResult` (`{ summary, metrics[], factors[{label, weight, impact, rationale}], evidence[], confidence, modelNote }`).
- `analyzeMapRegion({ region, detailType, dateRange }): Promise<MapAnalysisResult>` — tries the backend (`http://localhost:4000`), falls back to a deterministic local mock on failure. Keeps the popup working offline but lets the backend own the real model later.

### 5.3 `scripts/sync-maplibre-worker.js` + `public/maplibre/`

MapLibre's web worker ships as an **ES module that imports a sibling chunk**
(`import ... from "./maplibre-gl-shared.mjs"`), so it must live at a real URL
where the relative import resolves. Metro query-string asset URLs can't host
it. Expo serves `public/` at the site root on web, which fixes the relative
import. Copy both chunks:

```js
// scripts/sync-maplibre-worker.js
const fs = require('fs');
const path = require('path');
const srcDir = path.resolve(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist');
const outDir = path.resolve(__dirname, '..', 'public', 'maplibre');
const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
fs.mkdirSync(outDir, { recursive: true });
for (const file of files) {
  const src = path.join(srcDir, file);
  if (!fs.existsSync(src)) { console.error(`[sync-maplibre-worker] missing ${src}`); process.exit(1); }
  fs.copyFileSync(src, path.join(outDir, file));
  console.log(`[sync-maplibre-worker] ${file} -> public/maplibre/${file}`);
}
```

Wire it as the `postinstall` script so fresh installs always sync.

### 5.4 `MapCanvas.web.tsx` — the globe (core file)

**Imports.** maplibre v6 is ESM-only with **no default export**; type-only
`SkySpecification`/`StyleSpecification` come from the style-spec package.
Import the CSS for the control classes.

```ts
import { Map as MapLibreMap, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl';
import type { SkySpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(new URL('/maplibre/maplibre-gl-worker.mjs', window.location.origin).href);
```

**Constants.**

```ts
const HOME = { center: [77.5946, 12.9716] as [number, number], zoom: 3.6 };  // Cubbon Park, Bengaluru
const MIN_ZOOM = 1;
// Google's keyless satellite endpoint serves real tiles through z22
// (probed across Indian cities + rural areas); z23 returns 400, so cap
// here to never show blank/placeholder tiles.
const MAX_ZOOM = 22;
const CLOSE_TAP_PX = 16;              // close-polygon tap tolerance around the hollow first vertex
const RECT_MIN_DRAG_PX = 6;
const FIRST_POINT_CIRCLE_RADIUS = 7;  // keep in sync with the circle paint radius
const FLY_TO_REGION_ZOOM = 11.5;      // camera zoom after a region is drawn
const FILL_COLOR = '#4E8D66';         // forestGreen
const STROKE_COLOR = colors.terracotta;
```

**Style.** Two sources: the satellite raster pyramid and a `geojson` draw
source; layers: dark `background`, `satellite` raster, `draw-fill` /
`draw-line` / `draw-points` (circle markers per feature `kind`: `first` =
hollow 7px cream circle with terracotta stroke, `centroid` = 5px white,
`vertex` = 4px forestDark, `draftVtx` = 4px terracotta).

```ts
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
    { id: 'satellite', type: 'raster', source: 'google-sat', paint: { 'raster-fade-duration': 200 } },
    { id: 'draw-fill', type: 'fill', source: 'draw', paint: { 'fill-color': FILL_COLOR,
      'fill-opacity': ['match', ['get', 'kind'], 'region', 0.38, 0.2] } },
    { id: 'draw-line', type: 'line', source: 'draw', paint: { 'line-color': STROKE_COLOR, 'line-width': 2 } },
    { id: 'draw-points', type: 'circle', source: 'draw', paint: { /* radius/color match by 'kind', see constants above */ } },
  ],
};

const SKY = {
  'sky-color': '#0b1626',
  'horizon-color': '#27466e',
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 1, 0.9, 6, 0.35, 18, 0.1],
} as SkySpecification;
```

**Map lifecycle (CRITICAL — the #1 gotcha).** In v6, **both
`setProjection` and `setSky` throw `"Style is not done loading."`** until the
async style load finishes, and `MapOptions` has **no `projection` field**.
An uncaught throw here silently kills everything downstream (no click
listeners, no API registration → dead drawing). The working pattern:

```ts
const applyGlobeLook = () => {
  if (disposed || !map) return;
  map.setProjection({ type: 'globe' });
  map.setSky(SKY);
};
// ...after map construction:
map = new MapLibreMap({
  container: host,
  style: MAP_STYLE,
  center: HOME.center, zoom: HOME.zoom,
  minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM,
  attributionControl: false, maplibreLogo: false,
  canvasContextAttributes: { alpha: false },   // see "sky gap" below
});
try { applyGlobeLook(); } catch { /* style still loading — re-applied below */ }
map.once('style.load', applyGlobeLook);  // as soon as style JSON is parsed
map.once('load', applyGlobeLook);        // guaranteed after first render
```

Wrap map construction in a rAF-based size-wait loop (the host View lays out
just after mount; retry until `getBoundingClientRect()` ≥ 2px), and in a
try/catch that shows a "3D globe requires WebGL" note if WebGL is missing.

**Sky gap fallback (gotcha #2).** Software GL (headless browsers,
screenshots, some low-end GPUs) may never paint the sky backdrop pass — the
canvas stays transparent outside the sphere silhouette, showing the page
background as a light void. Two-part mitigation, already in place:
`canvasContextAttributes: { alpha: false }` above, and the page sets the
canvas wrapper background to dark space (`backgroundColor: '#04070d'` in
`MapDashboardPage.tsx`'s `canvasWrap`). On real GPUs the sky paints and
neither matters.

**Drawing — polygon.** `map.on('click', ...)` plants vertices from
`e.lngLat` into a draft array (only when `drawMode === 'polygon'`). To close:
when ≥3 vertices exist, `map.project([pts[0].lng, pts[0].lat])` and close if
the click is within `CLOSE_TAP_PX + FIRST_POINT_CIRCLE_RADIUS` px of that
screen point. Guard with a pointerdown/up movement threshold (>8px = drag
release, never plant).

**Drawing — rectangle.** Press-drag on the host element with pointer
events; corners come from `map.unproject([p.x, p.y])` on every move (pass a
**tuple** — maplibre's `PointLike` rejects plain `{x, y}` objects in TS).
On pointerup, if dragged ≥ `RECT_MIN_DRAG_PX`, build the 4-corner ring and
finish.

**Finishing.** Build the `MapRegion` via `computeRegion`, clear drafts,
re-render the draw source, then Google-Earth-style ease down:

```ts
map.flyTo({ center: [centroid.lng, centroid.lat], zoom: FLY_TO_REGION_ZOOM, duration: 900 });
onRegionComplete(built);
```

**Search flights.** The search bar hands the page a
`{ lat, lng, zoom, label }` target, which the page forwards to this API
method — same deep-arc flight, but duration is auto-scaled by MapLibre from
the distance:

```ts
flyToLocation: (target: MapLatLng, zoom: number) => {
  const map = mapRef.current;
  if (!map) return;
  map.flyTo({
    center: [target.lng, target.lat],
    zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)),
    curve: 1.5, // > 1.42 = deeper Google-Earth-style arc
  });
  setTimeout(emitAnchor, 2500); // popup anchor after the camera settles
},
```

Also expose a dev-only handle for smoke-test camera assertions (skip in
production builds):

```ts
if (process.env.NODE_ENV !== 'production') (window as any).__mlMap = map;
// cleanup: if ((window as any).__mlMap === map) delete (window as any).__mlMap;
```

**Gesture conflicts (gotcha #3).** In `rect` mode disable
`map.dragPan` / `map.dragRotate` / `map.boxZoom` (the pointer drag would be
eaten as a gesture); in **any** draw mode disable `map.doubleClickZoom`
(polygon vertex taps land ~200 ms apart = double-click to the zoom handler).
Set the canvas cursor to `crosshair` while drawing, `grab` otherwise.
Re-enable everything when the mode clears.

**Popup anchoring.** `emitAnchor()` = `map.project([centroid.lng,
centroid.lat])` → `onAnchorChange({x, y})` (container-space px), throttled to
≥1px movement, re-emitted on `map.on('move')`, `map.on('resize')`, a
`ResizeObserver` on the host (`map.resize()` + emit), and ~400 ms after
toolbar zoom/reset calls (camera ease is async).

**Draw-source rendering.** One `renderLayers()` rebuilds the GeoJSON
FeatureCollection from (completed region + polygon draft + rect preview) and
`source.setData(...)`; polygon rings are closed before they go in.

**Cleanup.** On unmount: `map.off(...)` all handlers, remove pointer
listeners, disconnect the observer, cancel the rAF, `map.remove()`.
Use refs (`drawModeRef`, `regionRef`, callback refs) so handlers never read
stale props.

### 5.5 `MapCanvas.tsx` — native SVG fallback

Same `MapCanvasProps` contract; a stylized 1000×750 SVG "city park" artwork
(Cubbon Park, Bengaluru) with pan/zoom (PanResponder) and the same
tap-vertices / double-tap-close / two-corner-rect drawing, using the same
`computeRegion`/`unprojectMeters` from `mapTypes.ts`. Anchoring mirrors the
web canvas (viewport transform applied to the centroid). Keep this file in
sync contract-wise, not visually.

### 5.6 `MapToolbar.tsx`

Vertical `position: absolute` cluster, `right: 18, bottom: 22`, `zIndex: 30`,
cream pill background. Buttons (each with an `accessibilityLabel` — the smoke
test depends on them): `Draw polygon`, `Draw rectangle`, `Clear region`
(only when a region exists), divider, `Zoom in`, `Zoom out`, `Reset view`,
divider, `Data layers` + `Locate me` (disabled "soon" placeholders). Active
button = forestGreen fill; icons via `react-native-svg`.

### 5.7 `AnalysisPopup.tsx`

`position: absolute` card (width 360, clamped inside the container),
anchored by `anchor` + `containerSize` with smart flip/clamping (right of
anchor, flip left on overflow, clamp to 10px margins, `top = anchor.y - 44`
clamped). Three stages:

1. **form** — region meta (formatted area + vertex count), LAND DETAIL chip
   grid (from `DETAIL_TYPE_OPTIONS`), DATE DURATION presets (Last 3 mo / 6 mo
   / year / custom with two `YYYY-MM-DD` inputs), error line, "Go — Explain
   this region" button. Validation: detail type required; custom dates valid
   and `end ≥ start`.
2. **loading** — `ActivityIndicator` + rotating status messages (~750 ms).
3. **result** — "Analysis ready" badge + confidence pill, summary, KEY
   METRICS grid, **"EXPLAINABILITY — TOP MODEL INPUTS"** factor list
   (impact dot + label + weight% + bar + rationale), EVIDENCE chips, model
   note, footer: terracotta **"Ask in Chat"** + "New analysis".

`Ask in Chat` builds the prefill:
`Explain the <label> analysis of my selected <area> map region (model
confidence <pct>%).` → `onAskInChat(query)` → page calls
`useChatStore().setInputValue(query)` + `setCurrentPage('chat')`.
Measured-layout trick: render at opacity 0 until `onLayout` reports a real
height (prevents a size-0 jump).

### 5.8 `MapDashboardPage.tsx` — composition

- `SafeAreaView` (sage bg) → top bar (chat link left / centered title pill /
  profile right) → bezel `frame` (cream, 12px padding, radius 26) →
  `canvasWrap` (**`position: relative`, `overflow: hidden`, radius 18,
  `backgroundColor: '#04070d'`**).
- Inside `canvasWrap`: `<MapCanvas … />` (testID `map-canvas-host`), then
  `MapToolbar`, credit pill (bottom-left, `pointerEvents="none"`; text:
  "Imagery: Google Satellite · Globe: MapLibre GL"), status hint pill
  (bottom-center), and `{region && anchor && <AnalysisPopup …/>}`.
- `canvasWrap.onLayout` records `canvasSize` → passed to the popup for
  clamping.
- Page state: `drawMode`, `region`, `anchor`. `handleRegionComplete` sets
  region + clears mode; `handleClearRegion` calls `clearDrawing()` + resets
  all three.
- Status hint text per state (idle: "Drag to orbit the globe · scroll to
  zoom"; polygon: tap-vertices instructions; rect: press-drag instructions;
  done: "Region selected — describe what to explain").
- Route: the landing page's `EcoMapPreviewCard` sets `currentPage` to the
  map page; all navigation remains gated by `useAuthStore().status ===
  'authenticated'` (this is the real Firebase auth status — do not gate on
  chatStore flags).

### 5.9 `MapSearchBar.tsx` + `geocodeService.ts` — location search (no API key)

The search bar sits top-center in the top bar (desktop) or in its own row
under the top bar (mobile), where the title pill used to be.

**Geocoding — free and key-less.** `geocodeService.ts` wraps OpenStreetMap
**Nominatim** (`https://nominatim.openstreetmap.org/search?format=jsonv2
&limit=6&addressdetails=0&accept-language=en&q=…`). Browser CORS works, no
key, fair-use limit ~1 req/sec. `searchPlaces(query, signal)` maps results
to `PlaceSuggestion { title, subtitle, badge, lat, lng, zoom }`, where
`zoom` comes from a Nominatim-type table (country 6 … administrative 10 …
city 11 … house 16, default 13). To switch to a keyed provider (Google /
Mapbox / …), only `searchPlaces()` changes — map that provider's JSON to
`PlaceSuggestion[]`.

**Coordinates are parsed locally** (`parseCoordinates`): `12.9716,
77.5946` · `12.97°N 77.59°E` · `12.97N 77.59E` · `lat: …, lng: …` — no
network round-trip; the flight zoom is a fixed `COORDINATE_ZOOM = 15`.

**Component behavior:**
- 450 ms debounce + `AbortController` per keystroke (stays under the
  Nominatim rate limit; a coordinate query never hits the network).
- Dropdown: coordinate fast-path row, up to 6 suggestion rows (title =
  first display_name segment, subtitle = the rest, type badge), loading
  row, no-results/error row, "Geocoding by OpenStreetMap Nominatim"
  footer. ArrowUp/Down + Enter + Escape keyboard support; closes on any
  outside mousedown — NOT on input blur, which would unmount a row before
  its click registers.
- Selecting a result calls `onSelectLocation({ lat, lng, zoom, label })`;
  the page forwards it to `canvasApi.flyToLocation()` (see §5.4 "Search
  flights"). The popup anchor stays live through `map.on('move')`.
- The native SVG canvas implements the same method with a 1.2 s
  easeInOutCubic viewport glide (web zoom levels mapped onto the artwork's
  scale range: z12 ≈ home view, z18 ≈ max), cancelled by a user gesture.
- Dev builds expose `window.__mlMap` (the MapLibre map instance) so smoke
  tests can assert camera state; removed in production builds.

---

## 6. Pitfall compendium (read before debugging)

| # | Symptom | Cause | Fix |
|---|---------|-------|-----|
| 1 | Page error `Error: Style is not done loading.` then drawing is dead | `setProjection`/`setSky` called before async style load | try/catch + re-apply on `once('style.load')` and `once('load')` (§5.4) |
| 2 | `Cannot find namespace 'GeoJSON'` | `@types/geojson` is UMD — global not visible in modules | drop the annotation, let inference work |
| 3 | TS error: `{x,y}` not assignable to `PointLike` | maplibre `PointLike = Point \| [number, number]` | pass tuples: `map.unproject([x, y])` |
| 4 | Worker fails to load / console 404 on worker chunk | worker imports sibling `.mjs`; Metro asset URLs can't serve it | `public/maplibre/` + postinstall sync + `setWorkerUrl` (§5.3, §5.4) |
| 5 | Light void outside the globe sphere | sky backdrop pass doesn't paint on software GL | `alpha: false` context + dark `#04070d` wrap background (§5.4, §5.8) |
| 6 | `MapOptions` has no `projection` / no default export | v6 API | `setProjection({type:'globe'})` post-construction; named imports only |
| 7 | Rect drag orbits the globe instead of drawing | gesture handlers eat the pointer drag | disable dragPan/dragRotate/boxZoom in rect mode (§5.4) |
| 8 | Polygon vertex taps zoom the map | taps ~200 ms apart = double-click | disable `doubleClickZoom` during any draw mode |
| 9 | `Cannot find module '*.css'` | missing expo types reference | add `expo-env.d.ts` with `/// <reference types="expo/types" />` |
| 10 | Stale module errors after changing deps | Metro caches | kill dev server, start fresh `expo start --web --port 8081` |
| 11 | Tiles show "Map data not yet available" at deep zoom | the provider has no imagery there (ArcGIS-style services return a placeholder tile, not a 404) | probe the provider with curl before committing (see §2); pick a source with verified deep coverage and set its `maxzoom` from the probe |
| 12 | Nominatim 429 / flaky geocoding | fair-use limit ~1 req/sec (and server-side calls need a User-Agent) | debounce 450 ms + `AbortController` per keystroke; from a browser UA/Referer are automatic |
| 13 | Dropdown closes before a row click registers | closing on input blur unmounts the row mid-click | close on outside mousedown + Escape only, never on blur |
| 14 | Smoke asserts the search zoom too early | `flyTo` eases the zoom after the center arrives | wait for `map.isMoving() === false` before reading `getZoom()` |

---

## 7. Verification

### 7.1 Static

```
cd frontend && npm run typecheck     # tsc --noEmit, must be clean
```

### 7.2 Browser smoke test

Infrastructure (in `.expo/smoke-map.cjs`, gitignored): `playwright-core` with
the **system Edge** (`chromium.launch({ channel: 'msedge', headless: true,
args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })`) — the
swiftshader flags give headless a software WebGL2, without which there is no
WebGL at all. Backend must run on :4000 (`cd backend && npm run dev`) so a
passing analysis step proves the API path (the frontend otherwise silently
falls back to its mock).

The test flow (all steps must pass):

1. Load `http://localhost:8081` → "Get Started" → auth modal
2. Sign in as `smoke-test@sih2026.test` (real Firebase; account exists — the
   first submit 400s with EMAIL_EXISTS, then the script switches to login)
3. "Open Map Dashboard" → "Go to Chat View" visible; canvas mounts (wait ~4 s
   for tiles/first render)
4. "Draw rectangle" → wait ~600 ms (effect commit) → drag on canvas →
   "Spatial Analysis" popup appears → close
5. "Draw polygon" → tap 4 vertices → tap hollow first vertex → popup appears
6. Popup: pick Vegetation Health → "Go" → result shows "EXPLAINABILITY — TOP
   MODEL INPUTS" → "Ask in Chat" → chat input contains the prefilled
   "Explain the Vegetation Health analysis of my selected …" query
7. Search: type "New Delhi" → Enter → wait until `window.__mlMap` has
   stopped moving AND is centered within 1.5° of Delhi → assert the settled
   zoom is 10–12 (Nominatim type-mapped); type "12.9716, 77.5946" → Enter →
   assert center ≈ Bengaluru coords at settled zoom 15, and that NO
   Nominatim request fired for the coordinate query

**Deep-zoom check** (see §7.3): wheel-zoom the canvas until z22 tile requests
are observed — every zoom level must serve `200 image/jpeg` with real sizes;
no 400/404/placeholder tiles; no requests beyond z22.

**Known-benign console noise — do not fail on:**
- `400` on signup = expected EMAIL_EXISTS from step 2
- `Invalid DOM property … transform-origin` React warning (pre-existing)
- tile `ERR_ABORTED` reqfailures during `flyTo` (mid-flight cancels)
- anything referencing `=` as a stray text node in `ContactSection.tsx` —
  that was a one-character typo, now fixed; if it reappears, check for a
  literal character sitting directly inside a `<View>` JSX tag

### 7.3 Deep-zoom / pixel verification (optional, for headless environments)

Drive the zoom with `page.mouse.wheel(0, -800)` over the canvas center
(observed ≈ 0.9 zoom per event) until z22 tile responses appear, and assert
on the network level: monitor responses matching `google.com/vt` and check
per-zoom counts, `content-type: image/jpeg`, and `content-length` sizes
(real tiles vary 2–25 KB; a fixed tiny size = placeholder). Screenshots can
also be checked programmatically (the Read tool may not render them): load
the PNG with `System.Drawing` (PowerShell `GetPixel`) and assert satellite
palette pixels (ocean blues, tan/green land), terracotta drawing strokes, and
that the region outside the sphere reads `#04070D` (dark), never cream
`#E8E3D8`.

---

## 8. Deferred feature — intro animation (NOT yet implemented)

Planned for the next iteration; implement after the map itself is stable:

> On opening the map dashboard, animate the globe: Earth spins until India is
> centered, then zooms to the user's GPS location if granted, else stops at
> the India view.

Approach sketch for MapLibre (untested — validate against v6 docs):

1. Use `map.flyTo` (or `easeTo` + `rotateTo`) with `bearing`/`center` keyframed
   — an initial bearing far from India, then animate `center → India` while
   `bearing → 0`.
2. Geolocation: `navigator.geolocation.getCurrentPosition` (behind a user
   permission prompt); on success chain a second `flyTo({ center: [lng, lat],
   zoom: ~13 })`; on denial/timeout stop at `HOME`.
3. Ensure the animation ends with the normal interactive state (gestures
   re-enabled) and that `onAnchorChange` re-fires after the flight so an
   existing region's popup stays put.

---

## 9. Definition of done

- [ ] `npm run typecheck` clean
- [ ] Full smoke test (`ok: true`) with backend on :4000
- [ ] Zooming from globe view (z≈3.6) to street level (z22) continuously
      loads sharper satellite tiles (no blurring, no placeholders)
- [ ] Globe drag orbits/rotates; scroll zooms; no page errors
- [ ] Rect + polygon drawing both produce the popup; popup clamps inside the
      canvas; XAI result renders; Ask-in-Chat prefills correctly
- [ ] Globe exterior shows dark space in all environments (including
      headless/software-GL)
- [ ] Native fallback (`MapCanvas.tsx`) still typechecks and honors the same
      contract
- [ ] Search bar geocodes places (Nominatim) and parses raw coordinates;
      selecting a result flies the camera with a smooth arc and lands at the
      type-mapped zoom (coords → 15)
