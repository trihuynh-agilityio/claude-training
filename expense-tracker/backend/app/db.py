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

# A month with no row in monthly_budgets has no budget of its own (it inherits an earlier one).
BUDGET_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS monthly_budgets (
        month TEXT PRIMARY KEY,
        amount INTEGER NOT NULL CHECK (amount > 0)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS category_budgets (
        month TEXT NOT NULL REFERENCES monthly_budgets (month),
        category_id TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        PRIMARY KEY (month, category_id)
    )
    """,
]

# A rule adds at most one expense per month; last_generated is the last occurrence it handled.
RECURRING_SCHEMA = """
CREATE TABLE IF NOT EXISTS recurring_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    category_id TEXT NOT NULL,
    note TEXT,
    day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
    start_date TEXT NOT NULL,
    end_date TEXT,
    paused INTEGER NOT NULL DEFAULT 0,
    last_generated TEXT,
    created_at TEXT NOT NULL
)
"""

# Databases created before recurring rules existed lack the link; their rows get NULL.
ADD_RECURRING_COLUMN = "ALTER TABLE expenses ADD COLUMN recurring_id INTEGER"

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
        for statement in BUDGET_SCHEMA:
            conn.execute(statement)
        conn.execute(RECURRING_SCHEMA)
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(expenses)")}
        if "category_id" not in columns:
            conn.execute(ADD_CATEGORY_COLUMN)
        if "recurring_id" not in columns:
            conn.execute(ADD_RECURRING_COLUMN)
    conn.close()


def get_connection() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: one connection per request, committed on success."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
