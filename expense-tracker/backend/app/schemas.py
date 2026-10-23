from datetime import date as Date
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, StrictInt, field_validator, model_validator

MAX_AMOUNT = 1_000_000_000
MAX_NOTE_LENGTH = 120

# The fixed category ids; names and colors live in frontend/src/lib/categories.ts.
CategoryId = Literal[
    "food", "transport", "bills", "shopping", "leisure", "health", "education", "other"
]


class ExpenseBase(BaseModel):
    """Fields shared by what a client sends and what is stored."""

    # Whole đồng: VND has no minor unit, so floats and strings are rejected.
    amount: Annotated[StrictInt, Field(ge=1, le=MAX_AMOUNT)]
    category_id: CategoryId
    date: Date
    note: Annotated[str | None, Field(max_length=MAX_NOTE_LENGTH)] = None

    @field_validator("note", mode="before")
    @classmethod
    def blank_note_is_none(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class ExpenseIn(ExpenseBase):
    """Fields a client sends to create or replace an expense."""

    @field_validator("date")
    @classmethod
    def date_not_in_future(cls, value: Date) -> Date:
        if value > Date.today():
            raise ValueError("Date can't be in the future.")
        return value


class Expense(ExpenseBase):
    # Not ExpenseIn: a rule may add an expense dated today in a client ahead of the server clock.
    id: int
    created_at: datetime
    recurring_id: int | None = None


class CategoryTotal(BaseModel):
    category_id: CategoryId
    total: int
    count: int


Amount = Annotated[StrictInt, Field(ge=1, le=MAX_AMOUNT)]


class RecurringIn(BaseModel):
    """A monthly rule. Amount, category and note follow the rules of ExpenseIn."""

    amount: Amount
    category_id: CategoryId
    note: Annotated[str | None, Field(max_length=MAX_NOTE_LENGTH)] = None
    day: Annotated[StrictInt, Field(ge=1, le=31)]
    start_date: Date
    end_date: Date | None = None

    @field_validator("note", mode="before")
    @classmethod
    def blank_note_is_none(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @model_validator(mode="after")
    def end_not_before_start(self) -> "RecurringIn":
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("End date can't be before the start date.")
        return self


class Recurring(RecurringIn):
    id: int
    paused: bool
    last_generated: Date | None = None
    next_due: Date | None = None


class PausedIn(BaseModel):
    paused: bool


class BudgetIn(BaseModel):
    """A month's budget: one monthly amount and an optional amount per category."""

    monthly: Amount
    categories: dict[CategoryId, Amount] = {}

    @model_validator(mode="after")
    def categories_fit_in_monthly(self) -> "BudgetIn":
        if sum(self.categories.values()) > self.monthly:
            raise ValueError("Category budgets add up to more than the monthly budget.")
        return self


class Budget(BudgetIn):
    """The budget in force for `month`; `source_month` is the month it was saved for."""

    month: str
    source_month: str
    is_own: bool


class MonthlySummary(BaseModel):
    """Spending for one month, with the same-day comparison against the month before."""

    month: str
    total: int
    count: int
    same_day_last_month_total: int
    categories: list[CategoryTotal]
    budget: Budget | None = None
