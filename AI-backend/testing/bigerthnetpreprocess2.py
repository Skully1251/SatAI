import os
import numpy as np
import pandas as pd
import rasterio
from rasterio.enums import Resampling


# ============================================================
# CONFIG
# ============================================================

INPUT_DIR = "data/bigearthnet/sample"

RAW_OUTPUT = "data/bigearthnet/bigearthnet_50_raw.npy"
NORMALIZED_OUTPUT = "data/bigearthnet/bigearthnet_50_normalized.npy"
LABEL_OUTPUT = "data/bigearthnet/bigearthnet_50_labels.npy"

# BigEarthNet v2.0 statistics
MEANS = np.array([
    -12.643863677978516,   # VV
    -19.352558135986328,   # VH
    438.3720703125,        # B02
    614.0556640625,        # B03
    588.4096069335938,     # B04
    942.8433227539062,     # B05
    1769.931640625,        # B06
    2049.551513671875,     # B07
    2193.2919921875,       # B08
    2235.556640625,        # B8A
    1568.226806640625,     # B11
    997.7324829101562      # B12
], dtype=np.float32)

STDS = np.array([
    5.133493900299072,     # VV
    5.590505599975586,     # VH
    607.02685546875,       # B02
    603.2968139648438,     # B03
    684.56884765625,       # B04
    738.4326782226562,     # B05
    1100.4560546875,       # B06
    1275.805419921875,     # B07
    1369.3717041015625,     # B08
    1356.5440673828125,    # B8A
    1070.1612548828125,    # B11
    813.5276489257812      # B12
], dtype=np.float32)


# Official model band order
BAND_NAMES = [
    "VV",
    "VH",
    "B02",
    "B03",
    "B04",
    "B05",
    "B06",
    "B07",
    "B08",
    "B8A",
    "B11",
    "B12"
]

# S2 allbands.tif order:
#
# B01
# B02
# B03
# B04
# B05
# B06
# B07
# B08
# B8A
# B09
# B11
# B12
#
# Python indices to keep:
S2_KEEP = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12]


# ============================================================
# PROCESS ONE PATCH
# ============================================================

def process_patch(patch_dir):

    s1_path = os.path.join(patch_dir, "s1.tif")
    s2_path = os.path.join(patch_dir, "s2.tif")

    # --------------------------------------------------------
    # Read Sentinel-1
    # --------------------------------------------------------

    with rasterio.open(s1_path) as src:

        s1 = src.read().astype(np.float32)

    # Expected:
    # (2, 120, 120)
    if s1.shape != (2, 120, 120):
        raise ValueError(
            f"Unexpected S1 shape {s1.shape} "
            f"for {patch_dir}"
        )

    # IMPORTANT:
    # BigEarthNet S1 is ALREADY in dB.
    # Do NOT apply 10*log10 here.


    # --------------------------------------------------------
    # Read Sentinel-2
    # --------------------------------------------------------

    with rasterio.open(s2_path) as src:

        # Read required bands directly and resize
        # from 60x60 -> 120x120.

        s2 = src.read(
            S2_KEEP,
            out_shape=(len(S2_KEEP), 120, 120),
            resampling=Resampling.nearest
        ).astype(np.float32)

    # Expected:
    # (10, 120, 120)

    if s2.shape != (10, 120, 120):
        raise ValueError(
            f"Unexpected S2 shape {s2.shape} "
            f"for {patch_dir}"
        )

    # --------------------------------------------------------
    # Combine S1 + S2
    # --------------------------------------------------------

    combined = np.concatenate(
        [s1, s2],
        axis=0
    )

    # Expected:
    # (12, 120, 120)

    if combined.shape != (12, 120, 120):
        raise ValueError(
            f"Unexpected combined shape "
            f"{combined.shape}"
        )

    return combined


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("BigEarthNet preprocessing")
    print("=" * 60)

    patches = sorted([
        d for d in os.listdir(INPUT_DIR)
        if d.startswith("patch_")
        and os.path.isdir(
            os.path.join(INPUT_DIR, d)
        )
    ])

    print(f"Found patches: {len(patches)}")

    if len(patches) == 0:
        raise RuntimeError(
            "No patches found."
        )

    all_data = []

    # --------------------------------------------------------
    # Process every patch
    # --------------------------------------------------------

    for i, patch in enumerate(patches):

        patch_dir = os.path.join(
            INPUT_DIR,
            patch
        )

        print(
            f"[{i + 1}/{len(patches)}] "
            f"Processing {patch}"
        )

        data = process_patch(patch_dir)

        all_data.append(data)

    # --------------------------------------------------------
    # Convert list → NumPy
    # --------------------------------------------------------

    raw = np.stack(
        all_data,
        axis=0
    ).astype(np.float32)

    print()
    print("Raw shape:", raw.shape)

    # Expected:
    # (50, 12, 120, 120)

    if raw.shape[1:] != (12, 120, 120):
        raise ValueError(
            f"Unexpected final shape: {raw.shape}"
        )

    # --------------------------------------------------------
    # Check raw data
    # --------------------------------------------------------

    if not np.isfinite(raw).all():
        raise ValueError(
            "Raw data contains NaN or Inf."
        )

    # --------------------------------------------------------
    # Normalize
    # --------------------------------------------------------

    normalized = (
        raw - MEANS.reshape(1, 12, 1, 1)
    ) / STDS.reshape(1, 12, 1, 1)

    normalized = normalized.astype(
        np.float32
    )

    # --------------------------------------------------------
    # Check normalized data
    # --------------------------------------------------------

    if not np.isfinite(normalized).all():
        raise ValueError(
            "Normalized data contains NaN or Inf."
        )

    # --------------------------------------------------------
    # Save imagery
    # --------------------------------------------------------

    np.save(
        RAW_OUTPUT,
        raw
    )

    np.save(
        NORMALIZED_OUTPUT,
        normalized
    )

    # --------------------------------------------------------
    # Extract labels from metadata
    # --------------------------------------------------------

    metadata_path = os.path.join(
        INPUT_DIR,
        "sample_metadata.csv"
    )

    df = pd.read_csv(metadata_path)

    label_columns = [
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
        "Marine waters"
    ]

    labels = df[label_columns].values.astype(
        np.float32
    )

    if labels.shape != (len(patches), 19):
        raise ValueError(
            f"Unexpected label shape: {labels.shape}"
        )

    np.save(
        LABEL_OUTPUT,
        labels
    )

    # --------------------------------------------------------
    # Print final information
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("PREPROCESSING COMPLETE")
    print("=" * 60)

    print("Raw data:")
    print(f"  Shape : {raw.shape}")
    print(f"  Dtype : {raw.dtype}")
    print(f"  Min   : {raw.min():.4f}")
    print(f"  Max   : {raw.max():.4f}")

    print()
    print("Normalized data:")
    print(f"  Shape : {normalized.shape}")
    print(f"  Dtype : {normalized.dtype}")
    print(f"  Min   : {normalized.min():.4f}")
    print(f"  Max   : {normalized.max():.4f}")

    print()
    print("Labels:")
    print(f"  Shape : {labels.shape}")

    print()
    print("Band order:")

    for i, band in enumerate(BAND_NAMES):
        print(f"  {i:2d}: {band}")

    print()
    print("Saved:")
    print(f"  {RAW_OUTPUT}")
    print(f"  {NORMALIZED_OUTPUT}")
    print(f"  {LABEL_OUTPUT}")


if __name__ == "__main__":
    main()