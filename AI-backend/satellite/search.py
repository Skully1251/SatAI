import requests
from datetime import datetime, timedelta
import requests

from copernicous import get_access_token


CATALOG_URL = "https://sh.dataspace.copernicus.eu/catalog/v1/search"


# Approximate bounding box for Punjab, India
# [min_lon, min_lat, max_lon, max_lat]
PUNJAB_BBOX = [
    73.85,
    29.50,
    76.95,
    32.60
]


def search_satellite(
    collection,
    bbox=PUNJAB_BBOX,
    days_back=30,
    limit=10
):
    """
    Search Copernicus Catalog for satellite products.
    """

    token = get_access_token()

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days_back)

    datetime_range = (
        f"{start_date.strftime('%Y-%m-%dT%H:%M:%SZ')}/"
        f"{end_date.strftime('%Y-%m-%dT%H:%M:%SZ')}"
    )

    payload = {
        "bbox": bbox,
        "datetime": datetime_range,
        "collections": [collection],
        "limit": limit
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        CATALOG_URL,
        headers=headers,
        json=payload,
        timeout=60
    )

    if not response.ok:
        print("\n❌ Copernicus API Error")
        print(response.status_code)
        print(response.text)

    response.raise_for_status()

    return response.json()


def filter_cloud_cover(results, max_cloud_cover=30):
    """
    Filter Sentinel-2 products by cloud cover locally.
    """

    filtered_features = []

    for item in results.get("features", []):

        properties = item.get("properties", {})

        cloud_cover = properties.get("eo:cloud_cover")

        if cloud_cover is not None and cloud_cover <= max_cloud_cover:
            filtered_features.append(item)

    results["features"] = filtered_features

    return results


def print_results(results, satellite_name):
    """
    Print useful information about search results.
    """

    features = results.get("features", [])

    print("\n" + "=" * 70)
    print(f"{satellite_name} RESULTS")
    print("=" * 70)

    print(f"Products found: {len(features)}")

    for i, item in enumerate(features, start=1):

        properties = item.get("properties", {})

        print(f"\n--- Product {i} ---")

        print("ID:")
        print(item.get("id"))

        print("Date:")
        print(properties.get("datetime"))

        print("Cloud cover:")
        print(properties.get("eo:cloud_cover"))

        print("BBox:")
        print(item.get("bbox"))

        print("Collection:")
        print(item.get("collection"))


if __name__ == "__main__":

    print("\n🛰️ Searching Copernicus Data Space...")
    print("📍 Area: Punjab, India")
    print("📅 Looking at the last 30 days")

    # ==========================================================
    # SENTINEL-1
    # ==========================================================

    s1_results = search_satellite(
        collection="sentinel-1-grd",
        days_back=30,
        limit=10
    )

    print_results(
        s1_results,
        "SENTINEL-1 GRD"
    )

    # ==========================================================
    # SENTINEL-2
    # ==========================================================

    s2_results = search_satellite(
        collection="sentinel-2-l2a",
        days_back=30,
        limit=20
    )

    # Filter cloud cover locally
    s2_results = filter_cloud_cover(
        s2_results,
        max_cloud_cover=30
    )

    print_results(
        s2_results,
        "SENTINEL-2 L2A (<30% CLOUD)"
    )
def get_product_uuid(product_name):
    """
    Get the Copernicus OData UUID for a product name.
    """

    url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"

    params = {
        "$filter": f"Name eq '{product_name}'"
    }

    response = requests.get(
        url,
        params=params,
        timeout=60
    )

    response.raise_for_status()

    products = response.json().get("value", [])

    if not products:
        raise ValueError(
            f"Product not found in OData catalogue: {product_name}"
        )

    return products[0]["Id"]