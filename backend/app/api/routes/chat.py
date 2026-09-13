from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.chat_service import process_chat

from app.services.conversation_service import (
    get_all_conversations,
    get_conversation_with_messages,
    delete_conversation,
)


router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


# =====================================================
# REQUEST MODELS
# =====================================================

class ChatRequest(BaseModel):
    message: str
    image_id: str | None = None
    conversation_id: str | None = None


# =====================================================
# SEND MESSAGE
# =====================================================

@router.post("/")
async def chat(request: ChatRequest):

    result = process_chat(
        message=request.message,
        image_id=request.image_id,
        conversation_id=request.conversation_id,
    )

    return result


# =====================================================
# GET ALL CONVERSATIONS
# =====================================================

@router.get("/conversations")
async def get_conversations():

    conversations = get_all_conversations()

    return {
        "status": "success",
        "total_conversations": len(conversations),
        "conversations": conversations,
    }


# =====================================================
# GET ONE COMPLETE CONVERSATION
# =====================================================

@router.get("/conversations/{conversation_id}")
async def get_single_conversation(conversation_id: str):

    conversation = get_conversation_with_messages(
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    return {
        "status": "success",
        "conversation": conversation,
    }


# =====================================================
# DELETE CONVERSATION
# =====================================================

@router.delete("/conversations/{conversation_id}")
async def remove_conversation(conversation_id: str):

    deleted = delete_conversation(conversation_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    return {
        "status": "success",
        "message": "Conversation deleted successfully.",
        "conversation_id": conversation_id,
    }