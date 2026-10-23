# Plan: Recurring expenses (from intent.md and spec.md)

## Files that change

Backend (`expense-tracker/backend/`):
- `app/db.py`: `recurring_rules` table; nullable `expenses.recurring_id` added in `init_db()` for older databases (R1, R7).
- `app/schemas.py`: `RecurringIn`, `Recurring`; optional `recurring_id` on `Expense` (R1, R6, R7).
- `app/recurring.py` (new): CRUD, pause and resume, `POST /generate`, and the pure occurrence function (R2 to R6, R8 to R10).
- `app/main.py`: include the router.
- `app/expenses.py`: return `recurring_id` in the select.
- `tests/test_recurring.py` (new), plus `tests/test_expenses.py` for `recurring_id` in responses.

Frontend (`expense-tracker/frontend/src/`):
- `types.ts`, `api/` (recurring client), `lib/recurring.ts` and `lib/recurring.test.ts` (new), `lib/validation.ts` and its test (`validateRecurring`).
- `components/RecurringPage.tsx`, `RecurringFormDialog.tsx` (new), with `RecurringPage.test.tsx`.
- `components/ExpenseRow.tsx` (badge), `AppShell.tsx` (navigation), `icons.tsx` (repeat icon), `index.css`.
- `App.tsx`: new view, catch-up on mount before loading (R12).

Docs:
- `design/DESIGN.md`: Recurring screen, form, badge, validation copy, phase 7 row.
- `README.md`: phase 7 in the phase list. `CLAUDE.md`: phase 7 in the overview, routes and layout notes.
- `intent/2026-10-23-recurring-expenses/proof/` (new): browser captures from the UI test.

## Order of work

1. Docs branch `day13/recurring-expenses-docs` (this one), cut from `dev`, holds only documents: this intent, spec and plan, and the `design/DESIGN.md` update, so the UI is built to a written spec. No code lands on it. Code goes on `day13/recurring-expenses-backend` and then `day13/recurring-expenses-ui`, each cut from `dev` after the previous one has merged (as with `day12/budgets-docs` and `day12/budgets-ui`). All merge into `dev` only, never into `main`.
2. Backend, tests first: the pure occurrence function (clamp, start, end, 24-month limit) (R2, R3, R6).
3. Backend: table, column, CRUD and validation (R1, R7, R8, R9).
4. Backend: `generate` with idempotency, deleted-expense memory, pause and resume, race safety (R4, R5, R10).
5. Frontend `lib` and API client with tests (R2, R3, R11).
6. `RecurringPage`, form dialog, navigation, badge; then `App.tsx` catch-up wiring (R7, R11, R12).
7. Update `README.md` and `CLAUDE.md`.
8. Run `uv run pytest`, `uv run ruff format .`, `npm test`, `npm run lint`, `npm run build`, then the browser test below.

Each step lands green before the next. `README.md` and `CLAUDE.md` updates may go on whichever branch is open.

## Risks

- Spec concerns 1, 3 and 5 need product owner answers: build R10 as written, ask before step 6 about the mobile navigation and the "adds N expenses" warning.
- Concern 2: two tabs calling `generate` together. Do the read of `last_generated`, the inserts and its update in one `BEGIN IMMEDIATE` transaction per rule; test with two sequential calls and one call with the same `today`.
- Adding a column to `expenses` for old databases: `init_db()` must check `PRAGMA table_info` like the `category_id` migration, and a test must open a database made before the column existed.
- `today` must be passed explicitly in every backend test; no test reads the real clock. The browser sends its own date to `generate`, as it does to `GET /api/summary`.
- Deleting a rule must set `recurring_id` to NULL in the same transaction, or rows keep a dangling link and a badge.
- Clamping must use month length, not 30 days: test 31 on 28 and 29 February (leap year 2028) and on 30-day months.
- Start date 24-month limit is relative to `today`, so the validation takes `today` too; the frontend mirror in `validateRecurring` must match.
- Hand-written SQL stays parameterised; the note is user text.

