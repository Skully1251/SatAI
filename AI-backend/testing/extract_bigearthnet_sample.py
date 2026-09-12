import zipfile
import pandas as pd
import os

ZIP_PATH = "data/bigearthnet/bigearthnetv2.zip"
OUTPUT_DIR = "data/bigearthnet/sample"

NUM_SAMPLES = 50

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("Opening BigEarthNet ZIP...")

with zipfile.ZipFile(ZIP_PATH, "r") as z:

    # ---------------------------------------------------------
    # 1. Read training labels directly from ZIP
    # ---------------------------------------------------------

    csv_path = "bigearthnet_s1s2/multilabel-train.csv"

    with z.open(csv_path) as f:
        df = pd.read_csv(f)

    print(f"Total training pairs: {len(df)}")

    # ---------------------------------------------------------
    # 2. Select 50 samples
    # ---------------------------------------------------------

    sample = df.sample(
        n=NUM_SAMPLES,
        random_state=42
    ).reset_index(drop=True)

    print(f"Selected {len(sample)} samples.")

    # ---------------------------------------------------------
    # 3. Save labels/metadata
    # ---------------------------------------------------------

    sample.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "sample_metadata.csv"
        ),
        index=False
    )

    # ---------------------------------------------------------
    # 4. Extract paired S1 + S2 files
    # ---------------------------------------------------------

    for i, row in sample.iterrows():

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

        print(f"\n[{i+1}/{NUM_SAMPLES}]")

        print("S1:", row["s1_path"])
        print("S2:", row["s2_path"])

        # Create sample-specific folder
        patch_dir = os.path.join(
            OUTPUT_DIR,
            f"patch_{i:03d}"
        )

        os.makedirs(patch_dir, exist_ok=True)

        # Extract S1
        s1_output = os.path.join(
            patch_dir,
            "s1.tif"
        )

        with z.open(s1_path) as source:
            with open(s1_output, "wb") as target:
                target.write(source.read())

        # Extract S2
        s2_output = os.path.join(
            patch_dir,
            "s2.tif"
        )

        with z.open(s2_path) as source:
            with open(s2_output, "wb") as target:
                target.write(source.read())

    print("\n========================================")
    print("Extraction complete!")
    print("========================================")
    print(f"Samples: {NUM_SAMPLES}")
    print(f"Output:  {OUTPUT_DIR}")