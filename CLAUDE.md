# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

A sandbox for an AI tools training program (Developer track). Each top-level folder is a **self-contained exercise** with its own tooling, dependencies and README. There is no root-level build, lockfile or shared code, so run every command from inside the exercise folder it belongs to.

| Folder | What it is |
|---|---|
| `expense-tracker/` | Personal Expense Tracker web app: React + TypeScript + Vite frontend, FastAPI backend. The active project. |
| `login-bug/` | FastAPI sign-in app used for a bug-reproduction exercise. BUG-01 is documented in `BUG-01.md` and is now fixed. |
| `ticket-analysis/` | Markdown only (Day 2 ticket-analysis exercise). No code. |

Python projects use **uv** (`pyproject.toml` + committed `uv.lock`). Always use `uv run …` and `uv add` / `uv add --dev`, never pip or a manually activated venv. Tests use `httpx2` rather than `httpx`, because Starlette's `TestClient` warns about plain `httpx`.

## Git workflow

- Work on `dayNN/<topic>` branches cut from `dev` (e.g. `day06/expense-tracker-scaffold`).
- Merge feature branches into `dev` only, with a merge commit titled `Merge branch '<branch>' into 'dev'`. Never merge or open MRs into `main`.
- The remote is GitLab (`gitlab.asoft-python.com`), not GitHub.

## expense-tracker

The README lists five phases: expenses, categories, filtering, monthly summaries, budgets. Build them in order and keep each phase small. **Storage has not been chosen yet**; it is decided in Phase 1.

### Backend (`expense-tracker/backend`)

```bash
uv sync
uv run fastapi dev app/main.py              # http://localhost:8000, docs at /docs
uv run pytest                               # all tests
uv run pytest tests/test_health.py::test_health_returns_ok   # single test
```

- Non-packaged uv app (no build system). The FastAPI instance is `app.main:app`. `pyproject.toml` sets `pythonpath = ["."]` so tests can `from app.main import app`.
- All routes live under the `/api` prefix (currently only `GET /api/health`). The frontend depends on this prefix for proxying.

### Frontend (`expense-tracker/frontend`)

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # oxlint (config: .oxlintrc.json), not ESLint
npm run build      # tsc -b type-check, then vite build
```

- Scaffolded from the `create-vite` `react-ts` template (React 19, Vite 8, TypeScript ~6.0). No test runner is set up yet.
- `vite.config.ts` proxies `/api` to `http://localhost:8000`. The frontend calls relative `/api/...` URLs, and the backend has **no CORS setup**. Run both dev servers together. The page shows "API status: ok" when the stack is wired up.

## login-bug

```bash
uv sync
uv run app.py                       # http://localhost:3000 (override with PORT=4000)
uv run pytest                       # all tests
uv run pytest tests/test_login_api.py::test_login_rejects_wrong_password   # single test
```

- `app.py` defines `POST /api/login` and then mounts `public/` as static files at `/`. The mount must stay **after** the API routes, or it shadows them.
- `src/users.py` is an in-memory store that hashes the test passwords at import time. `find_user` lowercases and trims the username.
- `src/auth.py` stores hashes as `scrypt$<salt hex>$<hash hex>` and verifies them with `hmac.compare_digest`. BUG-01 was caused by hashing passwords one way when storing them and another way when verifying them. Keep `hash_password` and `verify_password` in sync.
- This is a training exercise. `README.md` and `BUG-01.md` describe the reproduction steps and the fix, so update them whenever behavior changes.
