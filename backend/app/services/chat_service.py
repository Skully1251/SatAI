from fastapi import HTTPException

from app.services.conversation_service import (
    create_conversation,
    get_conversation,
    update_conversation,
    add_message,
)


def generate_conversation_title(message: str):
    cleaned_message = message.strip()

    if not cleaned_message:
        return "New Satellite Analysis"

    if len(cleaned_message) > 50:
        return cleaned_message[:50] + "..."

    return cleaned_message


def generate_ai_response(
    message: str,
    image_id: str | None = None,
):
    """
    Temporary AI response.

    Later this function will be replaced by the
    actual SatQueryAI Agent / VLM pipeline.
    """

    if image_id:
        return (
            f"Satellite image {image_id} is attached to this conversation. "
            f"You asked: {message}"
        )

    return f"You asked: {message}"


def process_chat(
    message: str,
    image_id: str | None = None,
    conversation_id: str | None = None,
):
    message = message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    # --------------------------------------------------
    # CREATE NEW CONVERSATION
    # --------------------------------------------------

    if not conversation_id:

        title = generate_conversation_title(message)

        conversation = create_conversation(
            title=title,
            image_id=image_id,
        )

        conversation_id = conversation["id"]

    # --------------------------------------------------
    # CONTINUE EXISTING CONVERSATION
    # --------------------------------------------------

    else:

        conversation = get_conversation(conversation_id)

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

        # Attach image if conversation previously had no image
        if image_id and not conversation.get("image_id"):

            update_conversation(
                conversation_id=conversation_id,
                image_id=image_id,
            )

    # --------------------------------------------------
    # SAVE USER MESSAGE
    # --------------------------------------------------

    user_message = add_message(
        conversation_id=conversation_id,
        role="user",
        content=message,
    )

    # --------------------------------------------------
    # AI RESPONSE
    # --------------------------------------------------

    conversation = get_conversation(conversation_id)

    active_image_id = (
        image_id
        if image_id
        else conversation.get("image_id")
    )

    response = generate_ai_response(
        message=message,
        image_id=active_image_id,
    )

    # --------------------------------------------------
    # SAVE ASSISTANT RESPONSE
    # --------------------------------------------------

    assistant_message = add_message(
        conversation_id=conversation_id,
        role="assistant",
        content=response,
    )

    return {
        "status": "success",
        "conversation_id": conversation_id,
        "image_id": active_image_id,
        "user_message": user_message,
        "assistant_message": assistant_message,
        "response": response,
    }