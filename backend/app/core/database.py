import sqlite3
from pathlib import Path


DATABASE_DIR = Path("data")
DATABASE_PATH = DATABASE_DIR / "satquery.db"


def get_connection():
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DATABASE_PATH)

    connection.row_factory = sqlite3.Row

    return connection


def init_database():
    connection = get_connection()

    cursor = connection.cursor()

    # Conversations table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            image_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    # Messages table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,

            FOREIGN KEY (conversation_id)
            REFERENCES conversations (id)
            ON DELETE CASCADE
        )
        """
    )

    connection.commit()

    connection.close()