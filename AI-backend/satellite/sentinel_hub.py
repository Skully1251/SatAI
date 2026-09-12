import os
from datetime import datetime, timedelta

import numpy as np
from dotenv import load_dotenv
import requests

from sentinelhub import (
    SHConfig,
    SentinelHubRequest,
    DataCollection,
    MimeType,
    CRS,
    BBox,
    bbox_to_dimensions,
)


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# CONFIGURATION
# ============================================================

CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID")
CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

if not CLIENT_ID or not CLIENT_SECRET:
    raise ValueError(
        "COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET "
        "is missing from .env"
    )


TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu"
    "/auth/realms/CDSE/protocol/openid-connect/token"
)

COPERNICUS_BASE_URL = "https://sh.dataspace.copernicus.eu"


# ============================================================
# GET ACCESS TOKEN
# ============================================================

def get_sentinel_token():

    print("\n🔐 Authenticating with Copernicus Data Space...")

    response = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
        timeout=30,
    )

    response.raise_for_status()

    token = response.json()["access_token"]

    print("✅ Authentication successful!")

    return token


# ============================================================
# SENTINEL HUB CONFIGURATION
# ============================================================

config = SHConfig()

config.sh_client_id = CLIENT_ID
config.sh_client_secret = CLIENT_SECRET

# Copernicus Data Space token endpoint
config.sh_token_url = TOKEN_URL

# IMPORTANT:
# This MUST be the CDSE Sentinel Hub endpoint.
config.sh_base_url = COPERNICUS_BASE_URL

# Get an explicit access token
ACCESS_TOKEN = get_sentinel_token()

config.sh_auth_token = ACCESS_TOKEN


# ============================================================
# CDSE DATA COLLECTIONS
# ============================================================

SENTINEL1_CDSE = DataCollection.SENTINEL1_IW.define_from(
    "s1iw_cdse",
    service_url=COPERNICUS_BASE_URL
)

SENTINEL2_CDSE = DataCollection.SENTINEL2_L2A.define_from(
    "s2l2a_cdse",
    service_url=COPERNICUS_BASE_URL
)


# ============================================================
# OUTPUT DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(__file__)
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "data"
)

os.makedirs(
    DATA_DIR,
    exist_ok=True
)


# ============================================================
# TEST AREA (default — used if no bbox is passed in)
# ============================================================

PUNJAB_BBOX = [
    75.6,
    30.6,
    75.8,
    30.8
]


# ============================================================
# REQUIRED BANDS
# ============================================================

S1_BANDS = ["VV", "VH"]

S2_BANDS = [
    "B02", "B03", "B04", "B05", "B06",
    "B07", "B08", "B8A", "B11", "B12"
]

ALL_BANDS = S1_BANDS + S2_BANDS


# ============================================================
# SENTINEL-1 EVALSCRIPT
# ============================================================

S1_EVALSCRIPT = """
//VERSION=3

function setup() {
    return {
        input: [{ bands: ["VV", "VH"] }],
        output: { bands: 2, sampleType: SampleType.FLOAT32 }
    };
}

function evaluatePixel(sample) {
    return [sample.VV, sample.VH];
}
"""


# ============================================================
# SENTINEL-2 EVALSCRIPT
# ============================================================

S2_EVALSCRIPT = """
//VERSION=3

function setup() {
    return {
        input: [{
            bands: ["B02","B03","B04","B05","B06","B07","B08","B8A","B11","B12"]
        }],
        output: { bands: 10, sampleType: SampleType.FLOAT32 }
    };
}

function evaluatePixel(sample) {
    return [
        sample.B02, sample.B03, sample.B04, sample.B05, sample.B06,
        sample.B07, sample.B08, sample.B8A, sample.B11, sample.B12
    ];
}
"""


# ============================================================
# DATE RANGE
# ============================================================

def get_time_interval(days_back=30, end_date=None):

    if end_date is None:
        end_date = datetime.utcnow()
    elif isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d")

    start_date = end_date - timedelta(days=days_back)

    return (
        start_date.strftime("%Y-%m-%d"),
        end_date.strftime("%Y-%m-%d")
    )


# ============================================================
# SENTINEL-1 DOWNLOAD
# ============================================================

def download_sentinel1(
    bbox=PUNJAB_BBOX,
    days_back=30,
    resolution=10,
    end_date=None
):

    time_interval = get_time_interval(days_back, end_date=end_date)

    bbox_object = BBox(bbox=bbox, crs=CRS.WGS84)

    size = bbox_to_dimensions(bbox_object, resolution=resolution)

    print("\n")
    print("=" * 60)
    print("SENTINEL-1")
    print("=" * 60)
    print(f"Time range: {time_interval[0]} → {time_interval[1]}")
    print(f"Resolution: {resolution} m")
    print(f"Image size: {size}")
    print(f"BBox: {bbox}")
    print("Bands: VV, VH")
    print("\n📡 Requesting Sentinel-1...")
    print("Endpoint:", COPERNICUS_BASE_URL)
    print("⏳ Downloading...")

    request = SentinelHubRequest(
        evalscript=S1_EVALSCRIPT,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=SENTINEL1_CDSE,
                time_interval=time_interval,
                mosaicking_order="mostRecent"
            )
        ],
        responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
        bbox=bbox_object,
        size=size,
        config=config,
        data_folder=DATA_DIR
    )

    data = request.get_data(save_data=True)

    if not data:
        raise RuntimeError("No Sentinel-1 data returned.")

    image = data[0]

    print("\n✅ Sentinel-1 download successful!")
    print(f"Shape: {image.shape}")
    print(f"Dtype: {image.dtype}")
    print(f"Bands: {image.shape[-1]}")

    return image


