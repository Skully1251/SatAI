import rasterio
import numpy as np

S1_PATH = "data/bigearthnet/sample/patch_000/s1.tif"
S2_PATH = "data/bigearthnet/sample/patch_000/s2.tif"


def inspect_tif(path, name):
    print("\n" + "=" * 60)
    print(name)
    print("=" * 60)

    with rasterio.open(path) as src:

        print("Path:", path)
        print("Width:", src.width)
        print("Height:", src.height)
        print("Bands:", src.count)
        print("Dtype:", src.dtypes)
        print("CRS:", src.crs)

        print("\nBand descriptions:")
        for i in range(1, src.count + 1):
            print(f"  Band {i}: {src.descriptions[i - 1]}")

        print("\nBand statistics:")

        for i in range(1, src.count + 1):

            data = src.read(i).astype(np.float32)

            finite = data[np.isfinite(data)]

            print(
                f"  Band {i}: "
                f"min={finite.min():.6f}, "
                f"max={finite.max():.6f}, "
                f"mean={finite.mean():.6f}, "
                f"std={finite.std():.6f}"
            )


inspect_tif(S1_PATH, "SENTINEL-1")

inspect_tif(S2_PATH, "SENTINEL-2")