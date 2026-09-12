# Sat AI — Spatial Analysis Backend

Serves the map XAI contract for the Map Dashboard globe.

## Layout

```
backend/
  shared/                 ← single source of truth, imported by BOTH sides
    mapApi.ts             Request/response types + REST path (the API contract)
    mockAnalysis.ts       Mock spatial-XAI generator (placeholder for the real model)
  src/
    index.ts              Express bootstrap (CORS + JSON, port 4000)
    config/
      firebaseAdmin.ts    firebase-admin bootstrap (service-account credentials)
    middleware/
      requireAuth.ts      Verifies `Authorization: Bearer <Firebase ID token>`
    routes/
      analyze.ts          POST /v1/map/analyze (auth-protected; validates, runs the mock)
```

## Auth

`POST /v1/map/analyze` requires a Firebase ID token (`Authorization: Bearer <idToken>`),
verified with firebase-admin. `GET /health` stays open.

- Credentials resolve in order: `SERVICE_ACCOUNT_PATH` →
  `GOOGLE_APPLICATION_CREDENTIALS` → `./credentials/service-account.json`
  (auto-detected when present) → ADC. Put the key there (see
  `frontend/docs/FIREBASE_SETUP.md`) or configure `backend/.env` (copy
  `.env.example`).
- Without credentials the route fails closed with **503**; `AUTH_DEV_MODE=1`
  skips verification for local development (loud warnings — never in production).
- 401 = missing/invalid/expired token.

The frontend (`frontend/src/services/mapAnalysisService.ts`) calls
`POST http://localhost:4000/v1/map/analyze`. If this server isn't running,
the frontend falls back to the **same** `mockAnalysis.ts` locally, so the
dashboard still works standalone.

## Run

```bash
npm install
npm run dev        # http://localhost:4000 (watch mode)
```

## API

### `GET /health`

```json
{ "ok": true, "service": "sat-ai-map-analysis" }
```

### `POST /v1/map/analyze`

```json
{
  "region": {
    "vertices": [{ "lat": 12.97, "lng": 77.59 }, "..."],
    "centroid": { "lat": 12.97, "lng": 77.6 },
    "areaSqm": 812345
  },
  "detailType": "vegetation",
  "dateRange": { "start": "2026-06-12", "end": "2026-09-12" }
}
```

`detailType` ∈ `land_use | vegetation | soil_carbon | biodiversity | water | climate`.
Returns a `MapAnalysisResult` (summary, confidence, metrics, explainability
factors, evidence) — see `shared/mapApi.ts`.

## Swapping in a real model

Replace `analyzeRegionLocally` in `shared/mockAnalysis.ts` (or the call to it
in `src/routes/analyze.ts`) with the geospatial inference pipeline. The
contract in `shared/mapApi.ts` is what the frontend renders — keep it stable
and the UI needs no changes.