# ============================================================
# SENTINEL-2 DOWNLOAD
# ============================================================

def download_sentinel2(
    bbox=PUNJAB_BBOX,
    days_back=30,
    resolution=10,
    end_date=None
):

    time_interval = get_time_interval(days_back, end_date=end_date)

    bbox_object = BBox(bbox=bbox, crs=CRS.WGS84)

    size = bbox_to_dimensions(bbox_object, resolution=resolution)

    print("\n")
    print("=" * 60)
    print("SENTINEL-2")
    print("=" * 60)
    print(f"Time range: {time_interval[0]} → {time_interval[1]}")
    print(f"Resolution: {resolution} m")
    print(f"Image size: {size}")
    print(f"BBox: {bbox}")
    print("Bands: B02, B03, B04, B05, B06, B07, B08, B8A, B11, B12")
    print("\n📡 Requesting Sentinel-2...")
    print("Endpoint:", COPERNICUS_BASE_URL)
    print("⏳ Downloading...")

    request = SentinelHubRequest(
        evalscript=S2_EVALSCRIPT,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=SENTINEL2_CDSE,
                time_interval=time_interval,
                mosaicking_order="leastCC"
            )
        ],
        responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
        bbox=bbox_object,
        size=size,
        config=config,
        data_folder=DATA_DIR
    )

    data = request.get_data(save_data=True)

    if not data:
        raise RuntimeError("No Sentinel-2 data returned.")

    image = data[0]

    print("\n✅ Sentinel-2 download successful!")
    print(f"Shape: {image.shape}")
    print(f"Dtype: {image.dtype}")
    print(f"Bands: {image.shape[-1]}")

    return image


# ============================================================
# COMBINE SENTINEL-1 + SENTINEL-2
# ============================================================

def create_12_band_image(end_date=None, output_filename="punjab_s1_s2_12bands.npy", bbox=None):

    bbox = bbox if bbox is not None else PUNJAB_BBOX

    print("\n")
    print("=" * 60)
    print("🛰️ SatQueryAI")
    print("=" * 60)
    print("Target: BigEarthNet v2.0 S1 + S2")
    print(f"BBox: {bbox}")
    print("Resolution: 10 m")
    print("Required bands: 12")
    print("S1 bands: VV, VH")
    print("S2 bands: B02, B03, B04, B05, B06, B07, B08, B8A, B11, B12")

    print("\n🔄 Downloading Sentinel-1...")
    s1 = download_sentinel1(bbox=bbox, end_date=end_date)

    print("\n🔄 Downloading Sentinel-2...")
    s2 = download_sentinel2(bbox=bbox, end_date=end_date)

    print("\n🔗 Combining S1 + S2...")
    print(f"S1 shape: {s1.shape}")
    print(f"S2 shape: {s2.shape}")

    if s1.shape[:2] != s2.shape[:2]:
        raise ValueError("S1 and S2 spatial dimensions do not match.")

    if s1.shape[-1] != 2:
        raise ValueError("Sentinel-1 should contain exactly 2 bands.")

    if s2.shape[-1] != 10:
        raise ValueError("Sentinel-2 should contain exactly 10 bands.")

    combined = np.concatenate([s1, s2], axis=-1)

    if combined.shape[-1] != 12:
        raise ValueError(f"Expected 12 bands, got {combined.shape[-1]}")

    if np.isnan(combined).any():
        raise ValueError("Combined image contains NaN values.")

    if np.isinf(combined).any():
        raise ValueError("Combined image contains Inf values.")

    print("\n")
    print("=" * 60)
    print("FINAL 12-BAND IMAGE")
    print("=" * 60)
    print(f"Shape: {combined.shape}")
    print(f"Dtype: {combined.dtype}")
    print("Number of bands:", combined.shape[-1])
    print("\nBand order:")
    for i, band in enumerate(ALL_BANDS):
        print(f"{i:2d} → {band}")

    output_file = os.path.join(DATA_DIR, output_filename)
    np.save(output_file, combined)

    print("\n💾 Saved:")
    print(output_file)
    print("\n🎉 12-band satellite dataset created!")

    return combined


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    import sys

    arg_end_date = sys.argv[1] if len(sys.argv) > 1 else None
    arg_output = sys.argv[2] if len(sys.argv) > 2 else "punjab_s1_s2_12bands.npy"

    arg_bbox = None
    if len(sys.argv) > 6:
        arg_bbox = [float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])]

    print(f"[DEBUG] Parsed args -> end_date={arg_end_date}, output={arg_output}, bbox={arg_bbox}")

    create_12_band_image(end_date=arg_end_date, output_filename=arg_output, bbox=arg_bbox)