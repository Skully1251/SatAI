from fastapi import APIRouter, HTTPException

from app.services.metadata_service import load_metadata


router = APIRouter(
    prefix="/metadata",
    tags=["Metadata"]
)


@router.get("/{image_id}")
async def get_metadata(image_id: str):
    """
    Retrieve stored metadata for an uploaded satellite image.
    """

    metadata = load_metadata(image_id)

    if metadata is None:

        raise HTTPException(
            status_code=404,
            detail="Metadata not found for this image ID."
        )

    return {

        "status": "success",

        "image_id": image_id,

        "metadata": metadata
    }