## Proof

Backend (`uv run pytest`):
- Occurrence function: day 31 gives 28 February 2027, 29 February 2028, 30 April; day 15 starting 16 Oct gives 15 Nov first; end date stops after the last month it covers; start date 25 months back is rejected (R2, R3, R6).
- `POST /generate` with `today` fixed: a rule started 3 months ago adds 4 expenses (or the count the dates give) with the right dates, amount, category, note and `recurring_id`; a second call adds 0 (R4).
- Deleting one generated expense then calling `generate` again does not recreate it (R5).
- Nothing is dated after `today`, including a rule whose day is later this month (R4).
- Edit changes the next occurrence's amount and leaves added expenses as they were; start date edit is rejected after the first expense (R8).
- Delete rule keeps expenses with `recurring_id` null (R9).
- Pause adds nothing across 3 months; after resume the skipped months are not added and the next one is (R10).
- Validation: zero or negative amount, unknown category, day 0 and 32, end before start give 422 with the same messages as the expense form (R1).
- A database created without `recurring_id` opens, and old rows come back with `recurring_id` null (R7).
- `GET /api/expenses`, `/api/summary` and budgets return generated rows like any other (R13).

Frontend (`npm test`, `npm run lint`, `npm run build`):
- `lib/recurring.test.ts`: next-due date and "Day 31" label for the cases above, "Paused" and "Ended" states (R11).
- `lib/validation.test.ts`: `validateRecurring` mirrors the backend messages (R1, R6).
- `RecurringPage.test.tsx` (API mocked): empty state, list content, pause and resume call, delete only after confirming, form errors (R9, R11).
- `ExpenseRow` shows the badge only when `recurring_id` is set (R7).
- `App` calls `generate` once before the first list load, and still loads when it fails, with an error toast (R12).

Manual and UI:

UI test in Chrome, with captures (Claude in Chrome, run after step 6 against `npm run dev` on :5173 and `uv run fastapi dev app/main.py` on :8000, on a throwaway `EXPENSE_DB_PATH` seeded with the sample data from `design/DESIGN.md`, `today` set to 16 Oct). Each step is saved as a screenshot to `intent/2026-10-23-recurring-expenses/proof/NN-name.png` and compared with `design/DESIGN.md`; a mismatch stops the run for a decision.

| # | Step | Expect | Req | Capture |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Open Recurring on a fresh database | Empty state and "Add recurring expense" | R11 | `01-empty.png` |
| 2 | Add rent, 5,000,000 VND, day 1, start 1 Aug | Rule listed, next due 1 Nov, Transactions gets 1 Aug, 1 Sep, 1 Oct rows with the badge | R3, R4, R7 | `02-rule-created.png`, `03-backfilled-transactions.png` |
| 3 | Reload the app | No new rows | R4 | `04-reload-no-dupes.png` |
| 4 | Delete the 1 Sep row, reload | Stays deleted | R5 | `05-deleted-stays.png` |
| 5 | Add a rule on day 31 | Next due shows the last day of the month | R2 | `06-day-31.png` |
| 6 | Pause the rent rule | Shows "Paused", no change after reload | R10 | `07-paused.png` |
| 7 | Edit the amount | Existing rows keep the old amount | R8 | `08-edit-future-only.png` |
| 8 | Delete the rule and confirm | Rows stay, badge gone | R9 | `09-rule-deleted.png` |
| 9 | Submit the form with an empty amount, day 32, start 3 years back | Messages match `DESIGN.md` | R1, R6 | `10-validation.png` |
| 10 | Check Dashboard and Budget | Totals include the added rows | R13 | `11-dashboard.png` |
| 11 | Resize to 375px | Navigation, rows and form fit, no horizontal scroll | design | `12-recurring-mobile.png` |
| 12 | Read console and network | No errors; one `generate` call per load | R12 | note in the PR |

If the run finds a mismatch with `DESIGN.md`, stop and ask before changing either one (spec concern 5).
