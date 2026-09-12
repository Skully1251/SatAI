from pathlib import Path
from PIL import Image
from PIL.ExifTags import TAGS
import json


METADATA_DIR = Path("metadata")


def extract_metadata(file_path: str):

    path = Path(file_path)

    metadata = {
        "filename": path.name,
        "file_extension": path.suffix.lower(),
        "file_size_bytes": path.stat().st_size,
    }

    try:

        with Image.open(file_path) as image:

            metadata["image_format"] = image.format
            metadata["width"] = image.width
            metadata["height"] = image.height
            metadata["mode"] = image.mode

            exif_data = {}

            if hasattr(image, "getexif"):

                exif = image.getexif()

                for tag_id, value in exif.items():

                    tag = TAGS.get(tag_id, tag_id)

                    try:
                        exif_data[str(tag)] = str(value)
                    except Exception:
                        pass

            metadata["exif"] = exif_data

    except Exception as error:

        metadata["image_processing_error"] = str(error)

    return metadata


def save_metadata(image_id: str, metadata: dict):

    METADATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    metadata_file = METADATA_DIR / f"{image_id}.json"

    with open(
        metadata_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            metadata,
            file,
            indent=4,
            default=str
        )

    return metadata_file


def load_metadata(image_id: str):

    metadata_file = METADATA_DIR / f"{image_id}.json"

    if not metadata_file.exists():
        return None

    with open(
        metadata_file,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)