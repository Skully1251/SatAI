from fastapi import FastAPI

from app.api.routes.chat import router as chat_router
from app.api.routes.upload import router as upload_router
from app.api.routes.metadata import router as metadata_router


app = FastAPI(
    title="SatQueryAI Backend",
    description="Backend API for SatQueryAI",
    version="1.0.0"
)


@app.get("/", tags=["Root"])
def root():

    return {
        "message": "Welcome to SatQueryAI Backend",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
def health_check():

    return {
        "status": "healthy",
        "service": "SatQueryAI Backend",
        "version": "1.0.0"
    }


@app.get("/api/v1/status", tags=["System"])
def system_status():

    return {
        "status": "online",
        "service": "SatQueryAI Backend"
    }


app.include_router(
    chat_router,
    prefix="/api/v1"
)

app.include_router(
    upload_router,
    prefix="/api/v1"
)

app.include_router(
    metadata_router,
    prefix="/api/v1"
)