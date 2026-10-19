import os
import sqlite3
from collections.abc import Iterator
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "expenses.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    date TEXT NOT NULL,
    note TEXT,
    category_id TEXT NOT NULL DEFAULT 'other',
    created_at TEXT NOT NULL
)
"""

# Databases created before categories existed lack the column; their rows become "other".
ADD_CATEGORY_COLUMN = (
    "ALTER TABLE expenses ADD COLUMN category_id TEXT NOT NULL DEFAULT 'other'"
)


def get_db_path() -> Path:
    """Return the SQLite file path, overridable with EXPENSE_DB_PATH."""
    return Path(os.environ.get("EXPENSE_DB_PATH", DEFAULT_DB_PATH))


def connect() -> sqlite3.Connection:
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    # FastAPI may run a sync dependency and its endpoint on different threads.
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.execute(SCHEMA)
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(expenses)")}
        if "category_id" not in columns:
            conn.execute(ADD_CATEGORY_COLUMN)
    conn.close()


def get_connection() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: one connection per request, committed on success."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
