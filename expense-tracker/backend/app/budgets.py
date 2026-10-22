import sqlite3
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from app.db import get_connection
from app.schemas import Budget, BudgetIn

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]

MONTH_PATTERN = r"^(19|20)\d{2}-(0[1-9]|1[0-2])$"

MonthQuery = Annotated[
    str, Query(pattern=MONTH_PATTERN, description="YYYY-MM from 1900-01 to 2099-12")
]

MonthPath = Annotated[str, Path(pattern=MONTH_PATTERN)]

TodayParam = Annotated[
    date | None,
    Query(
        ge=date(1900, 1, 1),
        le=date(2099, 12, 31),
        description="The caller's date (YYYY-MM-DD); defaults to the server's date",
    ),
]


def month_of(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def next_month(month: str) -> str:
    year, number = int(month[:4]), int(month[5:])
    return f"{year + 1:04d}-01" if number == 12 else f"{year:04d}-{number + 1:02d}"


def budget_in_force(conn: sqlite3.Connection, month: str) -> Budget | None:
    """The month's own budget, else the latest earlier one; None when there is neither."""
    row = conn.execute(
        "SELECT month, amount FROM monthly_budgets WHERE month <= ? ORDER BY month DESC LIMIT 1",
        (month,),
    ).fetchone()
    if row is None:
        return None
    rows = conn.execute(
        "SELECT category_id, amount FROM category_budgets WHERE month = ?",
        (row["month"],),
    ).fetchall()
    return Budget(
        month=month,
        source_month=row["month"],
        is_own=row["month"] == month,
        monthly=row["amount"],
        categories={r["category_id"]: r["amount"] for r in rows},
    )


@router.get("")
def get_budget(
    conn: Connection, month: MonthQuery, today: TodayParam = None
) -> Budget | None:
    return budget_in_force(conn, month)


@router.put("/{month}")
def save_budget(
    conn: Connection, month: MonthPath, payload: BudgetIn, today: TodayParam = None
) -> Budget:
    current = month_of(today or date.today())
    if month < current:
        raise HTTPException(422, "Budgets for past months can't be changed.")
    if month > next_month(current):
        raise HTTPException(
            422, "Budgets can be set for this month or next month only."
        )

    # Replace the month's rows in one write; there is deliberately no way to delete them.
    conn.execute("DELETE FROM category_budgets WHERE month = ?", (month,))
    conn.execute(
        "INSERT INTO monthly_budgets (month, amount) VALUES (?, ?)"
        " ON CONFLICT (month) DO UPDATE SET amount = excluded.amount",
        (month, payload.monthly),
    )
    conn.executemany(
        "INSERT INTO category_budgets (month, category_id, amount) VALUES (?, ?, ?)",
        [(month, category, amount) for category, amount in payload.categories.items()],
    )
    saved = budget_in_force(conn, month)
    assert saved is not None
    return saved
