"""
testing/finetune_resnet50.py

Short fine-tune of the pretrained BigEarthNet v2.0 ResNet-50 on a sample
of official BigEarthNet patches, using the SAME validated preprocessing
(fixed S2_KEEP) and label ordering as bigearthnet_predict.py.

Only unfreezes the last ~15 leaf modules (final residual block + head),
found by walking the module tree rather than guessing names — this is
version-agnostic since "vision_encoder" wraps the whole timm model as a
single child, which made name-based freezing grab everything.

Trains a few epochs at a low LR. This is meant to demonstrate genuine
adaptation without an expensive full training run — the pretrained model
already scores ~0.70 macro F1 on the fixed preprocessing pipeline, so
we're not chasing SOTA here, and with only ~40 train patches we need to
stay conservative to avoid collapsing the model.

Expects the same directory layout as your diagnostic:
  data/bigearthnet/sample/patch_XXX/{s1.tif, s2.tif}
  data/bigearthnet/sample/sample_metadata.csv
"""

import os
import numpy as np
import pandas as pd
import rasterio
from rasterio.enums import Resampling
import torch
from torch.utils.data import Dataset, DataLoader, random_split
from sklearn.metrics import f1_score

from reben_publication.BigEarthNetv2_0_ImageClassifier import BigEarthNetv2_0_ImageClassifier


# ============================================================
# CONFIG
# ============================================================

INPUT_DIR = "data/bigearthnet/sample"
CHECKPOINT_DIR = "models/resnet50_finetuned"
MODEL_NAME = "BIFOLD-BigEarthNetv2-0/resnet50-all-v0.2.0"

EPOCHS = 3
BATCH_SIZE = 16
LR = 5e-6
VAL_FRACTION = 0.2
THRESHOLD = 0.5
NUM_LEAF_MODULES_TO_UNFREEZE = 15

# Validated normalization stats (120_nearest preset, matches Resampling.nearest)
MEANS = np.array([
    -12.643863677978516, -19.352558135986328, 438.3720703125, 614.0556640625,
    588.4096069335938, 942.8433227539062, 1769.931640625, 2049.551513671875,
    2193.2919921875, 2235.556640625, 1568.226806640625, 997.7324829101562,
], dtype=np.float32)

STDS = np.array([
    5.133493900299072, 5.590505599975586, 607.02685546875, 603.2968139648438,
    684.56884765625, 738.4326782226562, 1100.4560546875, 1275.805419921875,
    1369.3717041015625, 1356.5440673828125, 1070.1612548828125, 813.5276489257812,
], dtype=np.float32)

# CORRECTED indices (see bug fix from earlier diagnostic)
S2_KEEP = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12]

CSV_ORDER_CLASSES = [
    "Urban fabric", "Industrial or commercial units", "Arable land", "Permanent crops",
    "Pastures", "Complex cultivation patterns",
    "Land principally occupied by agriculture, with significant areas of natural vegetation",
    "Agro-forestry areas", "Broad-leaved forest", "Coniferous forest", "Mixed forest",
    "Natural grassland and sparsely vegetated areas",
    "Moors, heathland and sclerophyllous vegetation", "Transitional woodland, shrub",
    "Beaches, dunes, sands", "Inland wetlands", "Coastal wetlands", "Inland waters",
    "Marine waters",
]

ALPHABETICAL_CLASSES = [
    "Agro-forestry areas", "Arable land", "Beaches, dunes, sands", "Broad-leaved forest",
    "Coastal wetlands", "Complex cultivation patterns", "Coniferous forest",
    "Industrial or commercial units", "Inland waters", "Inland wetlands",
    "Land principally occupied by agriculture, with significant areas of natural vegetation",
    "Marine waters", "Mixed forest", "Moors, heathland and sclerophyllous vegetation",
    "Natural grassland and sparsely vegetated areas", "Pastures", "Permanent crops",
    "Transitional woodland, shrub", "Urban fabric",
]

REORDER_IDX = [CSV_ORDER_CLASSES.index(c) for c in ALPHABETICAL_CLASSES]


# ============================================================
# DATASET
# ============================================================

class BigEarthNetDataset(Dataset):
    def __init__(self, patch_dirs, labels):
        self.patch_dirs = patch_dirs
        self.labels = labels  # already reordered to alphabetical, (N, 19)

    def __len__(self):
        return len(self.patch_dirs)

    def __getitem__(self, idx):
        patch_dir = self.patch_dirs[idx]

        with rasterio.open(os.path.join(patch_dir, "s1.tif")) as src:
            s1 = src.read().astype(np.float32)  # (2, 120, 120), already in dB

        with rasterio.open(os.path.join(patch_dir, "s2.tif")) as src:
            s2 = src.read(
                S2_KEEP, out_shape=(len(S2_KEEP), 120, 120), resampling=Resampling.nearest
            ).astype(np.float32)

        combined = np.concatenate([s1, s2], axis=0)  # (12, 120, 120)
        normalized = (combined - MEANS.reshape(12, 1, 1)) / STDS.reshape(12, 1, 1)

        x = torch.from_numpy(normalized.astype(np.float32))
        y = torch.from_numpy(self.labels[idx].astype(np.float32))
        return x, y


