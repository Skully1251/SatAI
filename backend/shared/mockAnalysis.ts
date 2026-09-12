/**
 * Mock spatial-XAI generator — the "model" the backend currently serves.
 *
 * Produces deterministic-ish, detail-type-specific explainable results so the
 * whole draw → analyze → explain flow can be demoed before a real geospatial
 * inference pipeline lands. Both the Express server (/backend/src) and the
 * frontend's offline fallback run this exact generator.
 */
import {
  AnalysisMetric,
  ExplanationFactor,
  MapAnalysisRequest,
  MapAnalysisResult,
  MapDetailType,
} from './mapApi';

/** Simulated inference + explainability post-processing latency. */
export const MOCK_LATENCY_MS = 1400;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const round1 = (n: number) => Math.round(n * 10) / 10;

const fmtArea = (areaSqm: number) =>
  areaSqm >= 1_000_000
    ? `${round1(areaSqm / 1_000_000)} km²`
    : areaSqm >= 10_000
      ? `${round1(areaSqm / 10_000)} ha`
      : `${Math.round(areaSqm)} m²`;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', year: 'numeric' });
};

interface DetailTemplate {
  summary: (ctx: { area: string; span: string }) => string;
  metrics: (ctx: { area: string; span: string }) => AnalysisMetric[];
  factors: ExplanationFactor[];
  evidence: string[];
}

