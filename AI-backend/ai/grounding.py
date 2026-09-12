"""
ai/grounding.py

Text-guided region grounding via spectral index thresholding.

Given a natural-language query and a raw (pre-normalization) 12-band
patch, identifies which feature is being asked about, computes the
relevant index, thresholds it into a binary mask, and produces an
overlay visualization.

This satisfies the "captioning OR grounding" mandatory single-image
task (we picked grounding) — no training/fine-tuning dataset is
required for this per the problem statement, it's evaluated on the
observable output (the mask + query interpretation).

BUILT-UP DETECTION NOTE: NDBI alone (optical-only) frequently false-
positives on bare/dry soil and cropland, which share a similar spectral
signature to built-up surfaces (confirmed via diagnostic: 35-84% false
"built-up" coverage on a 98%-arable-land patch using NDBI thresholding
alone, even after excluding high-NDVI pixels). fusion.py's classifier
gives a materially better result for this case because it ALSO requires
high SAR backscatter (built-up surfaces cause strong radar double-bounce
reflection; bare soil/cropland generally does not) — so for the
built-up/urban/structure keyword group, grounding delegates to that
same validated cross-modal logic rather than duplicating a weaker
optical-only rule.
"""

import numpy as np
import matplotlib.pyplot as plt

from spectral_indices import ndvi, ndwi, ndbi, true_color
from fusion import fuse_classify

# Keywords that should use the more accurate optical+SAR fusion classifier
# instead of a standalone NDBI threshold.
BUILTUP_KEYWORDS = {"built-up", "urban", "industrial", "city", "building",
                     "buildings", "structure", "structures"}

# Keyword -> (index function, default threshold, human label)
# Thresholds are heuristic starting points on typical Sentinel-2 reflectance
# scale (raw, pre-normalization) — tune per your data if masks look off.
GROUNDING_RULES = {
    "water": (ndwi, 0.0, "water body"),
    "lake": (ndwi, 0.0, "water body"),
    "river": (ndwi, 0.0, "water body"),
    "vegetation": (ndvi, 0.3, "vegetation"),
    "forest": (ndvi, 0.4, "forest/vegetation"),
    "crop": (ndvi, 0.3, "vegetation/cropland"),
    "farmland": (ndvi, 0.3, "vegetation/cropland"),
    "built-up": (ndbi, 0.0, "built-up area"),
    "urban": (ndbi, 0.0, "built-up area"),
    "industrial": (ndbi, 0.0, "built-up area"),
    "city": (ndbi, 0.0, "built-up area"),
    "building": (ndbi, 0.0, "built-up area"),
    "buildings": (ndbi, 0.0, "built-up area"),
    "structure": (ndbi, 0.0, "built-up area"),
    "structures": (ndbi, 0.0, "built-up area"),
}


def interpret_query(query: str, forced_keyword: str = None):
    """
    Finds the grounding rule to use. If forced_keyword is given (e.g. from
    the router's semantic-classification fallback, which identified the
    topic even though no literal keyword matched), that takes priority over
    text matching.
    """
    if forced_keyword is not None:
        if forced_keyword in GROUNDING_RULES:
            return forced_keyword, GROUNDING_RULES[forced_keyword]

    query_lower = query.lower()
    for keyword, rule in GROUNDING_RULES.items():
        if keyword in query_lower:
            return keyword, rule
    return None, None


def ground(query: str, patch_raw: np.ndarray, save_path: str = None, forced_keyword: str = None):
    """
    Runs grounding for a query against a raw 12-band patch.

    forced_keyword: optional override used when the router's semantic
    fallback identified the topic (water/vegetation/built-up) from
    paraphrased wording that doesn't literally contain a GROUNDING_RULES
    keyword. Skips the text-matching step and goes straight to that rule.

    Returns a dict with: keyword matched, index name, mask (bool array),
    coverage fraction, and (if save_path given) the path to the saved overlay PNG.
    """
    keyword, rule = interpret_query(query, forced_keyword=forced_keyword)

    if rule is None:
        return {
            "status": "no_match",
            "query": query,
            "message": (
                "Could not match query to a known feature (water, vegetation, "
                "built-up). Supported keywords: " + ", ".join(GROUNDING_RULES.keys())
            ),
        }

    index_fn, threshold, label = rule

    if keyword in BUILTUP_KEYWORDS:
        # Use the validated optical+SAR fusion classifier instead of a
        # standalone NDBI threshold -- see module docstring.
        classmap = fuse_classify(patch_raw)
        mask = (classmap == 1)  # class 1 = built-up in fusion.py's scheme
        index_name = "fusion_classifier (NDBI + SAR VV backscatter)"
    else:
        index_map = index_fn(patch_raw)
        mask = index_map > threshold
        index_name = index_fn.__name__

    coverage = float(mask.mean())

    result = {
        "status": "ok",
        "query": query,
        "matched_keyword": keyword,
        "feature_label": label,
        "index_used": index_name,
        "threshold": threshold,
        "coverage_fraction": coverage,
        "mask": mask,
    }

    if save_path:
        rgb = true_color(patch_raw)
        overlay = rgb.copy()
        highlight_color = np.array([255, 0, 200])
        alpha = 0.5
        overlay[mask] = (
            (1 - alpha) * overlay[mask] + alpha * highlight_color
        ).astype(np.uint8)

        fig, axes = plt.subplots(1, 2, figsize=(8, 4))
        axes[0].imshow(rgb)
        axes[0].set_title("True color")
        axes[0].axis("off")
        axes[1].imshow(overlay)
        axes[1].set_title(f"Highlighted: {label} ({coverage*100:.1f}%)")
        axes[1].axis("off")
        plt.tight_layout()
        plt.savefig(save_path, dpi=120)
        plt.close(fig)
        result["overlay_path"] = save_path

    return result


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python grounding.py <path_to_raw_npy> <patch_index> [query]")
        sys.exit(1)

    raw_path = sys.argv[1]
    patch_idx = int(sys.argv[2])
    query = sys.argv[3] if len(sys.argv) > 3 else "highlight the water body in this image"

    all_patches = np.load(raw_path)
    patch = all_patches[patch_idx]

    result = ground(query, patch, save_path=f"grounding_result_{patch_idx}.png")
    print(result)