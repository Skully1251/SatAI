from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from uuid import uuid4
import shutil

from app.services.metadata_service import (
    extract_metadata,
    save_metadata
)


router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)


UPLOAD_DIR = Path("uploads")


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
}


ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".tif",
    ".tiff",
}


@router.post("/")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a satellite image and extract its metadata.
    """

    # Validate filename
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided."
        )

    # Get file extension
    file_extension = Path(file.filename).suffix.lower()

    # Validate extension
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed: JPG, JPEG, PNG, TIFF."
        )

    # Validate content type
    if (
        file.content_type
        and file.content_type not in ALLOWED_CONTENT_TYPES
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid image content type."
        )

    # Create uploads directory
    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # Generate unique image ID
    image_id = str(uuid4())

    # Generate stored filename
    stored_filename = f"{image_id}{file_extension}"

    # Create full file path
    file_path = UPLOAD_DIR / stored_filename

    try:

        # Save uploaded image
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        # Extract metadata
        metadata = extract_metadata(
            str(file_path)
        )

        # Add image ID
        metadata["image_id"] = image_id

        # Add original filename
        metadata["original_filename"] = file.filename

        # Add content type
        metadata["content_type"] = file.content_type

        # Save metadata as JSON
        save_metadata(
            image_id,
            metadata
        )

    except Exception as error:

        # Remove file if something fails
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(error)}"
        )

    finally:

        await file.close()

    return {

        "status": "uploaded successfully",

        "image_id": image_id,

        "original_filename": file.filename,

        "stored_filename": stored_filename,

        "content_type": file.content_type,

        "metadata": metadata
    }