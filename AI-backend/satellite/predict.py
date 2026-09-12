import os
import sys
import numpy as np
import torch


# ============================================================
# MAKE BIGEARTHNET MODEL PACKAGE VISIBLE
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

REBEN_DIR = os.path.join(
    BASE_DIR,
    "reben-training-scripts"
)

if REBEN_DIR not in sys.path:
    sys.path.insert(0, REBEN_DIR)


from reben_publication.BigEarthNetv2_0_ImageClassifier import (
    BigEarthNetv2_0_ImageClassifier
)
# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

PATCH_FILE = os.path.join( 
    BASE_DIR,
    "data",
    "patches",
    "punjab_patches_normalized.npy"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "predictions"
)

os.makedirs(
    OUTPUT_DIR,
    exist_ok=True
)


# Official BigEarthNet v2.0 S1 + S2 model
MODEL_NAME = (
    "BIFOLD-BigEarthNetv2-0/"
    "resnet50-all-v0.2.0"
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
    "B12",
]


# ============================================================
# BIGEARTHNET 19 CLASSES
# ============================================================

CLASS_NAMES = [
    "Urban fabric",

    "Industrial or commercial units",

    "Arable land",

    "Permanent crops",

    "Pastures",

    "Complex cultivation patterns",

    "Land principally occupied by agriculture, "
    "with significant areas of natural vegetation",

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
# DEVICE
# ============================================================

def get_device():

    if torch.backends.mps.is_available():

        print("🚀 Using Apple Silicon MPS")

        return torch.device("mps")

    if torch.cuda.is_available():

        print("🚀 Using NVIDIA CUDA")

        return torch.device("cuda")

    print("💻 Using CPU")

    return torch.device("cpu")


# ============================================================
# LOAD PATCHES
# ============================================================

def load_patches():

    print("\n")
    print("=" * 60)
    print("📦 LOADING PREPROCESSED PATCHES")
    print("=" * 60)

    print(f"File: {PATCH_FILE}")

    if not os.path.exists(PATCH_FILE):

        raise FileNotFoundError(
            f"\n❌ Patch file not found:\n{PATCH_FILE}"
        )

    patches = np.load(
        PATCH_FILE
    )

    print(
        f"Shape: {patches.shape}"
    )

    print(
        f"Dtype: {patches.dtype}"
    )

    # Expected:
    #
    # N × 12 × 120 × 120
    #

    if patches.ndim != 4:

        raise ValueError(
            "Expected patches with shape "
            "(N, 12, 120, 120)"
        )

    if patches.shape[1] != 12:

        raise ValueError(
            f"Expected 12 bands, "
            f"got {patches.shape[1]}"
        )

    if patches.shape[2] != 120:

        raise ValueError(
            f"Expected height 120, "
            f"got {patches.shape[2]}"
        )

    if patches.shape[3] != 120:

        raise ValueError(
            f"Expected width 120, "
            f"got {patches.shape[3]}"
        )

    print("\n✅ Patch validation passed.")

    return patches


# ============================================================
# LOAD MODEL
# ============================================================

def load_model(device):

    print("\n")
    print("=" * 60)
    print("🤖 LOADING BIGEARTHNET V2.0 MODEL")
    print("=" * 60)

    print(
        f"Model: {MODEL_NAME}"
    )

    print(
        "\nDownloading/loading pretrained weights..."
    )

    model = BigEarthNetv2_0_ImageClassifier.from_pretrained(
        MODEL_NAME
    )

    model = model.to(
        device
    )

    model.eval()

    print("\n✅ Model loaded successfully.")

    return model


# ============================================================
# RUN INFERENCE
# ============================================================

def run_inference(
    model,
    patches,
    device,
    batch_size=16
):

    print("\n")
    print("=" * 60)
    print("🔮 RUNNING INFERENCE")
    print("=" * 60)

    number_of_patches = patches.shape[0]

    print(
        f"Number of patches: {number_of_patches}"
    )

    print(
        f"Batch size: {batch_size}"
    )

    predictions = []

    for start in range(
        0,
        number_of_patches,
        batch_size
    ):

        end = min(
            start + batch_size,
            number_of_patches
        )

        batch = patches[
            start:end
        ]

        # NumPy → PyTorch
        batch = torch.from_numpy(
            batch
        ).float()

        batch = batch.to(
            device
        )

        # ----------------------------------------------------
        # Model inference
        # ----------------------------------------------------

        with torch.no_grad():

            logits = model(
                batch
            )

            probabilities = torch.sigmoid(
                logits
            )

        probabilities = (
            probabilities
            .detach()
            .cpu()
            .numpy()
        )

        predictions.append(
            probabilities
        )

        print(
            f"Processed patches "
            f"{start} → {end - 1}"
        )

    predictions = np.concatenate(
        predictions,
        axis=0
    )

    print("\n✅ Inference complete.")

    print(
        f"Prediction shape: "
        f"{predictions.shape}"
    )

    return predictions


# ============================================================
# SAVE PREDICTIONS
# ============================================================

def save_predictions(predictions):

    output_file = os.path.join(
        OUTPUT_DIR,
        "punjab_predictions.npy"
    )

    np.save(
        output_file,
        predictions
    )

    print("\n💾 Predictions saved:")
    print(output_file)

    return output_file


# ============================================================
# DISPLAY RESULTS
# ============================================================

def display_results(predictions):

    print("\n")
    print("=" * 60)
    print("📊 PREDICTION RESULTS")
    print("=" * 60)

    print(
        "\nShowing predictions for each patch."
    )

    # --------------------------------------------------------
    # Show top classes for each patch
    # --------------------------------------------------------

    for patch_index in range(
        len(predictions)
    ):

        scores = predictions[
            patch_index
        ]

        # Get indices sorted by probability
        top_indices = np.argsort(
            scores
        )[::-1][:5]

        print("\n")
        print(
            f"PATCH {patch_index}"
        )

        print("-" * 50)

        for index in top_indices:

            print(
                f"{CLASS_NAMES[index]:65s}"
                f"{scores[index]:.4f}"
            )


# ============================================================
# CREATE SUMMARY
# ============================================================

def create_summary(predictions):

    print("\n")
    print("=" * 60)
    print("🗺️ PUNJAB LAND-COVER SUMMARY")
    print("=" * 60)

    # Average probability across all patches

    mean_scores = predictions.mean(
        axis=0
    )

    sorted_indices = np.argsort(
        mean_scores
    )[::-1]

    print(
        "\nAverage prediction across "
        "all Punjab patches:\n"
    )

    for index in sorted_indices:

        print(
            f"{CLASS_NAMES[index]:65s}"
            f"{mean_scores[index]:.4f}"
        )

    # Save summary

    summary_file = os.path.join(
        OUTPUT_DIR,
        "punjab_summary.txt"
    )

    with open(
        summary_file,
        "w"
    ) as f:

        f.write(
            "SatQueryAI - BigEarthNet v2.0 "
            "Punjab Prediction Summary\n"
        )

        f.write(
            "=" * 70 + "\n\n"
        )

        for index in sorted_indices:

            f.write(
                f"{CLASS_NAMES[index]}: "
                f"{mean_scores[index]:.6f}\n"
            )

    print(
        f"\n💾 Summary saved:\n{summary_file}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("\n")
    print("=" * 60)
    print("🛰️ SatQueryAI")
    print("=" * 60)

    print(
        "BigEarthNet v2.0 S1 + S2 Inference"
    )

    print(
        f"\nModel: {MODEL_NAME}"
    )

    print(
        "\nBands:"
    )

    for i, band in enumerate(BANDS):

        print(
            f"{i:2d} → {band}"
        )

    # --------------------------------------------------------
    # Device
    # --------------------------------------------------------

    device = get_device()

    # --------------------------------------------------------
    # Load patches
    # --------------------------------------------------------

    patches = load_patches()

    # --------------------------------------------------------
    # Load model
    # --------------------------------------------------------

    model = load_model(
        device
    )

    # --------------------------------------------------------
    # Inference
    # --------------------------------------------------------

    predictions = run_inference(
        model,
        patches,
        device,
        batch_size=16
    )

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    save_predictions(
        predictions
    )

    # --------------------------------------------------------
    # Display
    # --------------------------------------------------------

    display_results(
        predictions
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    create_summary(
        predictions
    )

    # --------------------------------------------------------
    # Complete
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("🎉 BIGEARTHNET INFERENCE COMPLETE")
    print("=" * 60)

    print(
        "\nYour Punjab satellite imagery has now "
        "been processed by the pretrained "
        "S1 + S2 BigEarthNet model."
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()