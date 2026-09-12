import os
import numpy as np
import matplotlib.pyplot as plt


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DATA_FILE = os.path.join(
    BASE_DIR,
    "data",
    "punjab_s1_s2_12bands.npy"
)


# ============================================================
# BAND INFORMATION
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
# LOAD DATA
# ============================================================

print("\n🔍 Loading satellite data...")
print("=" * 60)

image = np.load(DATA_FILE)

print(f"File: {DATA_FILE}")
print(f"Shape: {image.shape}")
print(f"Dtype: {image.dtype}")
print(f"Number of bands: {image.shape[-1]}")


if image.shape[-1] != 12:
    raise ValueError(
        f"Expected 12 bands, got {image.shape[-1]}"
    )


# ============================================================
# EXTRACT BANDS
# ============================================================

VV = image[:, :, 0]
VH = image[:, :, 1]

B02 = image[:, :, 2]
B03 = image[:, :, 3]
B04 = image[:, :, 4]
B05 = image[:, :, 5]
B06 = image[:, :, 6]
B07 = image[:, :, 7]
B08 = image[:, :, 8]
B8A = image[:, :, 9]
B11 = image[:, :, 10]
B12 = image[:, :, 11]


# ============================================================
# HELPER FUNCTION
# ============================================================

def normalize_percentile(band, low=2, high=98):
    """
    Normalize an image band using percentile clipping.

    This makes satellite imagery easier to visualize.
    """

    low_value = np.percentile(band, low)
    high_value = np.percentile(band, high)

    normalized = (
        band - low_value
    ) / (
        high_value - low_value + 1e-8
    )

    normalized = np.clip(
        normalized,
        0,
        1
    )

    return normalized


# ============================================================
# TRUE COLOR RGB
# ============================================================

print("\n🎨 Creating True Color image...")

red = normalize_percentile(B04)
green = normalize_percentile(B03)
blue = normalize_percentile(B02)

rgb = np.stack(
    [red, green, blue],
    axis=-1
)


plt.figure(figsize=(10, 8))

plt.imshow(rgb)

plt.title(
    "Punjab - Sentinel-2 True Color (RGB)"
)

plt.axis("off")

plt.tight_layout()

plt.show()


# ============================================================
# FALSE COLOR
# ============================================================

print("🌱 Creating False Color image...")

nir = normalize_percentile(B08)
red = normalize_percentile(B04)
green = normalize_percentile(B03)

false_color = np.stack(
    [nir, red, green],
    axis=-1
)


plt.figure(figsize=(10, 8))

plt.imshow(false_color)

plt.title(
    "Punjab - False Color (NIR, Red, Green)"
)

plt.axis("off")

plt.tight_layout()

plt.show()


# ============================================================
# NDVI
# ============================================================

print("🌿 Calculating NDVI...")

ndvi = (
    (B08 - B04)
    /
    (B08 + B04 + 1e-8)
)


plt.figure(figsize=(10, 8))

plt.imshow(
    ndvi,
    vmin=-1,
    vmax=1
)

plt.colorbar(
    label="NDVI"
)

plt.title(
    "Punjab - NDVI"
)

plt.axis("off")

plt.tight_layout()

plt.show()


# ============================================================
# NDMI
# ============================================================

print("💧 Calculating NDMI...")

ndmi = (
    (B08 - B11)
    /
    (B08 + B11 + 1e-8)
)


plt.figure(figsize=(10, 8))

plt.imshow(
    ndmi,
    vmin=-1,
    vmax=1
)

plt.colorbar(
    label="NDMI"
)

plt.title(
    "Punjab - NDMI"
)

plt.axis("off")

plt.tight_layout()

plt.show()


# ============================================================
# SENTINEL-1 VV
# ============================================================

print("📡 Visualizing Sentinel-1 VV...")

vv_visual = normalize_percentile(
    VV,
    low=2,
    high=98
)


plt.figure(figsize=(10, 8))

plt.imshow(
    vv_visual
)

plt.colorbar(
    label="VV"
)

plt.title(
    "Punjab - Sentinel-1 VV"
)

plt.axis("off")

plt.tight_layout()

plt.show()


# ============================================================
# SENTINEL-1 VH
# ============================================================

print("📡 Visualizing Sentinel-1 VH...")

vh_visual = normalize_percentile(
    VH,
    low=2,
    high=98
)


plt.figure(figsize=(10, 8))

plt.imshow(
    vh_visual
)

plt.colorbar(
    label="VH"
)

plt.title(
    "Punjab - Sentinel-1 VH"
)

plt.axis("off")

plt.tight_layout()

plt.show()


# ============================================================
# SAVE VISUALIZATIONS
# ============================================================

VISUAL_DIR = os.path.join(
    BASE_DIR,
    "data",
    "visualizations"
)

os.makedirs(
    VISUAL_DIR,
    exist_ok=True
)


# True Color

plt.imsave(
    os.path.join(
        VISUAL_DIR,
        "true_color_rgb.png"
    ),
    rgb
)


# False Color

plt.imsave(
    os.path.join(
        VISUAL_DIR,
        "false_color.png"
    ),
    false_color
)


# NDVI

plt.imsave(
    os.path.join(
        VISUAL_DIR,
        "ndvi.png"
    ),
    ndvi,
    vmin=-1,
    vmax=1
)


# NDMI

plt.imsave(
    os.path.join(
        VISUAL_DIR,
        "ndmi.png"
    ),
    ndmi,
    vmin=-1,
    vmax=1
)


# VV

plt.imsave(
    os.path.join(
        VISUAL_DIR,
        "sentinel1_vv.png"
    ),
    vv_visual
)


# VH

plt.imsave(
    os.path.join(
        VISUAL_DIR,
        "sentinel1_vh.png"
    ),
    vh_visual
)


# ============================================================
# COMPLETE
# ============================================================

print("\n")
print("=" * 60)
print("✅ VISUALIZATION COMPLETE")
print("=" * 60)

print("\nImages saved to:")

print(VISUAL_DIR)

print("\nGenerated files:")

print("1. true_color_rgb.png")
print("2. false_color.png")
print("3. ndvi.png")
print("4. ndmi.png")
print("5. sentinel1_vv.png")
print("6. sentinel1_vh.png")

print("\n🎉 Satellite imagery is ready for inspection!")