# ============================================================
# MAIN
# ============================================================

def main():
    device = (
        "mps" if torch.backends.mps.is_available()
        else "cuda" if torch.cuda.is_available()
        else "cpu"
    )
    print(f"Using device: {device}")

    # --------------------------------------------------------
    # Load metadata + build patch list
    # --------------------------------------------------------
    metadata_path = os.path.join(INPUT_DIR, "sample_metadata.csv")
    df = pd.read_csv(metadata_path)

    patch_dirs = [os.path.join(INPUT_DIR, d) for d in sorted(os.listdir(INPUT_DIR))
                  if d.startswith("patch_") and os.path.isdir(os.path.join(INPUT_DIR, d))]

    print(f"Found {len(patch_dirs)} patches")

    labels_csv_order = df[CSV_ORDER_CLASSES].values.astype(np.float32)
    labels_alphabetical = labels_csv_order[:, REORDER_IDX]

    assert len(patch_dirs) == labels_alphabetical.shape[0], \
        "Mismatch between number of patch folders and metadata rows — check sort order."

    dataset = BigEarthNetDataset(patch_dirs, labels_alphabetical)

    val_size = int(len(dataset) * VAL_FRACTION)
    train_size = len(dataset) - val_size
    train_ds, val_ds = random_split(
        dataset, [train_size, val_size], generator=torch.Generator().manual_seed(42)
    )
    print(f"Train: {len(train_ds)}  Val: {len(val_ds)}")

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    # --------------------------------------------------------
    # Load model
    # --------------------------------------------------------
    model = BigEarthNetv2_0_ImageClassifier.from_pretrained(MODEL_NAME)
    model.to(device)

    inner = model.model  # the wrapped timm model

    # --------------------------------------------------------
    # Freeze everything, then unfreeze only the last N leaf modules
    # (found by walking the tree — version/name agnostic).
    # --------------------------------------------------------
    for p in inner.parameters():
        p.requires_grad = False

    leaf_modules = [
        (n, m) for n, m in inner.named_modules()
        if len(list(m.children())) == 0 and any(True for _ in m.parameters(recurse=False))
    ]
    print(f"Total leaf modules: {len(leaf_modules)}")
    print(f"Last {NUM_LEAF_MODULES_TO_UNFREEZE} leaf module names:",
          [n for n, _ in leaf_modules[-NUM_LEAF_MODULES_TO_UNFREEZE:]])

    unfrozen_names = []
    for name, module in leaf_modules[-NUM_LEAF_MODULES_TO_UNFREEZE:]:
        for p in module.parameters():
            p.requires_grad = True
        unfrozen_names.append(name)

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"Trainable params: {trainable:,} / {total:,}")

    if trainable == 0:
        raise RuntimeError(
            "No trainable parameters after freezing — check leaf_modules output above "
            "and adjust NUM_LEAF_MODULES_TO_UNFREEZE or the freezing logic."
        )

    optimizer = torch.optim.AdamW(
        [p for p in model.parameters() if p.requires_grad], lr=LR
    )
    criterion = torch.nn.BCEWithLogitsLoss()

    # --------------------------------------------------------
    # Baseline val F1 before fine-tuning
    # --------------------------------------------------------
    def evaluate(loader):
        model.eval()
        all_probs, all_labels = [], []
        with torch.no_grad():
            for x, y in loader:
                x = x.to(device)
                logits = model(x)
                probs = torch.sigmoid(logits).cpu().numpy()
                all_probs.append(probs)
                all_labels.append(y.numpy())
        probs = np.concatenate(all_probs)
        labels = np.concatenate(all_labels)
        preds = (probs >= THRESHOLD).astype(np.int32)
        return f1_score(labels.astype(np.int32), preds, average="macro", zero_division=0)

    baseline_f1 = evaluate(val_loader)
    print(f"\nBaseline val macro F1 (before fine-tune): {baseline_f1:.4f}\n")

    # --------------------------------------------------------
    # Training loop
    # --------------------------------------------------------
    for epoch in range(1, EPOCHS + 1):
        model.train()
        running_loss = 0.0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * x.size(0)

        train_loss = running_loss / len(train_ds)
        val_f1 = evaluate(val_loader)
        print(f"Epoch {epoch}/{EPOCHS}  train_loss={train_loss:.4f}  val_macro_f1={val_f1:.4f}")

    final_f1 = evaluate(val_loader)
    print(f"\nFinal val macro F1: {final_f1:.4f}  (baseline was {baseline_f1:.4f})")

    # --------------------------------------------------------
    # Save fine-tuned checkpoint
    # --------------------------------------------------------
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    model.save_pretrained(CHECKPOINT_DIR, config=model.config)
    print(f"\nSaved fine-tuned model to {CHECKPOINT_DIR}")


if __name__ == "__main__":
    main()