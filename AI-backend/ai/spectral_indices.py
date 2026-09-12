"""
ai/spectral_indices.py

Shared index computations for the grounding and fusion modules.

IMPORTANT: these operate on RAW (pre-normalization) band values, not the
z-score normalized tensors used for model input — band ratios are only
meaningful on the actual reflectance/backscatter values.

Expected input: numpy array of shape (12, H, W) or (H, W, 12) in the
validated band order:
  0: VV   1: VH   2: B02  3: B03  4: B04  5: B05
  6: B06  7: B07  8: B08  9: B8A  10: B11  11: B12
"""

import numpy as np

BAND_NAMES = ["VV", "VH", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B11", "B12"]
BAND_IDX = {name: i for i, name in enumerate(BAND_NAMES)}


def _to_chw(patch: np.ndarray) -> np.ndarray:
    """Normalizes input to (12, H, W) regardless of whether it came in as (H, W, 12)."""
    if patch.shape[0] == 12:
        return patch
    elif patch.shape[-1] == 12:
        return np.moveaxis(patch, -1, 0)
    else:
        raise ValueError(f"Expected a 12-band array, got shape {patch.shape}")


def _safe_ratio(a: np.ndarray, b: np.ndarray, eps: float = 1e-6) -> np.ndarray:
    return (a - b) / (a + b + eps)


def ndvi(patch: np.ndarray) -> np.ndarray:
    """Vegetation index. NIR (B08) vs Red (B04). Higher = more vegetation."""
    p = _to_chw(patch)
    nir, red = p[BAND_IDX["B08"]], p[BAND_IDX["B04"]]
    return _safe_ratio(nir, red)


def ndwi(patch: np.ndarray) -> np.ndarray:
    """McFeeters water index. Green (B03) vs NIR (B08). Higher = more water."""
    p = _to_chw(patch)
    green, nir = p[BAND_IDX["B03"]], p[BAND_IDX["B08"]]
    return _safe_ratio(green, nir)


def ndbi(patch: np.ndarray) -> np.ndarray:
    """Built-up index. SWIR (B11) vs NIR (B08). Higher = more built-up."""
    p = _to_chw(patch)
    swir, nir = p[BAND_IDX["B11"]], p[BAND_IDX["B08"]]
    return _safe_ratio(swir, nir)


def sar_backscatter(patch: np.ndarray, pol: str = "VV") -> np.ndarray:
    """Raw SAR backscatter in dB for the given polarization (VV or VH)."""
    p = _to_chw(patch)
    return p[BAND_IDX[pol]]


def true_color(patch: np.ndarray) -> np.ndarray:
    """Returns an (H, W, 3) uint8 RGB array from B04/B03/B02 for visualization."""
    p = _to_chw(patch)
    r, g, b = p[BAND_IDX["B04"]], p[BAND_IDX["B03"]], p[BAND_IDX["B02"]]
    rgb = np.stack([r, g, b], axis=-1)
    # simple percentile stretch for visibility
    lo, hi = np.percentile(rgb, 2), np.percentile(rgb, 98)
    rgb = np.clip((rgb - lo) / (hi - lo + 1e-6), 0, 1)
    return (rgb * 255).astype(np.uint8)