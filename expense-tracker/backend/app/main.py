from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import init_db
from app.expenses import router as expenses_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="Personal Expense Tracker API", lifespan=lifespan)
app.include_router(expenses_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
