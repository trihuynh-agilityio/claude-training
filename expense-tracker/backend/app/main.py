from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.budgets import router as budgets_router
from app.db import init_db
from app.expenses import router as expenses_router
from app.recurring import router as recurring_router
from app.summary import router as summary_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="Personal Expense Tracker API", lifespan=lifespan)
app.include_router(expenses_router)
app.include_router(budgets_router)
app.include_router(recurring_router)
app.include_router(summary_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
