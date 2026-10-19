import sqlite3
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db import get_connection
from app.schemas import Expense, ExpenseIn

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]

COLUMNS = "id, amount, category_id, date, note, created_at"


def fetch_expense(conn: sqlite3.Connection, expense_id: int) -> Expense:
    row = conn.execute(
        f"SELECT {COLUMNS} FROM expenses WHERE id = ?", (expense_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    return Expense(**dict(row))


@router.get("")
def list_expenses(conn: Connection) -> list[Expense]:
    rows = conn.execute(
        f"SELECT {COLUMNS} FROM expenses ORDER BY date DESC, id DESC"
    ).fetchall()
    return [Expense(**dict(row)) for row in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseIn, conn: Connection) -> Expense:
    cursor = conn.execute(
        "INSERT INTO expenses (amount, category_id, date, note, created_at)"
        " VALUES (?, ?, ?, ?, ?)",
        (
            payload.amount,
            payload.category_id,
            payload.date.isoformat(),
            payload.note,
            datetime.now(UTC).isoformat(),
        ),
    )
    return fetch_expense(conn, cursor.lastrowid)


@router.get("/{expense_id}")
def get_expense(expense_id: int, conn: Connection) -> Expense:
    return fetch_expense(conn, expense_id)


@router.put("/{expense_id}")
def update_expense(expense_id: int, payload: ExpenseIn, conn: Connection) -> Expense:
    cursor = conn.execute(
        "UPDATE expenses SET amount = ?, category_id = ?, date = ?, note = ? WHERE id = ?",
        (
            payload.amount,
            payload.category_id,
            payload.date.isoformat(),
            payload.note,
            expense_id,
        ),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    return fetch_expense(conn, expense_id)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, conn: Connection) -> Response:
    cursor = conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
