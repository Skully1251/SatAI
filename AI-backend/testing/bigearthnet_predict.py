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

MODEL_NAME = (
    "BIFOLD-BigEarthNetv2-0/"
    "resnet50-all-v0.2.0"
)

INPUT_PATH = os.path.join(
    BASE_DIR,
    "data",
    "bigearthnet",
    "bigearthnet_50_normalized.npy"
)

LABEL_PATH = os.path.join(
    BASE_DIR,
    "data",
    "bigearthnet",
    "bigearthnet_50_labels.npy"
)

OUTPUT_PATH = os.path.join(
    BASE_DIR,
    "data",
    "bigearthnet",
    "bigearthnet_50_predictions.npy"
)


# ============================================================
# MODEL CLASS ORDER
# ============================================================

# IMPORTANT:
# The pretrained BigEarthNet model outputs its 19 classes
# in alphabetical order.

CLASS_NAMES = [
    "Agro-forestry areas",
    "Arable land",
    "Beaches, dunes, sands",
    "Broad-leaved forest",
    "Coastal wetlands",
    "Complex cultivation patterns",
    "Coniferous forest",
    "Industrial or commercial units",
    "Inland waters",
    "Inland wetlands",
    "Land principally occupied by agriculture, with significant areas of natural vegetation",
    "Marine waters",
    "Mixed forest",
    "Moors, heathland and sclerophyllous vegetation",
    "Natural grassland and sparsely vegetated areas",
    "Pastures",
    "Permanent crops",
    "Transitional woodland, shrub",
    "Urban fabric"
]


# ============================================================
# CSV LABEL ORDER
# ============================================================

# This is the order used inside multilabel-train.csv.

