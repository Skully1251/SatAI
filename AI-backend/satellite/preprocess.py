import os
import sys
import numpy as np


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DEFAULT_INPUT_FILE = os.path.join(
    BASE_DIR,
    "data",
    "punjab_s1_s2_12bands.npy"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "patches"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)


PATCH_SIZE = 120


# ============================================================
# BIGEARTHNET V2.0 BAND ORDER
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
    "B12",
]


# ============================================================
# BIGEARTHNET V2.0 NORMALIZATION STATISTICS
#
# Official BigEarthNet v2 statistics.
#
# S1:
#   VV / VH are in dB
#
# S2:
#   Reflectance is scaled to approximately 0-10000
#
# Statistics are calculated after interpolation to 120x120.
# ============================================================

MEANS = {
    "VV": -12.643863677978516,
    "VH": -19.352558135986328,

    "B02": 438.3720703125,
    "B03": 614.0556640625,
    "B04": 588.4096069335938,
    "B05": 942.8433227539062,
    "B06": 1769.931640625,
    "B07": 2049.551513671875,
    "B08": 2193.2919921875,
    "B8A": 2235.556640625,
    "B11": 1568.226806640625,
    "B12": 997.7324829101562,
}


STDS = {
    "VV": 5.133493900299072,
    "VH": 5.590505599975586,

    "B02": 607.02685546875,
    "B03": 603.2968139648438,
    "B04": 684.56884765625,
    "B05": 738.4326782226562,
    "B06": 1100.4560546875,
    "B07": 1275.805419921875,
    "B08": 1369.3717041015625,
    "B8A": 1356.5440673828125,
    "B11": 1070.1612548828125,
    "B12": 813.5276489257812,
}


# ============================================================
# LOAD DATA
# ============================================================

def load_satellite_data(input_file=DEFAULT_INPUT_FILE):

    print("\n🔍 Loading satellite data...")
    print("=" * 60)

    print(f"File: {input_file}")

    if not os.path.exists(input_file):

        raise FileNotFoundError(
            f"\n❌ Input file not found:\n{input_file}"
        )

    data = np.load(input_file)

    print(f"Shape: {data.shape}")
    print(f"Dtype: {data.dtype}")
    print(f"Number of bands: {data.shape[-1]}")

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    if data.ndim != 3:

        raise ValueError(
            f"Expected 3D array (H, W, bands), "
            f"got {data.ndim} dimensions."
        )

    if data.shape[-1] != 12:

        raise ValueError(
            f"Expected 12 bands, "
            f"got {data.shape[-1]}."
        )

    if np.isnan(data).any():

        raise ValueError(
            "❌ Dataset contains NaN values."
        )

    if np.isinf(data).any():

        raise ValueError(
            "❌ Dataset contains infinite values."
        )

    print("\n✅ Input data validation passed.")

    return data


# ============================================================
# CONVERT SENTINEL-1
# ============================================================

def convert_sentinel1_to_db(data):

    """
    Sentinel Hub returned Sentinel-1 values in linear power.

    BigEarthNet statistics use dB.

    dB = 10 * log10(linear_power)
    """

    print("\n📡 Converting Sentinel-1...")
    print("Linear power → dB")

    s1 = data[:, :, 0:2].copy()

    # Prevent log10(0)
    s1 = np.maximum(s1, 1e-10)

    s1_db = 10.0 * np.log10(s1)

    data[:, :, 0:2] = s1_db

    print("✅ Sentinel-1 converted to dB.")

    return data


# ============================================================
# CONVERT SENTINEL-2
# ============================================================

def convert_sentinel2_scale(data):

    """
    Sentinel Hub returned Sentinel-2 reflectance approximately
    in the 0-1 range.

    BigEarthNet v2 statistics use the approximately 0-10000
    reflectance scale.

    Therefore:

        reflectance × 10000
    """

    print("\n🛰️ Scaling Sentinel-2...")
    print("Reflectance: 0-1 → BigEarthNet scale")

    data[:, :, 2:12] *= 10000.0

    print("✅ Sentinel-2 scaled.")

    return data


# ============================================================
# CONVERT TO BIGEARTHNET SCALE
# ============================================================

def convert_to_bigearthnet_scale(data):

    print("\n")
    print("=" * 60)
    print("CONVERTING TO BIGEARTHNET SCALE")
    print("=" * 60)

    data = convert_sentinel1_to_db(data)

    data = convert_sentinel2_scale(data)

    return data


# ============================================================
# CREATE PATCHES
# ============================================================

def create_patches(data):

    height, width, num_bands = data.shape

    print("\n")
    print("=" * 60)
    print("CREATING 120 × 120 PATCHES")
    print("=" * 60)

    print(f"Input image: {height} × {width}")
    print(f"Bands: {num_bands}")
    print(f"Patch size: {PATCH_SIZE} × {PATCH_SIZE}")

    rows = height // PATCH_SIZE
    cols = width // PATCH_SIZE

    print(f"\nFull patch rows: {rows}")
    print(f"Full patch columns: {cols}")

    total_patches = rows * cols

    print(f"Total complete patches: {total_patches}")

    patches = []

    patch_number = 0

    for row in range(rows):

        for col in range(cols):

            y_start = row * PATCH_SIZE
            y_end = y_start + PATCH_SIZE

            x_start = col * PATCH_SIZE
            x_end = x_start + PATCH_SIZE

            patch = data[
                y_start:y_end,
                x_start:x_end,
                :
            ]

            # ------------------------------------------------
            # Convert:
            #
            # H × W × C
            #
            # to:
            #
            # C × H × W
            # ------------------------------------------------

            patch = np.transpose(
                patch,
                (2, 0, 1)
            )

            patches.append(patch)

            patch_number += 1

    patches = np.stack(
        patches,
        axis=0
    )

    print("\n✅ Patches created.")

    print(
        f"Patch array shape: {patches.shape}"
    )

    return patches


