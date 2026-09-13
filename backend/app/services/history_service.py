from app.services.conversation_service import (
    get_all_conversations,
    get_conversation_with_messages,
    delete_conversation,
)


def get_all_history():
    """
    Returns all conversations.

    Each conversation represents one ChatGPT-style
    conversation thread.
    """

    return get_all_conversations()


def get_conversation_history(conversation_id: str):
    """
    Returns a complete conversation including
    all user and assistant messages.
    """

    return get_conversation_with_messages(conversation_id)


def delete_history(conversation_id: str):
    """
    Deletes a conversation and all its messages.
    """

    return delete_conversation(conversation_id)