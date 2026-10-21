import calendar
import sqlite3
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.db import get_connection
from app.schemas import CategoryTotal, MonthlySummary

router = APIRouter(prefix="/api/summary", tags=["summary"])

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]

MonthParam = Annotated[
    str | None,
    Query(
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$",
        description="YYYY-MM, defaults to this month",
    ),
]


def month_start(year: int, month: int) -> date:
    return date(year, month, 1)


def previous_month(year: int, month: int) -> tuple[int, int]:
    return (year - 1, 12) if month == 1 else (year, month - 1)


def sum_between(conn: sqlite3.Connection, first: date, last: date) -> int:
    """Total spent from `first` to `last`, both inclusive."""
    row = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date >= ? AND date <= ?",
        (first.isoformat(), last.isoformat()),
    ).fetchone()
    return row["total"]


@router.get("")
def monthly_summary(conn: Connection, month: MonthParam = None) -> MonthlySummary:
    today = date.today()
    if month is None:
        month = f"{today.year:04d}-{today.month:02d}"
    year, number = int(month[:4]), int(month[5:])
    days_in_month = calendar.monthrange(year, number)[1]
    first = month_start(year, number)
    last = date(year, number, days_in_month)

    rows = conn.execute(
        "SELECT category_id, SUM(amount) AS total, COUNT(*) AS count FROM expenses"
        " WHERE date >= ? AND date <= ? GROUP BY category_id ORDER BY total DESC, category_id",
        (first.isoformat(), last.isoformat()),
    ).fetchall()
    categories = [CategoryTotal(**dict(row)) for row in rows]

    # Compare like with like: this month up to today (or all of a past month) against the
    # same number of days of the month before, clamped when that month is shorter.
    cutoff = today.day if (today.year, today.month) == (year, number) else days_in_month
    prev_year, prev_number = previous_month(year, number)
    prev_days = calendar.monthrange(prev_year, prev_number)[1]
    previous_total = sum_between(
        conn,
        month_start(prev_year, prev_number),
        date(prev_year, prev_number, min(cutoff, prev_days)),
    )

    return MonthlySummary(
        month=month,
        total=sum(c.total for c in categories),
        count=sum(c.count for c in categories),
        same_day_last_month_total=previous_total,
        categories=categories,
    )