# ============================================================
# NORMALIZE (this is the function that got mis-renamed before —
# restored to its correct name/purpose here)
# ============================================================

def normalize_patches(patches):

    print("\n")
    print("=" * 60)
    print("NORMALIZING PATCHES")
    print("=" * 60)

    print(
        "Using official BigEarthNet v2.0 "
        "S1+S2 statistics."
    )

    means = np.array(
        [MEANS[band] for band in BANDS],
        dtype=np.float32
    )

    stds = np.array(
        [STDS[band] for band in BANDS],
        dtype=np.float32
    )

    print("\nBand normalization:")

    for i, band in enumerate(BANDS):

        print(
            f"{i:2d} → {band:4s} "
            f"mean={means[i]:10.4f} "
            f"std={stds[i]:10.4f}"
        )

    means = means.reshape(1, 12, 1, 1)
    stds = stds.reshape(1, 12, 1, 1)

    normalized = (patches - means) / stds
    normalized = normalized.astype(np.float32)

    print("\n✅ Normalization complete.")

    return normalized


# ============================================================
# SAVE RAW PATCHES
# ============================================================

def save_raw_patches(patches, suffix=""):

    output_file = os.path.join(
        OUTPUT_DIR,
        f"punjab_patches_raw{suffix}.npy"
    )

    np.save(
        output_file,
        patches
    )

    print("\n💾 Raw patches saved:")
    print(output_file)

    return output_file


# ============================================================
# SAVE NORMALIZED PATCHES
# ============================================================

def save_normalized_patches(patches, suffix=""):

    output_file = os.path.join(
        OUTPUT_DIR,
        f"punjab_patches_normalized{suffix}.npy"
    )

    np.save(
        output_file,
        patches
    )

    print("\n💾 Normalized patches saved:")
    print(output_file)

    return output_file


# ============================================================
# SAVE BAND INFORMATION
# ============================================================

def save_band_order():

    output_file = os.path.join(
        OUTPUT_DIR,
        "band_order.txt"
    )

    with open(
        output_file,
        "w"
    ) as f:

        for i, band in enumerate(BANDS):

            f.write(
                f"{i} -> {band}\n"
            )

    print("\n💾 Band order saved:")
    print(output_file)


# ============================================================
# MAIN
# ============================================================

def main(input_file=DEFAULT_INPUT_FILE, suffix=""):

    print("\n")
    print("=" * 60)
    print("🛰️ SatQueryAI PREPROCESSING")
    print("=" * 60)

    print(
        "Target: BigEarthNet v2.0 S1 + S2"
    )

    print(
        "Input bands: 12"
    )

    print(
        "Patch size: 120 × 120"
    )

    # --------------------------------------------------------
    # 1. LOAD
    # --------------------------------------------------------

    data = load_satellite_data(input_file)

    # --------------------------------------------------------
    # 2. CONVERT SCALE
    # --------------------------------------------------------

    data = convert_to_bigearthnet_scale(
        data
    )

    # --------------------------------------------------------
    # 3. CREATE PATCHES
    # --------------------------------------------------------

    patches = create_patches(
        data
    )

    # --------------------------------------------------------
    # 4. SAVE RAW PATCHES
    # --------------------------------------------------------

    save_raw_patches(
        patches, suffix=suffix
    )

    # --------------------------------------------------------
    # 5. NORMALIZE
    # --------------------------------------------------------

    normalized = normalize_patches(
        patches
    )

    # --------------------------------------------------------
    # 6. SAVE NORMALIZED
    # --------------------------------------------------------

    save_normalized_patches(
        normalized, suffix=suffix
    )

    # --------------------------------------------------------
    # 7. SAVE BAND ORDER
    # --------------------------------------------------------

    save_band_order()

    # --------------------------------------------------------
    # FINAL INFORMATION
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("✅ PREPROCESSING COMPLETE")
    print("=" * 60)

    print(
        f"\nOriginal image: {data.shape[0]} × "
        f"{data.shape[1]} × {data.shape[2]}"
    )

    print(
        f"Number of patches: {patches.shape[0]}"
    )

    print(
        f"Raw patch shape: {patches.shape}"
    )

    print(
        f"Normalized patch shape: {normalized.shape}"
    )

    print("\nFinal tensor format:")
    print(
        "(number_of_patches, 12, 120, 120)"
    )

    print("\nBand order:")

    for i, band in enumerate(BANDS):

        print(
            f"{i:2d} → {band}"
        )

    print("\n📁 Output directory:")
    print(OUTPUT_DIR)

    print(
        "\n🎉 Data is ready for the "
        "BigEarthNet pretrained model!"
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    arg_input_file = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT_FILE
    arg_suffix = sys.argv[2] if len(sys.argv) > 2 else ""

    main(input_file=arg_input_file, suffix=arg_suffix)