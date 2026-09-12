from uuid import uuid4
from datetime import datetime

from app.core.database import get_connection


def create_conversation(
    title: str = "New Satellite Analysis",
    image_id: str | None = None,
):
    conversation_id = str(uuid4())
    now = datetime.utcnow().isoformat()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO conversations (
            id,
            title,
            image_id,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            conversation_id,
            title,
            image_id,
            now,
            now,
        ),
    )

    connection.commit()
    connection.close()

    return get_conversation(conversation_id)


def get_all_conversations():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            conversations.*,
            COUNT(messages.id) AS message_count
        FROM conversations
        LEFT JOIN messages
            ON conversations.id = messages.conversation_id
        GROUP BY conversations.id
        ORDER BY conversations.updated_at DESC
        """
    )

    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]


def get_conversation(conversation_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM conversations
        WHERE id = ?
        """,
        (conversation_id,),
    )

    row = cursor.fetchone()

    connection.close()

    if row:
        return dict(row)

    return None


def update_conversation(
    conversation_id: str,
    title: str | None = None,
    image_id: str | None = None,
):
    now = datetime.utcnow().isoformat()

    connection = get_connection()
    cursor = connection.cursor()

    conversation = get_conversation(conversation_id)

    if not conversation:
        connection.close()
        return None

    new_title = title if title is not None else conversation["title"]

    new_image_id = (
        image_id
        if image_id is not None
        else conversation["image_id"]
    )

    cursor.execute(
        """
        UPDATE conversations
        SET
            title = ?,
            image_id = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            new_title,
            new_image_id,
            now,
            conversation_id,
        ),
    )

    connection.commit()
    connection.close()

    return get_conversation(conversation_id)


def add_message(
    conversation_id: str,
    role: str,
    content: str,
):
    message_id = str(uuid4())
    now = datetime.utcnow().isoformat()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO messages (
            id,
            conversation_id,
            role,
            content,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            message_id,
            conversation_id,
            role,
            content,
            now,
        ),
    )

    cursor.execute(
        """
        UPDATE conversations
        SET updated_at = ?
        WHERE id = ?
        """,
        (
            now,
            conversation_id,
        ),
    )

    connection.commit()
    connection.close()

    return {
        "id": message_id,
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "created_at": now,
    }


def get_messages(conversation_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        """,
        (conversation_id,),
    )

    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]


def get_conversation_with_messages(conversation_id: str):
    conversation = get_conversation(conversation_id)

    if not conversation:
        return None

    messages = get_messages(conversation_id)

    conversation["messages"] = messages

    return conversation


def delete_conversation(conversation_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM messages
        WHERE conversation_id = ?
        """,
        (conversation_id,),
    )

    cursor.execute(
        """
        DELETE FROM conversations
        WHERE id = ?
        """,
        (conversation_id,),
    )

    deleted_count = cursor.rowcount

    connection.commit()
    connection.close()

    return deleted_count