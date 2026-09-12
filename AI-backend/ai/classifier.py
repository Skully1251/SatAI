"""
ai/classifier.py

Wraps the fine-tuned BigEarthNet ResNet-50 as a reusable engine, used
by the router to attach land-cover context to EVERY query (not just
ones explicitly asking for classification) — giving the explainer
richer, still fully evidence-grounded material to narrate from.
"""

import numpy as np
import torch

from reben_publication.BigEarthNetv2_0_ImageClassifier import BigEarthNetv2_0_ImageClassifier
from preprocessing import MEANS, STDS

ALPHABETICAL_CLASSES = [
    "Agro-forestry areas", "Arable land", "Beaches, dunes, sands", "Broad-leaved forest",
    "Coastal wetlands", "Complex cultivation patterns", "Coniferous forest",
    "Industrial or commercial units", "Inland waters", "Inland wetlands",
    "Land principally occupied by agriculture, with significant areas of natural vegetation",
    "Marine waters", "Mixed forest", "Moors, heathland and sclerophyllous vegetation",
    "Natural grassland and sparsely vegetated areas", "Pastures", "Permanent crops",
    "Transitional woodland, shrub", "Urban fabric",
]

FINETUNED_CHECKPOINT = "models/resnet50_finetuned"
BASE_CHECKPOINT = "BIFOLD-BigEarthNetv2-0/resnet50-all-v0.2.0"


class ClassifierEngine:
    def __init__(self, device: str = None, checkpoint: str = None):
        self.device = device or (
            "cuda" if torch.cuda.is_available()
            else "mps" if torch.backends.mps.is_available()
            else "cpu"
        )
        ckpt = checkpoint or FINETUNED_CHECKPOINT
        try:
            self.model = BigEarthNetv2_0_ImageClassifier.from_pretrained(ckpt)
            self.source = ckpt
        except Exception:
            # Fall back to the base pretrained checkpoint if the fine-tuned
            # one isn't present on disk (e.g. running on a fresh machine).
            self.model = BigEarthNetv2_0_ImageClassifier.from_pretrained(BASE_CHECKPOINT)
            self.source = BASE_CHECKPOINT
        self.model.to(self.device)
        self.model.eval()

    def top_k(self, patch_raw: np.ndarray, k: int = 3) -> list:
        """
        patch_raw: (12, H, W) raw (pre-normalization) band values.
        Returns list of (class_name, probability) tuples, sorted descending.
        """
        normalized = (patch_raw - MEANS.reshape(12, 1, 1)) / STDS.reshape(12, 1, 1)
        x = torch.from_numpy(normalized.astype(np.float32)).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(x)
            probs = torch.sigmoid(logits).cpu().numpy()[0]

        top_idx = np.argsort(probs)[::-1][:k]
        return [(ALPHABETICAL_CLASSES[i], float(probs[i])) for i in top_idx]