const TEMPLATES: Record<MapDetailType, DetailTemplate> = {
  land_use: {
    summary: ({ area, span }) =>
      `The ${area} selection is classified as a mixed-use eco-transition zone. Spectral clustering over ${span} shows a 61% natural / semi-natural share, with settlement creep advancing ~1.1%/yr along the eastern edge. Zoning policy overlap suggests the parcel qualifies for conservation buffering.`,
    metrics: ({ area }) => [
      { label: 'Dominant class', value: 'Open scrubland', delta: '+4.2% cover' },
      { label: 'Natural share', value: `${Math.round(rand(58, 66))}%` },
      { label: 'Parcels detected', value: `${Math.round(rand(9, 28))}`, delta: '+3 vs prior' },
      { label: 'Surface temp Δ', value: `+${round1(rand(1.1, 2.6))}°C` },
    ],
    factors: [
      { label: 'Spectral signature', weight: 34, impact: 'positive', rationale: 'Multi-band reflectance clusters to scrubland & grassland endmembers.' },
      { label: 'Parcel registry', weight: 26, impact: 'neutral', rationale: 'Cadastral boundaries align with 74% of detected field edges.' },
      { label: 'Urban proximity', weight: 22, impact: 'negative', rationale: 'Built-up distance under 400 m drives the transition risk score.' },
      { label: 'Canopy density', weight: 18, impact: 'positive', rationale: 'Riparian tree rows raise naturalness along drainage lines.' },
    ],
    evidence: ['Sentinel-2 L2A (10 m)', 'OpenStreetMap landuse', 'Local cadastral registry'],
  },
  vegetation: {
    summary: ({ span }) =>
      `Vegetation health is stable-to-improving across the selection. NDVI trended +0.08 over ${span} with a spring phenology peak 12 days earlier than the decadal mean — consistent with warmer winters and adequate soil moisture.`,
    metrics: ({ area }) => [
      { label: 'Mean NDVI', value: `${round1(rand(0.58, 0.72))}`, delta: '+0.08' },
      { label: 'EVI trend', value: `+${round1(rand(0.4, 1.1))}%/yr` },
      { label: 'Canopy cover', value: `${Math.round(rand(28, 44))}%` },
      { label: 'Stress pixels', value: `${Math.round(rand(3, 11))}%` },
    ],
    factors: [
      { label: 'Red-edge reflectance', weight: 38, impact: 'positive', rationale: 'Strong chlorophyll absorption signals photosynthetically active cover.' },
      { label: 'Soil moisture proxy', weight: 27, impact: 'positive', rationale: 'Radar backscatter indicates adequate root-zone water.' },
      { label: 'Surface temperature', weight: 20, impact: 'negative', rationale: 'Elevated midday LST on 6% of pixels suppresses vigor.' },
      { label: 'Phenology phase', weight: 15, impact: 'neutral', rationale: 'Early green-up shifts the seasonal baseline window.' },
    ],
    evidence: ['Sentinel-2 NDVI/EVI series', 'MODIS MCD12Q2 phenology', 'Sentinel-1 soil moisture'],
  },
  soil_carbon: {
    summary: ({ span }) =>
      `Estimated topsoil organic carbon stock is in the upper regional quartile. Sequestration potential is high where scrubland is transitioning to woodland, though gentle slopes in the south-west show moderate erosion risk during monsoon peaks.`,
    metrics: ({ area }) => [
      { label: 'SOC stock', value: `${Math.round(rand(48, 78))} tC/ha` },
      { label: 'Seq. potential', value: `+${round1(rand(1.2, 2.8))} tC/ha/yr` },
      { label: 'Erosion risk', value: 'Moderate', delta: 'SW sector' },
      { label: 'Soil moisture', value: `${Math.round(rand(22, 38))}%` },
    ],
    factors: [
      { label: 'Organic matter index', weight: 36, impact: 'positive', rationale: 'High litter cover correlates with stable carbon fractions.' },
      { label: 'Slope & aspect', weight: 28, impact: 'negative', rationale: 'SW-facing gradients concentrate runoff energy.' },
      { label: 'Vegetation density', weight: 22, impact: 'positive', rationale: 'Root biomass stabilises aggregates and slows mineralisation.' },
      { label: 'Rainfall intensity', weight: 14, impact: 'negative', rationale: 'Monsoon peaks exceed infiltration capacity ~9 days/yr.' },
    ],
    evidence: ['SoilGrids 250m SOC', 'SRTM 30m DEM', 'CHIRPS rainfall', 'Sentinel-1 moisture'],
  },
  biodiversity: {
    summary: ({ span }) =>
      `Habitat connectivity within the selection is above the district median, driven by tree-lined corridors. Estimated species richness suggests the area acts as a stepping stone for avifauna; edge density from trail fragmentation is the main pressure over ${span}.`,
    metrics: ({ area }) => [
      { label: 'HSI score', value: `${round1(rand(0.62, 0.8))} / 1.0` },
      { label: 'Est. bird species', value: `${Math.round(rand(34, 68))}` },
      { label: 'Edge density', value: `${Math.round(rand(48, 90))} m/ha` },
      { label: 'Connectivity', value: `${Math.round(rand(58, 76))}%` },
    ],
    factors: [
      { label: 'Habitat suitability', weight: 40, impact: 'positive', rationale: 'Structural diversity (layers, water, clearings) scores highly.' },
      { label: 'Corridor continuity', weight: 25, impact: 'positive', rationale: 'Canopy gaps < 80 m keep gene flow plausible.' },
      { label: 'Fragmentation edge', weight: 20, impact: 'negative', rationale: 'Trail network raises predator exposure at margins.' },
      { label: 'Water availability', weight: 15, impact: 'positive', rationale: 'Perennial pond within 600 m extends dry-season carrying capacity.' },
    ],
    evidence: ['Sentinel-2 habitat layers', 'eBird observation grid', 'OpenStreetMap trails'],
  },
  water: {
    summary: ({ span }) =>
      `Hydrological analysis indicates a rain-fed regime with a surface runoff coefficient of ~0.38. Retention capacity is limited by impervious edges, but the central depression shows strong groundwater recharge potential if seasonal flow is slowed.`,
    metrics: ({ area }) => [
      { label: 'Runoff coeff.', value: `${round1(rand(0.3, 0.46))}` },
      { label: 'Recharge potential', value: `${Math.round(rand(140, 260))} mm/yr` },
      { label: 'Surface water', value: `${round1(rand(1.2, 4.8))}%` },
      { label: 'Flood risk', value: 'Low–Moderate', delta: 'monsoon' },
    ],
    factors: [
      { label: 'Impervious share', weight: 33, impact: 'negative', rationale: 'Hard surfaces bypass infiltration and concentrate flow.' },
      { label: 'Topographic wetness', weight: 27, impact: 'positive', rationale: 'Convergent terrain accumulates subsurface moisture.' },
      { label: 'Soil permeability', weight: 24, impact: 'positive', rationale: 'Sandy-loam fractions support fast vertical drainage.' },
      { label: 'Rainfall anomaly', weight: 16, impact: 'neutral', rationale: `${round1(rand(-6, 4))}% deviation from 10-yr mean.` },
    ],
    evidence: ['Sentinel-1 flood mapping', 'SRTM flow accumulation', 'CHIRPS rainfall', 'IMD gauge data'],
  },
  climate: {
    summary: ({ span }) =>
      `The selection runs +1.6°C warmer than its rural surroundings at midday — a persistent surface heat anomaly. Rainfall over ${span} tracked ${Math.round(rand(-9, -3))}% below the decadal mean, extending dry-season stress days.`,
    metrics: ({ area }) => [
      { label: 'LST anomaly', value: `+${round1(rand(1.3, 2.4))}°C` },
      { label: 'Rainfall Δ', value: `${Math.round(rand(-9, -3))}%` },
      { label: 'Heat days >35°C', value: `${Math.round(rand(18, 42))}` },
      { label: 'Albedo', value: `${round1(rand(0.14, 0.22))}` },
    ],
    factors: [
      { label: 'Land surface temp', weight: 37, impact: 'negative', rationale: 'Daytime thermal band dominates the anomaly signature.' },
      { label: 'Albedo', weight: 24, impact: 'positive', rationale: 'Bare-soil patches reflect more shortwave radiation.' },
      { label: 'Canopy shading', weight: 22, impact: 'positive', rationale: 'Tree cover cools sub-canopy by ~3°C at noon.' },
      { label: 'Moisture deficit', weight: 17, impact: 'negative', rationale: 'Reduced evapotranspiration suppresses latent-heat cooling.' },
    ],
    evidence: ['Landsat 9 thermal band', 'MODIS LST 8-day', 'CHIRPS rainfall', 'ERA5 reanalysis'],
  },
};

/**
 * Pure mock inference — no latency, no I/O. Callers add their own delay
 * (see MOCK_LATENCY_MS) so server and offline fallback behave the same.
 */
export const analyzeRegionLocally = (request: MapAnalysisRequest): MapAnalysisResult => {
  const template = TEMPLATES[request.detailType];
  const span = `${fmtDate(request.dateRange.start)} – ${fmtDate(request.dateRange.end)}`;
  const ctx = { area: fmtArea(request.region.areaSqm), span };

  return {
    id: `xai-${Date.now()}`,
    summary: template.summary(ctx),
    confidence: round1(rand(0.78, 0.94)),
    metrics: template.metrics(ctx),
    factors: template.factors,
    evidence: template.evidence,
    modelNote:
      'Explainability mode: factors above are the top-weighted inputs of the spatial model for this region. Weights reflect relative contribution to the prediction, not causal proof.',
  };
};
