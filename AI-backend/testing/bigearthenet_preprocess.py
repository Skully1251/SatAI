import zipfile
import pandas as pd
import os

# ============================================================
# CONFIGURATION
# ============================================================

ZIP_PATH = "data/bigearthnet/bigearthnetv2.zip"
OUTPUT_DIR = "data/bigearthnet/sample"

NUM_SAMPLES = 50

# ============================================================
# CREATE OUTPUT DIRECTORY
# ============================================================

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("Opening BigEarthNet ZIP...")
print(f"ZIP: {ZIP_PATH}")

# ============================================================
# OPEN ZIP
# ============================================================

with zipfile.ZipFile(ZIP_PATH, "r") as z:

    # --------------------------------------------------------
    # 1. Read BigEarthNet labels
    # --------------------------------------------------------

    csv_path = "bigearthnet_s1s2/multilabel-train.csv"

    print("\nReading training labels...")

    with z.open(csv_path) as f:
        df = pd.read_csv(f)

    print(f"Total training samples: {len(df)}")

    # --------------------------------------------------------
    # 2. Select 50 samples
    # --------------------------------------------------------

    sample = df.sample(
        n=NUM_SAMPLES,
        random_state=42
    ).reset_index(drop=True)

    print(f"Selected {len(sample)} samples.")

    # --------------------------------------------------------
    # 3. Save metadata
    # --------------------------------------------------------

    metadata_path = os.path.join(
        OUTPUT_DIR,
        "sample_metadata.csv"
    )

    sample.to_csv(
        metadata_path,
        index=False
    )

    print(f"\nMetadata saved to:")
    print(metadata_path)

    # --------------------------------------------------------
    # 4. Extract paired S1 + S2 images
    # --------------------------------------------------------

    successful = 0

    for i, row in sample.iterrows():

        print("\n----------------------------------------")
        print(f"Sample {i + 1}/{NUM_SAMPLES}")
        print("----------------------------------------")

        # Exact paths stored in the CSV
        s1_path = (
            "bigearthnet_s1s2/"
            "BigEarthNet-S1-5%/"
            + row["s1_path"]
        )

        s2_path = (
            "bigearthnet_s1s2/"
            "BigEarthNet-S2-5%/"
            + row["s2_path"]
        )

        print("S1:")
        print(row["s1_path"])

        print("S2:")
        print(row["s2_path"])

        # ----------------------------------------------------
        # Create directory for this patch
        # ----------------------------------------------------

        patch_dir = os.path.join(
            OUTPUT_DIR,
            f"patch_{i:03d}"
        )

        os.makedirs(
            patch_dir,
            exist_ok=True
        )

        # ----------------------------------------------------
        # Extract S1
        # ----------------------------------------------------

        s1_output = os.path.join(
            patch_dir,
            "s1.tif"
        )

        try:

            with z.open(s1_path) as source:
                with open(s1_output, "wb") as target:
                    target.write(source.read())

        except KeyError:

            print("ERROR: S1 file not found in ZIP")
            print(s1_path)
            continue

        # ----------------------------------------------------
        # Extract S2
        # ----------------------------------------------------

        s2_output = os.path.join(
            patch_dir,
            "s2.tif"
        )

        try:

            with z.open(s2_path) as source:
                with open(s2_output, "wb") as target:
                    target.write(source.read())

        except KeyError:

            print("ERROR: S2 file not found in ZIP")
            print(s2_path)
            continue

        successful += 1

        print("S1 extracted successfully.")
        print("S2 extracted successfully.")

    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print("\n")
    print("========================================")
    print("BIGEARTHNET EXTRACTION COMPLETE")
    print("========================================")
    print(f"Requested samples : {NUM_SAMPLES}")
    print(f"Successful pairs  : {successful}")
    print(f"Output directory  : {OUTPUT_DIR}")
    print("========================================")