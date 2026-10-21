from datetime import date as Date
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, StrictInt, field_validator

MAX_AMOUNT = 1_000_000_000
MAX_NOTE_LENGTH = 120

# The fixed category ids; names and colors live in frontend/src/lib/categories.ts.
CategoryId = Literal[
    "food", "transport", "bills", "shopping", "leisure", "health", "education", "other"
]


class ExpenseIn(BaseModel):
    """Fields a client sends to create or replace an expense."""

    # Whole đồng: VND has no minor unit, so floats and strings are rejected.
    amount: Annotated[StrictInt, Field(ge=1, le=MAX_AMOUNT)]
    category_id: CategoryId
    date: Date
    note: Annotated[str | None, Field(max_length=MAX_NOTE_LENGTH)] = None

    @field_validator("date")
    @classmethod
    def date_not_in_future(cls, value: Date) -> Date:
        if value > Date.today():
            raise ValueError("Date can't be in the future.")
        return value

    @field_validator("note", mode="before")
    @classmethod
    def blank_note_is_none(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class Expense(ExpenseIn):
    id: int
    created_at: datetime


class CategoryTotal(BaseModel):
    category_id: CategoryId
    total: int
    count: int


class MonthlySummary(BaseModel):
    """Spending for one month, with the same-day comparison against the month before."""

    month: str
    total: int
    count: int
    same_day_last_month_total: int
    categories: list[CategoryTotal]
