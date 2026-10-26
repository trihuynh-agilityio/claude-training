import calendar
import sqlite3
from collections.abc import Iterator
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.db import get_connection
from app.schemas import PausedIn, Recurring, RecurringIn

router = APIRouter(prefix="/api/recurring", tags=["recurring"])

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]

TodayParam = Annotated[
    date | None,
    Query(
        ge=date(1900, 1, 1),
        le=date(2099, 12, 31),
        description="The caller's date (YYYY-MM-DD); defaults to the server's date",
    ),
]

MAX_MONTHS_BACK = 24
RULE_COLUMNS = (
    "id, amount, category_id, note, day, start_date, end_date, paused, last_generated"
)


def occurrence_in_month(day: int, year: int, month: int) -> date:
    """The rule's date in a month; short months use their last day."""
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


def occurrences(
    day: int,
    start: date,
    end: date | None,
    after: date | None,
    up_to: date | None,
) -> Iterator[date]:
    """Occurrence dates from `start` through `end`, later than `after` and not past `up_to`."""
    year, month = start.year, start.month
    while year <= 9999:
        found = occurrence_in_month(day, year, month)
        if (end and found > end) or (up_to and found > up_to):
            return
        if found >= start and (after is None or found > after):
            yield found
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)


def months_back(today: date, months: int) -> date:
    total = today.year * 12 + today.month - 1 - months
    year, month = divmod(total, 12)
    return occurrence_in_month(today.day, year, month + 1)


def parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def to_rule(row: sqlite3.Row) -> Recurring:
    data = dict(row)
    data["paused"] = bool(data["paused"])
    start = date.fromisoformat(data["start_date"])
    end = parse_date(data["end_date"])
    last = parse_date(data["last_generated"])
    data["next_due"] = (
        None
        if data["paused"]
        else next(occurrences(data["day"], start, end, last, None), None)
    )
    return Recurring(**data)


def fetch_rule(conn: sqlite3.Connection, rule_id: int) -> sqlite3.Row:
    row = conn.execute(
        f"SELECT {RULE_COLUMNS} FROM recurring_rules WHERE id = ?", (rule_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recurring expense not found")
    return row


def check_start_date(start: date, today: date) -> None:
    if start < months_back(today, MAX_MONTHS_BACK):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Start date can't be more than 24 months ago.",
        )


@router.get("")
def list_rules(conn: Connection) -> list[Recurring]:
    rows = conn.execute(
        f"SELECT {RULE_COLUMNS} FROM recurring_rules ORDER BY id"
    ).fetchall()
    return [to_rule(row) for row in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_rule(
    payload: RecurringIn, conn: Connection, today: TodayParam = None
) -> Recurring:
    check_start_date(payload.start_date, today or date.today())
    cursor = conn.execute(
        "INSERT INTO recurring_rules"
        " (amount, category_id, note, day, start_date, end_date, created_at)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            payload.amount,
            payload.category_id,
            payload.note,
            payload.day,
            payload.start_date.isoformat(),
            payload.end_date.isoformat() if payload.end_date else None,
            datetime.now(UTC).isoformat(),
        ),
    )
    return to_rule(fetch_rule(conn, cursor.lastrowid))


@router.post("/generate")
def generate(conn: Connection, today: TodayParam = None) -> dict[str, int]:
    """Add every due, unhandled occurrence of every active rule; returns how many."""
    today = today or date.today()
    # One write transaction for the whole run, so two tabs can't add an occurrence twice.
    conn.execute("BEGIN IMMEDIATE")
    added = 0
    for row in conn.execute(
        f"SELECT {RULE_COLUMNS} FROM recurring_rules WHERE paused = 0"
    ).fetchall():
        last = parse_date(row["last_generated"])
        end = parse_date(row["end_date"])
        due = list(
            occurrences(
                row["day"], date.fromisoformat(row["start_date"]), end, last, today
            )
        )
        for found in due:
            conn.execute(
                "INSERT INTO expenses"
                " (amount, category_id, date, note, created_at, recurring_id)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (
                    row["amount"],
                    row["category_id"],
                    found.isoformat(),
                    row["note"],
                    datetime.now(UTC).isoformat(),
                    row["id"],
                ),
            )
        if due:
            conn.execute(
                "UPDATE recurring_rules SET last_generated = ? WHERE id = ?",
                (due[-1].isoformat(), row["id"]),
            )
            added += len(due)
    return {"added": added}


@router.put("/{rule_id}")
def update_rule(
    rule_id: int, payload: RecurringIn, conn: Connection, today: TodayParam = None
) -> Recurring:
    # Take the write lock first, so a concurrent generate can't slip in after the lock check.
    conn.execute("BEGIN IMMEDIATE")
    row = fetch_rule(conn, rule_id)
    if payload.start_date.isoformat() != row["start_date"]:
        if row["last_generated"] is not None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "Start date can't change after the first expense is added.",
            )
        check_start_date(payload.start_date, today or date.today())
    conn.execute(
        "UPDATE recurring_rules SET amount = ?, category_id = ?, note = ?, day = ?,"
        " start_date = ?, end_date = ? WHERE id = ?",
        (
            payload.amount,
            payload.category_id,
            payload.note,
            payload.day,
            payload.start_date.isoformat(),
            payload.end_date.isoformat() if payload.end_date else None,
            rule_id,
        ),
    )
    return to_rule(fetch_rule(conn, rule_id))


@router.patch("/{rule_id}")
def set_paused(
    rule_id: int, payload: PausedIn, conn: Connection, today: TodayParam = None
) -> Recurring:
    row = fetch_rule(conn, rule_id)
    last_generated = row["last_generated"]
    if row["paused"] and not payload.paused:
        # Resuming skips what fell due while paused: mark everything up to today as handled.
        last = parse_date(last_generated)
        end = parse_date(row["end_date"])
        skipped = list(
            occurrences(
                row["day"],
                date.fromisoformat(row["start_date"]),
                end,
                last,
                today or date.today(),
            )
        )
        if skipped:
            last_generated = skipped[-1].isoformat()
    conn.execute(
        "UPDATE recurring_rules SET paused = ?, last_generated = ? WHERE id = ?",
        (int(payload.paused), last_generated, rule_id),
    )
    return to_rule(fetch_rule(conn, rule_id))


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, conn: Connection) -> Response:
    fetch_rule(conn, rule_id)
    conn.execute(
        "UPDATE expenses SET recurring_id = NULL WHERE recurring_id = ?", (rule_id,)
    )
    conn.execute("DELETE FROM recurring_rules WHERE id = ?", (rule_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
