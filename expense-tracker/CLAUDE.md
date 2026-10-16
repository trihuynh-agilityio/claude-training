# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Personal Expense Tracker: a React + TypeScript + Vite frontend (`frontend/`) and a FastAPI backend (`backend/`). It lives in one exercise folder of a training repo. Every other top-level folder is unrelated, so keep changes inside `expense-tracker/`.

`README.md` lists five phases: expenses, categories, filtering, monthly summaries, budgets. Build them in order and keep each phase small. **Storage has not been chosen yet**; it is decided in Phase 1.

## Git workflow

- Work on `dayNN/<topic>` branches cut from `dev` (e.g. `day06/expense-tracker-scaffold`).
- Merge feature branches into `dev` only, with a merge commit titled `Merge branch '<branch>' into 'dev'`. Never merge or open MRs into `main`.
- The remote is GitLab (`gitlab.asoft-python.com`), not GitHub.

## Backend (`backend/`)

```bash
uv sync
uv run fastapi dev app/main.py              # http://localhost:8000, docs at /docs
uv run pytest                               # all tests
uv run pytest tests/test_health.py::test_health_returns_ok   # single test
```

- Managed with **uv** (`pyproject.toml` + committed `uv.lock`). Always use `uv run …` and `uv add` / `uv add --dev`, never pip or a manually activated venv.
- Non-packaged uv app (no build system). The FastAPI instance is `app.main:app`. `pyproject.toml` sets `pythonpath = ["."]` so tests can `from app.main import app`.
- Tests use `httpx2` rather than `httpx`, because Starlette's `TestClient` warns about plain `httpx`.
- All routes live under the `/api` prefix (currently only `GET /api/health`). The frontend depends on this prefix for proxying.

## Frontend (`frontend/`)

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # oxlint (config: .oxlintrc.json), not ESLint
npm run build      # tsc -b type-check, then vite build
```

- Scaffolded from the `create-vite` `react-ts` template (React 19, Vite 8, TypeScript ~6.0). No test runner is set up yet.
- `vite.config.ts` proxies `/api` to `http://localhost:8000`. The frontend calls relative `/api/...` URLs, and the backend has **no CORS setup**. Run both dev servers together. The page shows "API status: ok" when the stack is wired up.
