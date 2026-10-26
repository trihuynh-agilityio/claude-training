---
name: review-checklist
description: Use when asked to review a branch, diff, pull request or merge request for the Personal Expense Tracker, or to check a change against the project's conventions before it goes up for review.
model: sonnet
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git status *) Read Grep Glob
---

# Review checklist

Review the change read-only from `expense-tracker/`, in this order: correctness, tests, readability, security basics, scope. Do not edit files or run the servers; for tests, lint, build and the browser smoke test use `release-checklist`.

Start by reading the change and its intent, spec and plan if `intent/<date>-<topic>/` exists:

```bash
git log dev..HEAD --oneline
git diff dev...HEAD -- expense-tracker/
```

## 1. Correctness

Does the code do what the spec says, including on the unhappy path?

- Logic matches the spec: empty state, boundary amounts, month rollover, invalid input.
- Backend dates that depend on today take a `today` parameter instead of reading the clock.
- These contracts agree on both sides:

| Area | Check |
|---|---|
| Categories | `CategoryId` in `backend/app/schemas.py` matches `frontend/src/lib/categories.ts` |
| Validation | `ExpenseIn` and `BudgetIn` in `backend/app/schemas.py` match `frontend/src/lib/validation.ts` and the copy in `design/DESIGN.md` |
| API | Every route is under `/api`; the frontend calls relative `/api/...` URLs; no CORS added |
| Types | Response shapes match `frontend/src/types.ts` and `src/api/` |
| Database | Schema changes are handled in `init_db()` so an existing `backend/data/expenses.db` still opens |

- Amounts are formatted as VND through the shared helper. Delete goes through `ConfirmDeleteDialog`.

## 2. Tests

- New or changed `src/lib` helpers and `src/api` code have Vitest tests; non-trivial components have jsdom tests.
- New or changed routes have pytest tests using the `client` fixture, with `today` passed explicitly.
- Tests assert behaviour and would fail if the change were reverted. Edge cases from step 1 are covered.

## 3. Readability

- Names and comment density match the surrounding code; pure logic sits in `src/lib`, not in components.
- Routes use the `get_connection()` dependency; dialogs use `useModalDialog`.
- No dead code, stray `console.log`, commented-out blocks or unrelated reformatting.

## 4. Security basics

- SQL is parameterised, never built with f-strings or concatenation.
- Request input goes through the Pydantic schemas; nothing is trusted from the client unchecked.
- No secrets, no committed `backend/data/expenses.db`, no `dangerouslySetInnerHTML` or unescaped user text.
- Dependencies changed only when needed: `uv.lock` and `package-lock.json` move with their manifests.

## 5. Scope

- Every change stays inside `expense-tracker/` and belongs to the current README phase; nothing beyond the spec.
- Docs touched by the change (README, `CLAUDE.md`, `design/DESIGN.md`) describe the new state.
- Tooling rules held: uv only, oxlint not ESLint, branch `dayNN/<topic>` cut from `dev` and targeting `dev`, never `main`.

## 6. Report

Group findings by severity, each with `file:line` and a one-line fix:

- **Blocking**: wrong behaviour, broken contract, security issue, missing tests for new logic.
- **Should fix**: convention breaks, unclear code, doc drift, scope creep.
- **Nit**: style and naming.

End with one line: approve, or request changes. If nothing is wrong, say so rather than inventing nits.
