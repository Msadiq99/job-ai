import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "msdk3_data.db")

def init_db():
    """Initializes the SQLite database and ensures the schema exists."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS state_store (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    conn.commit()
    conn.close()

def get_state():
    """Retrieves the application state from the database."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM state_store WHERE key = ?", ("app_state",))
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row[0])
        except json.JSONDecodeError:
            return None
    return None

def save_state(state_data):
    """Saves the application state into the database."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    state_json = json.dumps(state_data)
    cursor.execute("""
        INSERT INTO state_store (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, ("app_state", state_json))
    conn.commit()
    conn.close()
