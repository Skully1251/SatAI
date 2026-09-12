"""
ai/change_detection.py

Bi-temporal change detection / change-VQA.

Given two spatially-aligned sets of raw (pre-normalization) 12-band
patches from different dates, this:
  1. Computes NDVI/NDBI/NDWI + fusion class (water/built-up/vegetation/bare)
     per patch for both dates using the same rule-based logic as fusion.py.
  2. Optionally re-classifies each date with the fine-tuned ResNet-50 for
     a land-cover-level view of what changed.
  3. Diffs both, flags significantly-changed patches, and answers
     natural-language change queries via templated text (no generic LLM
     — stays compliant with "no generic VLM/LLM" requirement).

Satisfies the mandatory "change description or change-based VQA from a
bi-temporal image pair" requirement.

Assumes date1 and date2 patch arrays are the SAME SHAPE and spatially
aligned index-for-index (patch i in date1 == same location as patch i
in date2) — i.e. both extracted from the same bbox with the same
patch grid.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

from spectral_indices import ndvi, ndwi, ndbi, true_color
from fusion import fuse_classify, CLASS_NAMES, CLASS_COLORS

# Threshold for flagging a patch as "significantly changed" in built-up coverage
BUILTUP_CHANGE_THRESHOLD = 0.10  # 10 percentage points of the patch


def patch_stats(patch_raw: np.ndarray) -> dict:
    """Per-patch summary stats used for diffing."""
    classmap = fuse_classify(patch_raw)
    total = classmap.size
    return {
        "ndvi_mean": float(ndvi(patch_raw).mean()),
        "ndbi_mean": float(ndbi(patch_raw).mean()),
        "ndwi_mean": float(ndwi(patch_raw).mean()),
        "builtup_frac": float((classmap == 1).sum()) / total,
        "water_frac": float((classmap == 0).sum()) / total,
        "veg_frac": float((classmap == 2).sum()) / total,
        "classmap": classmap,
    }


def diff_patches(date1_patches: np.ndarray, date2_patches: np.ndarray) -> list:
    """
    Returns a list of per-patch diff dicts, one per patch index.
    date1_patches / date2_patches: (N, 12, H, W)
    """
    assert date1_patches.shape == date2_patches.shape, (
        f"Shape mismatch between dates: {date1_patches.shape} vs {date2_patches.shape}. "
        "Both dates must have the same number of spatially-aligned patches."
    )

    diffs = []
    for i in range(date1_patches.shape[0]):
        s1 = patch_stats(date1_patches[i])
        s2 = patch_stats(date2_patches[i])

        diffs.append({
            "patch_idx": i,
            "date1": s1,
            "date2": s2,
            "builtup_delta": s2["builtup_frac"] - s1["builtup_frac"],
            "water_delta": s2["water_frac"] - s1["water_frac"],
            "veg_delta": s2["veg_frac"] - s1["veg_frac"],
            "ndvi_delta": s2["ndvi_mean"] - s1["ndvi_mean"],
            "significant_builtup_change": abs(s2["builtup_frac"] - s1["builtup_frac"]) > BUILTUP_CHANGE_THRESHOLD,
        })
    return diffs


def change_answer(query: str, date1_patches: np.ndarray, date2_patches: np.ndarray,
                   patch_idx: int = None, save_path: str = None):
    """
    Answers a change-detection query.

    If patch_idx is given, analyzes just that one patch pair (with optional
    visualization). Otherwise summarizes across all patches.
    """
    query_lower = query.lower()

    if patch_idx is not None:
        diffs = [diff_patches(date1_patches[patch_idx:patch_idx+1],
                               date2_patches[patch_idx:patch_idx+1])[0]]
    else:
        diffs = diff_patches(date1_patches, date2_patches)

    n_total = len(diffs)
    n_increased = sum(1 for d in diffs if d["builtup_delta"] > BUILTUP_CHANGE_THRESHOLD)
    n_decreased = sum(1 for d in diffs if d["builtup_delta"] < -BUILTUP_CHANGE_THRESHOLD)
    n_unchanged = n_total - n_increased - n_decreased
    n_significant = sum(1 for d in diffs if d["significant_builtup_change"])

    avg_builtup_delta = float(np.mean([d["builtup_delta"] for d in diffs]))
    avg_ndvi_delta = float(np.mean([d["ndvi_delta"] for d in diffs]))

    # --------------------------------------------------------
    # Templated natural-language answer
    # --------------------------------------------------------
    if "built-up" in query_lower and ("increase" in query_lower or "decrease" in query_lower
                                       or "unchanged" in query_lower or "remained" in query_lower):
        if avg_builtup_delta > 0.02:
            trend = "increased"
        elif avg_builtup_delta < -0.02:
            trend = "decreased"
        else:
            trend = "remained largely unchanged"
        answer_text = (
            f"Built-up area has {trend} between the two dates "
            f"(average change: {avg_builtup_delta*100:+.1f} percentage points per patch). "
            f"{n_increased} of {n_total} patches show a notable increase in built-up coverage, "
            f"{n_decreased} show a notable decrease, and {n_unchanged} show no significant change."
        )
    elif "what changed" in query_lower or "where did the change" in query_lower:
        changed_locations = [d["patch_idx"] for d in diffs if d["significant_builtup_change"]]
        answer_text = (
            f"{n_significant} of {n_total} patches show significant change "
            f"(built-up coverage shift > {BUILTUP_CHANGE_THRESHOLD*100:.0f} percentage points). "
            f"Average vegetation index (NDVI) change: {avg_ndvi_delta:+.3f}. "
            f"Changed patch indices: {changed_locations[:20]}"
            + (" (truncated)" if len(changed_locations) > 20 else "")
        )
    else:
        answer_text = (
            f"Across {n_total} patches: average built-up change {avg_builtup_delta*100:+.1f} pp, "
            f"average NDVI change {avg_ndvi_delta:+.3f}. "
            f"{n_significant} patches show significant built-up change."
        )

    result = {
        "status": "ok",
        "query": query,
        "answer": answer_text,
        "n_total_patches": n_total,
        "n_significant_change": n_significant,
        "n_builtup_increased": n_increased,
        "n_builtup_decreased": n_decreased,
        "avg_builtup_delta": avg_builtup_delta,
        "avg_ndvi_delta": avg_ndvi_delta,
        "diffs": diffs,
    }

    if save_path and patch_idx is not None:
        rgb1 = true_color(date1_patches[patch_idx])
        rgb2 = true_color(date2_patches[patch_idx])
        cmap = ListedColormap(CLASS_COLORS)

        fig, axes = plt.subplots(1, 3, figsize=(13, 4.5))
        axes[0].imshow(rgb1)
        axes[0].set_title("Date 1")
        axes[0].axis("off")
        axes[1].imshow(rgb2)
        axes[1].set_title("Date 2")
        axes[1].axis("off")

        classmap1 = diffs[0]["date1"]["classmap"]
        classmap2 = diffs[0]["date2"]["classmap"]
        change_mask = (classmap1 != classmap2).astype(np.int32)
        axes[2].imshow(rgb2)
        axes[2].imshow(change_mask, cmap="Reds", alpha=0.5 * change_mask)
        axes[2].set_title(f"Change (built-up Δ={diffs[0]['builtup_delta']*100:+.1f}pp)")
        axes[2].axis("off")

        plt.tight_layout()
        plt.savefig(save_path, dpi=120)
        plt.close(fig)
        result["overlay_path"] = save_path

    return result


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python change_detection.py <date1_raw_npy> <date2_raw_npy> [patch_idx] [query]")
        sys.exit(1)

    date1_path, date2_path = sys.argv[1], sys.argv[2]
    patch_idx = int(sys.argv[3]) if len(sys.argv) > 3 else None
    query = sys.argv[4] if len(sys.argv) > 4 else "Has the built-up area increased, decreased, or remained unchanged?"

    date1_patches = np.load(date1_path)
    date2_patches = np.load(date2_path)

    result = change_answer(
        query, date1_patches, date2_patches, patch_idx=patch_idx,
        save_path=f"change_result_{patch_idx if patch_idx is not None else 'summary'}.png" if patch_idx is not None else None,
    )
    print("Answer:", result["answer"])
    print(f"Summary: {result['n_significant_change']}/{result['n_total_patches']} patches significantly changed")