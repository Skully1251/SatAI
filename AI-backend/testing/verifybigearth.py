# Run this locally in your SatQueryAI .venv (not Colab) — it inspects the
# actual installed packages to get the AUTHORITATIVE band order and
# normalization stats the pretrained checkpoint expects.

print("=" * 60)
print("1. Band order for bandconfig='all' (from reben-training-scripts)")
print("=" * 60)
import sys
sys.path.insert(0, "reben-training-scripts/scripts")
sys.path.insert(0, "reben-training-scripts")
try:
    from utils import get_bands
    bands, channels = get_bands("all")
    print("Official band order for 'all':", bands)
    print("Number of channels:", channels)
except Exception as e:
    print("Could not import get_bands directly:", e)
    print("Falling back — please manually cat reben-training-scripts/scripts/utils.py")
    print("and find the get_bands() function body.")

print()
print("=" * 60)
print("2. Normalization stats used by configilm for BigEarthNet v2")
print("=" * 60)
try:
    import configilm
    print("configilm version:", configilm.__version__)
except Exception as e:
    print("configilm import issue:", e)

# Try the most likely locations for band statistics in configilm
candidates = [
    "configilm.extra.BENv2_utils",
    "configilm.extra.DataSets.BENv2_utils",
    "configilm.extra.DataModules.BENv2_DataModule",
]
found_any = False
for modname in candidates:
    try:
        mod = __import__(modname, fromlist=["*"])
        attrs = [a for a in dir(mod) if "STAT" in a.upper() or "MEAN" in a.upper() or "STD" in a.upper() or "NORM" in a.upper()]
        if attrs:
            found_any = True
            print(f"\nFound in {modname}:")
            for a in attrs:
                val = getattr(mod, a)
                print(f"  {a} = {val}")
    except Exception as e:
        pass

if not found_any:
    print("\nNo stats found automatically. Run this to search manually:")
    print("  python -c \"import configilm; print(configilm.__file__)\"")
    print("  grep -rn -i 'mean\\|std' <path to configilm install>/extra/")

print()
print("=" * 60)
print("3. Check if the model itself applies normalization internally")
print("=" * 60)
try:
    from reben_publication.BigEarthNetv2_0_ImageClassifier import BigEarthNetv2_0_ImageClassifier
    import inspect
    print(inspect.getsource(BigEarthNetv2_0_ImageClassifier.forward)
          if hasattr(BigEarthNetv2_0_ImageClassifier, "forward") else "No forward() found to inspect")
except Exception as e:
    print("Could not inspect model forward():", e)