CSV_CLASS_NAMES = [
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


# ============================================================
# DEVICE
# ============================================================

def get_device():

    if torch.backends.mps.is_available():

        print("Using device: mps")

        return torch.device("mps")

    elif torch.cuda.is_available():

        print("Using device: cuda")

        return torch.device("cuda")

    else:

        print("Using device: cpu")

        return torch.device("cpu")


# ============================================================
# LOAD DATA
# ============================================================

def load_data():

    print()
    print("Loading BigEarthNet data...")

    # --------------------------------------------------------
    # Check files
    # --------------------------------------------------------

    if not os.path.exists(INPUT_PATH):

        raise FileNotFoundError(
            f"Input file not found:\n{INPUT_PATH}"
        )

    if not os.path.exists(LABEL_PATH):

        raise FileNotFoundError(
            f"Label file not found:\n{LABEL_PATH}"
        )

    # --------------------------------------------------------
    # Load
    # --------------------------------------------------------

    X = np.load(INPUT_PATH)
    Y = np.load(LABEL_PATH)

    print("Input shape :", X.shape)
    print("Labels shape:", Y.shape)

    # --------------------------------------------------------
    # Reorder labels
    # --------------------------------------------------------

    label_indices = [
        CSV_CLASS_NAMES.index(name)
        for name in CLASS_NAMES
    ]

    Y = Y[:, label_indices]

    print(
        "Labels reordered to model class order."
    )

    # --------------------------------------------------------
    # Validate input
    # --------------------------------------------------------

    if X.ndim != 4:

        raise ValueError(
            f"Expected 4D input, got {X.ndim}D"
        )

    if X.shape[1] != 12:

        raise ValueError(
            f"Expected 12 channels, got {X.shape[1]}"
        )

    if X.shape[2] != 120:

        raise ValueError(
            f"Expected height 120, got {X.shape[2]}"
        )

    if X.shape[3] != 120:

        raise ValueError(
            f"Expected width 120, got {X.shape[3]}"
        )

    # --------------------------------------------------------
    # Validate labels
    # --------------------------------------------------------

    if Y.ndim != 2:

        raise ValueError(
            f"Expected 2D labels, got {Y.ndim}D"
        )

    if Y.shape[0] != X.shape[0]:

        raise ValueError(
            "Number of images and labels do not match."
        )

    if Y.shape[1] != 19:

        raise ValueError(
            f"Expected 19 labels, got {Y.shape[1]}"
        )

    # --------------------------------------------------------
    # Check finite
    # --------------------------------------------------------

    if not np.isfinite(X).all():

        raise ValueError(
            "Input contains NaN or Inf."
        )

    print("Data validation passed.")

    return X, Y


# ============================================================
# LOAD MODEL
# ============================================================

def load_model(device):

    print()
    print("Loading ResNet-50...")

    print(
        f"Model: {MODEL_NAME}"
    )

    model = (
        BigEarthNetv2_0_ImageClassifier
        .from_pretrained(
            MODEL_NAME
        )
    )

    model = model.to(device)

    model.eval()

    print("Model loaded.")

    return model


# ============================================================
# RUN INFERENCE
# ============================================================

def run_inference(
    model,
    X,
    device,
    batch_size=16
):

    print()
    print("Running inference...")

    number_of_samples = X.shape[0]

    predictions = []

    # --------------------------------------------------------
    # Batch inference
    # --------------------------------------------------------

    for start in range(
        0,
        number_of_samples,
        batch_size
    ):

        end = min(
            start + batch_size,
            number_of_samples
        )

        print(
            f"Processing patches "
            f"{start} → {end - 1}"
        )

        batch = X[start:end]

        batch = torch.from_numpy(
            batch
        ).float()

        batch = batch.to(device)

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

    # --------------------------------------------------------
    # Combine batches
    # --------------------------------------------------------

    predictions = np.concatenate(
        predictions,
        axis=0
    )

    print()
    print("Inference complete.")

    print(
        "Prediction shape:",
        predictions.shape
    )

    # --------------------------------------------------------
    # Validate predictions
    # --------------------------------------------------------

    if predictions.shape != (
        number_of_samples,
        19
    ):

        raise ValueError(
            f"Unexpected prediction shape: "
            f"{predictions.shape}"
        )

    if not np.isfinite(predictions).all():

        raise ValueError(
            "Predictions contain NaN or Inf."
        )

    return predictions


# ============================================================
# SAVE PREDICTIONS
# ============================================================

def save_predictions(predictions):

    np.save(
        OUTPUT_PATH,
        predictions
    )

    print()
    print("Predictions saved:")
    print(OUTPUT_PATH)


# ============================================================
# BASIC STATISTICS
# ============================================================

def print_statistics(predictions):

    print()
    print("=" * 60)
    print("PREDICTION STATISTICS")
    print("=" * 60)

    print(
        f"Min probability    : "
        f"{predictions.min():.6f}"
    )

    print(
        f"Max probability    : "
        f"{predictions.max():.6f}"
    )

    print(
        f"Mean probability   : "
        f"{predictions.mean():.6f}"
    )

    print(
        f"Median probability : "
        f"{np.median(predictions):.6f}"
    )


# ============================================================
# MEAN PROBABILITY PER CLASS
# ============================================================

def print_mean_probabilities(predictions):

    print()
    print("=" * 60)
    print("MEAN PROBABILITY PER CLASS")
    print("=" * 60)

    mean_probs = predictions.mean(
        axis=0
    )

    sorted_indices = np.argsort(
        mean_probs
    )[::-1]

    for idx in sorted_indices:

        print(
            f"{CLASS_NAMES[idx]:55s}"
            f"{mean_probs[idx]:.6f}"
        )


# ============================================================
# TOP PREDICTIONS PER PATCH
# ============================================================

def print_top_predictions(predictions):

    print()
    print("=" * 60)
    print("TOP PREDICTION PER PATCH")
    print("=" * 60)

    for i in range(
        len(predictions)
    ):

        scores = predictions[i]

        top_idx = np.argmax(
            scores
        )

        print(
            f"Patch {i:02d}: "
            f"{CLASS_NAMES[top_idx]:55s}"
            f"{scores[top_idx]:.4f}"
        )


# ============================================================
# EVALUATION
# ============================================================

def evaluate(
    predictions,
    labels,
    threshold=0.5
):

    print()
    print("=" * 60)
    print("SIMPLE EVALUATION")
    print("=" * 60)

    # --------------------------------------------------------
    # Convert probabilities to binary labels
    # --------------------------------------------------------

    pred_binary = (
        predictions >= threshold
    ).astype(np.float32)

    true_binary = (
        labels >= threshold
    ).astype(np.float32)

    # --------------------------------------------------------
    # Exact match
    # --------------------------------------------------------

    exact_matches = np.all(
        pred_binary == true_binary,
        axis=1
    )

    exact_accuracy = (
        exact_matches.mean()
    )

    print(
        f"Threshold: {threshold}"
    )

    print(
        f"Exact-match accuracy: "
        f"{exact_accuracy:.4f}"
    )

    # --------------------------------------------------------
    # Per-class metrics
    # --------------------------------------------------------

    print()

    print(
        f"{'Class':55s}"
        f"{'Precision':>10s}"
        f"{'Recall':>10s}"
        f"{'F1':>10s}"
    )

    print("-" * 85)

    f1_scores = []

    for c in range(19):

        tp = np.sum(
            (pred_binary[:, c] == 1)
            &
            (true_binary[:, c] == 1)
        )

        fp = np.sum(
            (pred_binary[:, c] == 1)
            &
            (true_binary[:, c] == 0)
        )

        fn = np.sum(
            (pred_binary[:, c] == 0)
            &
            (true_binary[:, c] == 1)
        )

        # ----------------------------------------------------
        # Precision
        # ----------------------------------------------------

        if (tp + fp) > 0:

            precision = (
                tp / (tp + fp)
            )

        else:

            precision = 0.0

        # ----------------------------------------------------
        # Recall
        # ----------------------------------------------------

        if (tp + fn) > 0:

            recall = (
                tp / (tp + fn)
            )

        else:

            recall = 0.0

        # ----------------------------------------------------
        # F1
        # ----------------------------------------------------

        if (precision + recall) > 0:

            f1 = (
                2
                * precision
                * recall
                / (precision + recall)
            )

        else:

            f1 = 0.0

        f1_scores.append(f1)

        print(
            f"{CLASS_NAMES[c]:55s}"
            f"{precision:10.4f}"
            f"{recall:10.4f}"
            f"{f1:10.4f}"
        )

    # --------------------------------------------------------
    # Macro F1
    # --------------------------------------------------------

    macro_f1 = np.mean(
        f1_scores
    )

    print()
    print(
        f"Macro F1: {macro_f1:.4f}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("SATQUERYAI")
    print("=" * 60)

    print(
        "BigEarthNet v2.0 S1 + S2 Diagnostic"
    )

    print()
    print(
        f"Model: {MODEL_NAME}"
    )

    # --------------------------------------------------------
    # Device
    # --------------------------------------------------------

    device = get_device()

    # --------------------------------------------------------
    # Load data
    # --------------------------------------------------------

    X, Y = load_data()

    # --------------------------------------------------------
    # Load model
    # --------------------------------------------------------

    model = load_model(
        device
    )

    # --------------------------------------------------------
    # Run inference
    # --------------------------------------------------------

    predictions = run_inference(
        model,
        X,
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
    # Statistics
    # --------------------------------------------------------

    print_statistics(
        predictions
    )

    # --------------------------------------------------------
    # Mean class probabilities
    # --------------------------------------------------------

    print_mean_probabilities(
        predictions
    )

    # --------------------------------------------------------
    # Top predictions
    # --------------------------------------------------------

    print_top_predictions(
        predictions
    )

    # --------------------------------------------------------
    # Evaluation
    # --------------------------------------------------------

    evaluate(
        predictions,
        Y,
        threshold=0.5
    )

    # --------------------------------------------------------
    # Done
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("BIGEARTHNET DIAGNOSTIC COMPLETE")
    print("=" * 60)


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()