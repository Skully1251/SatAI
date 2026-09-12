/**
 * Spatial XAI analysis routes.
 *
 * POST /v1/map/analyze — validate a MapAnalysisRequest and return a
 * MapAnalysisResult. Currently served by the shared mock generator;
 * swap analyzeRegionLocally for the real inference pipeline when it lands.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  MAP_ANALYSIS_PATH,
  MAP_DETAIL_TYPES,
  MapAnalysisRequest,
  MapDetailType,
} from '../../shared/mapApi';
import { analyzeRegionLocally, MOCK_LATENCY_MS } from '../../shared/mockAnalysis';
import { requireAuth } from '../middleware/requireAuth';

export const analyzeRouter = Router();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Liveness probe so the frontend (and ops) can check the service quickly. */
analyzeRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'sat-ai-map-analysis' });
});

analyzeRouter.post(MAP_ANALYSIS_PATH, requireAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Partial<MapAnalysisRequest>;

  // ---- Light validation: reject malformed regions/dates before the model ----
  const detailType = body.detailType as MapDetailType | undefined;
  if (!detailType || !(MAP_DETAIL_TYPES as readonly string[]).includes(detailType)) {
    res.status(400).json({ error: 'detailType must be one of: ' + MAP_DETAIL_TYPES.join(', ') });
    return;
  }

  const region = body.region;
  if (
    !region ||
    !Array.isArray(region.vertices) ||
    region.vertices.length < 3 ||
    !region.centroid ||
    typeof region.areaSqm !== 'number'
  ) {
    res.status(400).json({ error: 'region must be a closed polygon with >= 3 vertices, a centroid, and areaSqm' });
    return;
  }

  const dateRange = body.dateRange;
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (
    !dateRange ||
    !isoDate.test(dateRange.start) ||
    !isoDate.test(dateRange.end) ||
    dateRange.end < dateRange.start
  ) {
    res.status(400).json({ error: 'dateRange needs ISO start/end with end >= start' });
    return;
  }

  // Simulate inference latency, then serve the (mock) explainable result.
  await sleep(MOCK_LATENCY_MS);
  res.json(analyzeRegionLocally(body as MapAnalysisRequest));
});
