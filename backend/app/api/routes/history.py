from fastapi import APIRouter, HTTPException

from app.services.history_service import (
    get_all_history,
    get_conversation_history,
    get_all_conversations,
    delete_conversation,
)


router = APIRouter(
    prefix="/history",
    tags=["History"]
)


@router.get("/")
def get_history(limit: int = 50):

    history = get_all_history(limit)

    return {
        "status": "success",
        "count": len(history),
        "history": history,
    }


@router.get("/conversations")
def get_conversations():

    conversations = get_all_conversations()

    return {
        "status": "success",
        "count": len(conversations),
        "conversations": conversations,
    }


@router.get("/{conversation_id}")
def get_conversation(conversation_id: str):

    history = get_conversation_history(conversation_id)

    if not history:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found."
        )

    return {
        "status": "success",
        "conversation_id": conversation_id,
        "message_count": len(history),
        "history": history,
    }


@router.delete("/{conversation_id}")
def delete_history(conversation_id: str):

    deleted_count = delete_conversation(conversation_id)

    if deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found."
        )

    return {
        "status": "success",
        "message": "Conversation deleted successfully.",
        "deleted_records": deleted_count,
    }