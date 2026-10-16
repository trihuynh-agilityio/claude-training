from fastapi import FastAPI

app = FastAPI(title="Personal Expense Tracker API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
