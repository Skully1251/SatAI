from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.conversation_service import (
    create_conversation,
    get_all_conversations,
    get_conversation,
    get_messages,
    delete_conversation,
)


router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"]
)


class CreateConversationRequest(BaseModel):
    title: str = "New Satellite Analysis"
    image_id: str | None = None


@router.post("/")
def create_new_conversation(request: CreateConversationRequest):

    conversation_id = create_conversation(
        title=request.title,
        image_id=request.image_id,
    )

    return {
        "status": "success",
        "conversation_id": conversation_id,
        "message": "Conversation created successfully"
    }


@router.get("/")
def list_conversations():

    conversations = get_all_conversations()

    return {
        "status": "success",
        "count": len(conversations),
        "conversations": conversations
    }


@router.get("/{conversation_id}")
def open_conversation(conversation_id: str):

    conversation = get_conversation(conversation_id)

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    messages = get_messages(conversation_id)

    return {
        "status": "success",
        "conversation": conversation,
        "messages": messages
    }


@router.delete("/{conversation_id}")
def remove_conversation(conversation_id: str):

    deleted = delete_conversation(conversation_id)

    if deleted == 0:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    return {
        "status": "success",
        "message": "Conversation deleted successfully"
    }