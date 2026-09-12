import os
import sys
import numpy as np
import torch


# ============================================================
# PROJECT PATHS
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


# ============================================================
# BIGEARTHNET MODEL
# ============================================================

from reben_publication.BigEarthNetv2_0_ImageClassifier import (
    BigEarthNetv2_0_ImageClassifier
)


MODEL_NAME = (
    "BIFOLD-BigEarthNetv2-0/"
    "resnet50-all-v0.2.0"
)


# ============================================================
# FILES
# ============================================================

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


# ============================================================
# CONFIGURATION
# ============================================================

PATCH_SIZE = 120

NUM_BANDS = 12

NUM_CLASSES = 19


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
# BIGEARTHNET CLASSES
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
    print("📦 LOADING PUNJAB PATCHES")
    print("=" * 60)

    print(
        f"File: {PATCH_FILE}"
    )

    if not os.path.exists(PATCH_FILE):

        raise FileNotFoundError(
            f"Patch file not found:\n{PATCH_FILE}"
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

    # --------------------------------------------------------
    # Validate shape
    # --------------------------------------------------------

    if patches.ndim != 4:

        raise ValueError(
            "Expected shape "
            "(N, 12, 120, 120)"
        )

    if patches.shape[1] != NUM_BANDS:

        raise ValueError(
            f"Expected {NUM_BANDS} bands, "
            f"got {patches.shape[1]}"
        )

    if patches.shape[2] != PATCH_SIZE:

        raise ValueError(
            f"Expected height {PATCH_SIZE}, "
            f"got {patches.shape[2]}"
        )

    if patches.shape[3] != PATCH_SIZE:

        raise ValueError(
            f"Expected width {PATCH_SIZE}, "
            f"got {patches.shape[3]}"
        )

    print(
        "\n✅ Patch validation passed."
    )

    return patches


# ============================================================
# LOAD MODEL
# ============================================================

def load_model(device):

    print("\n")
    print("=" * 60)
    print("🤖 LOADING RESNET-50")
    print("=" * 60)

    print(
        f"Model: {MODEL_NAME}"
    )

    model = (
        BigEarthNetv2_0_ImageClassifier
        .from_pretrained(
            MODEL_NAME
        )
    )

    model = model.to(
        device
    )

    model.eval()

    print(
        "\n✅ Model loaded."
    )

    return model


# ============================================================
# RUN PATCH INFERENCE
# ============================================================

def run_inference(
    model,
    patches,
    device,
    batch_size=16
):

    print("\n")
    print("=" * 60)
    print("🔮 PATCH-BASED INFERENCE")
    print("=" * 60)

    num_patches = patches.shape[0]

    print(
        f"Number of patches: {num_patches}"
    )

    print(
        f"Batch size: {batch_size}"
    )

    predictions = []

    for start in range(
        0,
        num_patches,
        batch_size
    ):

        end = min(
            start + batch_size,
            num_patches
        )

        batch = patches[
            start:end
        ]

        batch = torch.from_numpy(
            batch
        ).float()

        batch = batch.to(
            device
        )

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
            f"Processed "
            f"{start} → {end - 1}"
        )

    predictions = np.concatenate(
        predictions,
        axis=0
    )

    print(
        "\n✅ Inference complete."
    )

    print(
        f"Prediction shape: "
        f"{predictions.shape}"
    )

    return predictions


# ============================================================
# CREATE SPATIAL GRID
# ============================================================

def create_spatial_grid(
    predictions
):

    print("\n")
    print("=" * 60)
    print("🗺️ CREATING SPATIAL PREDICTION GRID")
    print("=" * 60)

    num_patches = predictions.shape[0]

    # --------------------------------------------------------
    # Determine grid dimensions
    #
    # Current preprocessing creates:
    #
    # 18 rows × 15 columns = 270 patches
    # --------------------------------------------------------

    rows = 18
    cols = 15

    expected = rows * cols

    if num_patches != expected:

        raise ValueError(
            f"Expected {expected} patches "
            f"for {rows}×{cols} grid, "
            f"got {num_patches}"
        )

    grid = predictions.reshape(
        rows,
        cols,
        NUM_CLASSES
    )

    print(
        f"Spatial grid shape: "
        f"{grid.shape}"
    )

    print(
        f"Grid dimensions: "
        f"{rows} rows × {cols} columns"
    )

    return grid


# ============================================================
# SAVE PREDICTIONS
# ============================================================

