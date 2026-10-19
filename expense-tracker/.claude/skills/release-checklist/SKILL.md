---
name: release-checklist
description: Use when preparing a release of the Personal Expense Tracker, before merging a feature branch into dev, or when asked whether the expense tracker is ready to ship.
model: sonnet
allowed-tools: Bash(uv sync --directory backend) Bash(uv run --directory backend *) Bash(npm --prefix frontend *) Bash(git diff *) Bash(git log *) Read Grep Glob
---

# Release checklist

Run every step from `expense-tracker/` and report each result. A failing step blocks the release: stop, report the output, and do not merge.

## 1. Backend tests

```bash
uv sync --directory backend
uv run --directory backend pytest
```

All tests pass. Use `uv run`, never pip or an activated venv.

## 2. Frontend lint, tests and build

```bash
npm --prefix frontend install
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
```

- `npm run lint` is oxlint, not ESLint. No errors.
- `npm test` runs Vitest over `src/lib` only.
- `npm run build` runs `tsc -b` then `vite build`. Both must succeed.

## 3. Review for regressions

Read the diff against `dev` (`git diff dev...HEAD -- expense-tracker/`) and check:

| Area | Check |
|---|---|
| Categories | `CategoryId` in `backend/app/schemas.py` matches `frontend/src/lib/categories.ts` |
| Validation | `ExpenseIn` in `backend/app/schemas.py`, `frontend/src/lib/validation.ts` and the messages in `design/DESIGN.md` agree |
| API | Every route stays under `/api`; the frontend still calls relative `/api/...` URLs |
| Database | Schema changes are handled in `init_db()` so an existing `backend/data/expenses.db` still opens |
| Scope | Changes stay inside `expense-tracker/` and belong to the current README phase |
| Tests | New or changed `src/lib` helpers and API routes have tests |

## 4. Smoke test in the browser

Vitest does not cover components, so run both servers and click through the changed screens:

```bash
uv run --directory backend fastapi dev app/main.py   # terminal 1
npm --prefix frontend run dev                       # terminal 2
```

On http://localhost:5173: add, edit and delete an expense (delete goes through the confirm dialog), apply the filters, and confirm amounts show in VND.

## 5. Report

Summarize pass/fail for steps 1–4 with any failing output. Merge only into `dev`, never `main`, as `Merge branch '<branch>' into 'dev'`.
