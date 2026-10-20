# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Personal Expense Tracker: a React + TypeScript + Vite frontend (`frontend/`) and a FastAPI backend (`backend/`). It lives in one exercise folder of a training repo. Every other top-level folder is unrelated, so keep changes inside `expense-tracker/`.

`README.md` lists five phases: expenses, categories, filtering, monthly summaries, budgets. Build them in order and keep each phase small. Phase 1 (expense CRUD) is done, and Phase 2 adds the 8 fixed categories (no category management screen). Storage is SQLite via the standard-library `sqlite3` module.

## UI design

Build the frontend to `design/DESIGN.md`. It covers the tokens, components, screens, validation copy, VND formatting and which UI belongs to which phase. The visual source is the design canvas at https://claude.ai/artifact/SdumiU3oAt8stbaR3ASLEa. If the two disagree, ask before picking one.

## Format on edit

`.claude/settings.json` registers a `PostToolUse` hook (`.claude/hooks/format-on-edit.sh`) that runs Ruff on edited backend `.py` files and Prettier on edited frontend files. It loads when Claude is started from `expense-tracker/`, and never blocks an edit if a formatter fails.

## Blocked commands

`.claude/settings.json` registers a `PreToolUse` hook (`.claude/hooks/block-forbidden-command.sh`) on `Bash`. It exits 2, blocking the call, for: pip / manual venv activation / ESLint (use uv and oxlint), force pushes and pushes or merges on `main`, `rm -rf` on `/`, `~`, `.` or `..`, `git reset --hard`, `git clean -f`, and deleting `backend/data/expenses.db`. If a block is wrong, change the rules in the script rather than working around it.

## Notify on finish

`.claude/settings.json` also registers a `Stop` hook (`.claude/hooks/notify-on-finish.sh`) that shows a macOS notification when Claude finishes responding. It does nothing where `osascript` is unavailable and never blocks.

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
uv run ruff format .                        # format (dev dependency)
```

- Managed with **uv** (`pyproject.toml` + committed `uv.lock`). Always use `uv run …` and `uv add` / `uv add --dev`, never pip or a manually activated venv.
- Non-packaged uv app (no build system). The FastAPI instance is `app.main:app`. `pyproject.toml` sets `pythonpath = ["."]` so tests can `from app.main import app`.
- Tests use `httpx2` rather than `httpx`, because Starlette's `TestClient` warns about plain `httpx`.
- All routes live under the `/api` prefix. The frontend depends on this prefix for proxying. Routes: `GET /api/health` and the `/api/expenses` CRUD routes in `app/expenses.py` (list, create, get, replace with `PUT`, delete).
- `app/db.py` owns SQLite: `init_db()` runs in the app lifespan and `get_connection()` is the per-request dependency. The file is `backend/data/expenses.db` (git-ignored); `EXPENSE_DB_PATH` overrides it, and `tests/conftest.py` points it at a temp file per test. Use the `client` fixture, which enters `TestClient` as a context manager so the lifespan creates the table.
- `category_id` is validated against the `CategoryId` literal in `app/schemas.py`, which must match `frontend/src/lib/categories.ts`; `init_db()` adds the column to databases created before categories existed. Validation lives in `app/schemas.py` (`ExpenseIn`) and must stay in sync with `frontend/src/lib/validation.ts` and the messages in `design/DESIGN.md`.

## Frontend (`frontend/`)

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # oxlint (config: .oxlintrc.json), not ESLint
npm test           # vitest run (helpers in src/lib)
npm run build      # tsc -b type-check, then vite build
npm run format     # prettier --write (config: .prettierrc.json)
```

- Scaffolded from the `create-vite` `react-ts` template (React 19, Vite 8, TypeScript ~6.0). No router or UI library.
- Layout: `src/api/` (typed fetch client, `ApiError`), `src/lib/` (pure helpers with `*.test.ts` Vitest tests), `src/components/` (screens and dialogs), `src/types.ts`. `App.tsx` owns the expense list state and the CRUD calls.
- Dialogs use native `<dialog>` with `showModal()` through `components/useModalDialog.ts`. Delete always goes through `ConfirmDeleteDialog`.
- Vitest only covers `src/lib`. There is no jsdom or component testing, so check UI changes in the browser.
- `vite.config.ts` proxies `/api` to `http://localhost:8000`. The frontend calls relative `/api/...` URLs, and the backend has **no CORS setup**. Run both dev servers together. The Transactions screen shows an error state if the backend isn't running.
