import sys
sys.path.insert(0, 'ai')
import numpy as np
from vqa import VQAEngine

engine = VQAEngine()
patches = np.load('data/bigearthnet/bigearthnet_50_raw.npy')

# Patch 7 = Marine waters (should be yes), Patch 3 = Arable land (should be no)
test_patches = [3, 7, 8, 12, 20, 24]
for idx in test_patches:
    result = engine.answer('Is there a water area?', patches[idx])
    print(f"Patch {idx}: answer={result['answer']!r}  confidence={result['confidence']:.3f}")