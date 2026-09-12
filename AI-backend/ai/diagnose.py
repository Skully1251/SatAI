import os
import numpy as np


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

PREDICTION_FILE = os.path.join(
    BASE_DIR,
    "data",
    "predictions",
    "punjab_patch_predictions.npy"
)


# ============================================================
# CLASS NAMES
# ============================================================

CLASS_NAMES = [
    "Urban fabric",
    "Industrial or commercial units",
    "Arable land",
    "Permanent crops",
    "Pastures",
    "Complex cultivation patterns",
    "Land principally occupied by agriculture, with significant areas of natural vegetation",
    "Agro-forestry areas",
    "Broad-leaved forest",
    "Coniferous forest",
    "Mixed forest",
    "Natural grassland and sparsely vegetated areas",
    "Moors, heathland and sclerophyllous vegetation",
    "Transitional woodland, shrub",
    "Beaches, dunes, sands",
    "Inland wetlands",
    "Coastal wetlands",
    "Inland waters",
    "Marine waters",
]


# ============================================================
# LOAD
# ============================================================

print("\n")
print("=" * 70)
print("🔬 SATQUERYAI PREDICTION DIAGNOSTICS")
print("=" * 70)

if not os.path.exists(PREDICTION_FILE):

    raise FileNotFoundError(
        f"Prediction file not found:\n{PREDICTION_FILE}"
    )

predictions = np.load(
    PREDICTION_FILE
)

print(
    f"\nPrediction file: {PREDICTION_FILE}"
)

print(
    f"Shape: {predictions.shape}"
)

print(
    f"Dtype: {predictions.dtype}"
)


# ============================================================
# BASIC STATISTICS
# ============================================================

print("\n")
print("=" * 70)
print("1. GLOBAL STATISTICS")
print("=" * 70)

print(
    f"Minimum probability: {predictions.min():.8f}"
)

print(
    f"Maximum probability: {predictions.max():.8f}"
)

print(
    f"Mean probability:    {predictions.mean():.8f}"
)

print(
    f"Median probability:  {np.median(predictions):.8f}"
)


# ============================================================
# PER-CLASS STATISTICS
# ============================================================

print("\n")
print("=" * 70)
print("2. PER-CLASS STATISTICS")
print("=" * 70)

print(
    f"{'CLASS':65s}"
    f"{'MEAN':>10s}"
    f"{'MIN':>10s}"
    f"{'MAX':>10s}"
)

print("-" * 100)

for i, class_name in enumerate(CLASS_NAMES):

    values = predictions[:, i]

    print(
        f"{class_name:65s}"
        f"{values.mean():10.6f}"
        f"{values.min():10.6f}"
        f"{values.max():10.6f}"
    )


# ============================================================
# TOP CLASS DISTRIBUTION
# ============================================================

print("\n")
print("=" * 70)
print("3. TOP-CLASS DISTRIBUTION")
print("=" * 70)

top_classes = np.argmax(
    predictions,
    axis=1
)

unique, counts = np.unique(
    top_classes,
    return_counts=True
)

order = np.argsort(
    counts
)[::-1]

for index in order:

    class_index = unique[index]

    count = counts[index]

    percentage = (
        count /
        len(top_classes)
        *
        100
    )

    print(
        f"{CLASS_NAMES[class_index]:65s}"
        f"{count:5d} patches "
        f"({percentage:6.2f}%)"
    )


# ============================================================
# CONFIDENCE DISTRIBUTION
# ============================================================

print("\n")
print("=" * 70)
print("4. TOP-CLASS CONFIDENCE")
print("=" * 70)

confidence = np.max(
    predictions,
    axis=1
)

print(
    f"Mean:   {confidence.mean():.6f}"
)

print(
    f"Median: {np.median(confidence):.6f}"
)

print(
    f"Min:    {confidence.min():.6f}"
)

print(
    f"Max:    {confidence.max():.6f}"
)

print(
    f"\nConfidence >= 0.99: "
    f"{np.sum(confidence >= 0.99)} / "
    f"{len(confidence)}"
)

print(
    f"Confidence >= 0.90: "
    f"{np.sum(confidence >= 0.90)} / "
    f"{len(confidence)}"
)

print(
    f"Confidence >= 0.75: "
    f"{np.sum(confidence >= 0.75)} / "
    f"{len(confidence)}"
)


# ============================================================
# FIRST 10 PATCHES
# ============================================================

print("\n")
print("=" * 70)
print("5. FIRST 10 PATCHES — TOP 5 CLASSES")
print("=" * 70)

for patch_index in range(
    min(10, len(predictions))
):

    scores = predictions[
        patch_index
    ]

    top_indices = np.argsort(
        scores
    )[::-1][:5]

    print(
        f"\nPatch {patch_index}"
    )

    for class_index in top_indices:

        print(
            f"  "
            f"{CLASS_NAMES[class_index]:65s}"
            f"{scores[class_index]:.8f}"
        )


# ============================================================
# PROBABILITY HISTOGRAM
# ============================================================

print("\n")
print("=" * 70)
print("6. PROBABILITY BUCKETS")
print("=" * 70)

bins = [
    0.0,
    0.01,
    0.05,
    0.10,
    0.25,
    0.50,
    0.75,
    0.90,
    0.95,
    0.99,
    1.001,
]

hist, edges = np.histogram(
    predictions,
    bins=bins
)

total = predictions.size

for i in range(
    len(hist)
):

    percentage = (
        hist[i] /
        total *
        100
    )

    print(
        f"{edges[i]:.2f} - "
        f"{edges[i + 1]:.2f}: "
        f"{hist[i]:6d} "
        f"({percentage:6.2f}%)"
    )


# ============================================================
# CHECK SATURATION
# ============================================================

print("\n")
print("=" * 70)
print("7. SATURATION CHECK")
print("=" * 70)

near_zero = np.sum(
    predictions < 0.001
)

near_one = np.sum(
    predictions > 0.999
)

print(
    f"Values < 0.001: "
    f"{near_zero}"
)

print(
    f"Values > 0.999: "
    f"{near_one}"
)

print(
    f"Total values: "
    f"{predictions.size}"
)

print(
    f"Percentage > 0.999: "
    f"{near_one / predictions.size * 100:.2f}%"
)


# ============================================================
# FINAL
# ============================================================

print("\n")
print("=" * 70)
print("✅ DIAGNOSTIC COMPLETE")
print("=" * 70)

print(
    "\nPaste the complete output here."
)

print(
    "We will use it to determine whether "
    "the problem is preprocessing, model "
    "saturation, or domain shift."
)