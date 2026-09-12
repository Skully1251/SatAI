import os
import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID")
CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu"
    "/auth/realms/CDSE/protocol/openid-connect/token"
)


def get_access_token():
    if not CLIENT_ID or not CLIENT_SECRET:
        raise ValueError(
            "CLIENT_ID or CLIENT_SECRET "
            "is missing from .env"
        )

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

    return response.json()["access_token"]


if __name__ == "__main__":
    token = get_access_token()

    print("✅ Copernicus authentication successful!")
    print("✅ Access token received.")