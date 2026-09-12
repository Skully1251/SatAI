import os
import numpy as np


# ============================================================
# PATH
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DATA_PATH = os.path.join(
    BASE_DIR,
    "data",
    "punjab_s1_s2_12bands.npy"
)


# ============================================================
# BAND ORDER
# ============================================================

BANDS = [
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


# ============================================================
# LOAD
# ============================================================

print("\n🔍 Loading satellite data...")
print("=" * 60)

print("File:")
print(DATA_PATH)

image = np.load(DATA_PATH)


# ============================================================
# BASIC INFORMATION
# ============================================================

print("\nShape:")
print(image.shape)

print("\nDtype:")
print(image.dtype)

print("\nNumber of bands:")
print(image.shape[-1])


# ============================================================
# CHECK BAND COUNT
# ============================================================

if image.shape[-1] != 12:

    raise ValueError(
        f"Expected 12 bands but found {image.shape[-1]}"
    )


# ============================================================
# BAND STATISTICS
# ============================================================

print("\n📊 Band statistics")
print("=" * 60)

for i, band in enumerate(BANDS):

    band_data = image[:, :, i]

    print(f"\n{band}")

    print(
        f"  Min:    {np.nanmin(band_data):.4f}"
    )

    print(
        f"  Max:    {np.nanmax(band_data):.4f}"
    )

    print(
        f"  Mean:   {np.nanmean(band_data):.4f}"
    )

    print(
        f"  Std:    {np.nanstd(band_data):.4f}"
    )

    print(
        f"  NaN:    {np.isnan(band_data).sum()}"
    )


# ============================================================
# CHECK FOR INVALID VALUES
# ============================================================

print("\n🧪 Data validation")
print("=" * 60)

print(
    "Contains NaN:",
    np.isnan(image).any()
)

print(
    "Contains +Inf:",
    np.isposinf(image).any()
)

print(
    "Contains -Inf:",
    np.isneginf(image).any()
)


# ============================================================
# FINAL
# ============================================================

print("\n")
print("=" * 60)
print("✅ DATA CHECK COMPLETE")
print("=" * 60)

print("\nBand order:")

for i, band in enumerate(BANDS):

    print(
        f"{i:2d} → {band}"
    )