def save_predictions(
    predictions,
    grid
):

    patch_file = os.path.join(
        OUTPUT_DIR,
        "punjab_patch_predictions.npy"
    )

    grid_file = os.path.join(
        OUTPUT_DIR,
        "punjab_prediction_grid.npy"
    )

    np.save(
        patch_file,
        predictions
    )

    np.save(
        grid_file,
        grid
    )

    print("\n💾 Saved:")

    print(
        patch_file
    )

    print(
        grid_file
    )


# ============================================================
# CREATE CLASS MAP
# ============================================================

def create_class_map(
    grid
):

    print("\n")
    print("=" * 60)
    print("🏷️ CREATING CLASS MAP")
    print("=" * 60)

    # --------------------------------------------------------
    # For every spatial patch:
    #
    # choose the class with highest probability
    # --------------------------------------------------------

    class_map = np.argmax(
        grid,
        axis=2
    )

    confidence_map = np.max(
        grid,
        axis=2
    )

    print(
        f"Class map shape: "
        f"{class_map.shape}"
    )

    print(
        f"Confidence map shape: "
        f"{confidence_map.shape}"
    )

    return class_map, confidence_map


# ============================================================
# SAVE CLASS MAP
# ============================================================

def save_class_map(
    class_map,
    confidence_map
):

    class_file = os.path.join(
        OUTPUT_DIR,
        "punjab_class_map.npy"
    )

    confidence_file = os.path.join(
        OUTPUT_DIR,
        "punjab_confidence_map.npy"
    )

    np.save(
        class_file,
        class_map
    )

    np.save(
        confidence_file,
        confidence_map
    )

    print("\n💾 Spatial outputs saved:")

    print(
        class_file
    )

    print(
        confidence_file
    )


# ============================================================
# DISPLAY PATCH RESULTS
# ============================================================

def display_results(
    grid,
    class_map,
    confidence_map
):

    print("\n")
    print("=" * 60)
    print("📊 SPATIAL RESULTS")
    print("=" * 60)

    rows, cols = class_map.shape

    for row in range(rows):

        for col in range(cols):

            class_index = class_map[
                row,
                col
            ]

            confidence = confidence_map[
                row,
                col
            ]

            class_name = CLASS_NAMES[
                class_index
            ]

            print(
                f"Patch "
                f"({row:02d}, {col:02d}) → "
                f"{class_name} "
                f"({confidence:.4f})"
            )


# ============================================================
# SAVE HUMAN-READABLE GRID
# ============================================================

def save_grid_text(
    class_map,
    confidence_map
):

    output_file = os.path.join(
        OUTPUT_DIR,
        "punjab_spatial_results.txt"
    )

    with open(
        output_file,
        "w"
    ) as f:

        f.write(
            "SatQueryAI Spatial Prediction Grid\n"
        )

        f.write(
            "=" * 70 + "\n\n"
        )

        rows, cols = class_map.shape

        for row in range(rows):

            for col in range(cols):

                class_index = class_map[
                    row,
                    col
                ]

                confidence = confidence_map[
                    row,
                    col
                ]

                class_name = CLASS_NAMES[
                    class_index
                ]

                f.write(
                    f"Patch ({row},{col}) | "
                    f"{class_name} | "
                    f"confidence={confidence:.6f}\n"
                )

    print(
        f"\n💾 Human-readable results saved:\n"
        f"{output_file}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("\n")
    print("=" * 60)
    print("🛰️ SATQUERYAI")
    print("=" * 60)

    print(
        "Spatial Patch-Based AI Inference"
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
    # Spatial grid
    # --------------------------------------------------------

    grid = create_spatial_grid(
        predictions
    )

    # --------------------------------------------------------
    # Class map
    # --------------------------------------------------------

    class_map, confidence_map = (
        create_class_map(
            grid
        )
    )

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    save_predictions(
        predictions,
        grid
    )

    save_class_map(
        class_map,
        confidence_map
    )

    save_grid_text(
        class_map,
        confidence_map
    )

    # --------------------------------------------------------
    # Display
    # --------------------------------------------------------

    display_results(
        grid,
        class_map,
        confidence_map
    )

    print("\n")
    print("=" * 60)
    print("🎉 PATCH INFERENCE COMPLETE")
    print("=" * 60)

    print(
        "\nYour satellite scene now has "
        "a spatial AI prediction for "
        "every 120×120 patch."
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()