import sys
sys.path.insert(0, 'ai')
import numpy as np
import torch
from vqa import VQAEngine

engine = VQAEngine()
patches = np.load('data/bigearthnet/bigearthnet_50_raw.npy')

test_patches = [3, 7, 8, 12, 20, 24]  # mix of land types, patch 7 = actual marine water

print("=" * 60)
print("TEST 1: Different question phrasings (adapter ON)")
print("=" * 60)
questions = [
    "Is there a water area?",
    "Are there any buildings in this image?",
    "Is this a forest?",
    "What is the amount of buildings?",
]
for q in questions:
    print(f"\nQuestion: {q!r}")
    for idx in test_patches[:3]:
        result = engine.answer(q, patches[idx])
        print(f"  Patch {idx}: answer={result['answer']!r}  confidence={result['confidence']:.4f}")

print("\n" + "=" * 60)
print("TEST 2: Water question with LoRA adapter DISABLED (base model)")
print("=" * 60)
with engine.model.disable_adapter():
    for idx in test_patches:
        result = engine.answer("Is there a water area?", patches[idx])
        print(f"Patch {idx}: answer={result['answer']!r}  confidence={result['confidence']:.4f}")