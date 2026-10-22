# Plan: Monthly budgets (from intent.md and spec.md)

## Files that change

Backend (`expense-tracker/backend/`):
- `app/db.py`: add `monthly_budgets` and `category_budgets` tables to `init_db()`.
- `app/schemas.py`: `BudgetIn` (R3, R4), `Budget` response, `budget` field on `MonthlySummary`.
- `app/budgets.py` (new): `GET /api/budgets`, `PUT /api/budgets/{month}`, with R5 and R6 in the route.
- `app/summary.py`: attach the budget in force (R11), reusing the lookup from `budgets.py`.
- `app/main.py`: include the budgets router.
- `tests/test_budgets.py` (new), `tests/test_summary.py` (extend).

Frontend (`expense-tracker/frontend/src/`):
- `types.ts`, `api/budgets.ts` (new), `api/summary.ts` unchanged.
- `lib/budgets.ts` + `lib/budgets.test.ts` (new): status, remaining, safe per day.
- `lib/validation.ts` + `lib/validation.test.ts`: budget form checks (R3, R4).
- `components/BudgetPage.tsx` (new, with its test): Budget page and Edit budgets mode.
- `components/StatusBadge.tsx`, `ProgressBar.tsx`, `MoneyInput.tsx` (new, see Risks).
- `components/DashboardPage.tsx` (+ test): Remaining and Safe to spend cards, status badge, empty invite.
- `components/AppShell.tsx`, `App.tsx`: Budget nav item and `view` value.

Docs: `CLAUDE.md` (route list, new files), `README.md` phase 5 tick.

## Order of work

1. Tables in `db.py`; `BudgetIn` validation in `schemas.py` (R3, R4).
2. `budgets.py` GET and PUT with the carry-forward lookup, past-month rejection, no delete route (R1, R2, R5, R6); register in `main.py`.
3. Add the budget to the summary (R11).
4. `lib/budgets.ts` helpers and `lib/validation.ts` mirror, test-first (R3, R4, R7, R8).
5. `api/budgets.ts`, types, then shared components (`StatusBadge`, `ProgressBar`, `MoneyInput`).
6. Dashboard cards, status badge and empty invite (R8, R10).
7. Budget page with Edit mode and category sort, wired into nav and `App.tsx` (R9, R10).
8. Update `CLAUDE.md` and `README.md`; run the full checks.

Each step lands green before the next; the backend is finished before any UI because the API is the authority.

## Risks

- `MoneyInput`, `ProgressBar` and `StatusBadge` are named as reused in the spec but do not exist in `src/components/`; they must be built from `design/DESIGN.md`.
- Spec concern 3: the design canvas was not checked against `design/DESIGN.md` for the Budget page. `CLAUDE.md` says to ask if they disagree; ask the product owner before step 7.
- Spec concern 2: error and empty-state wording is unanswered. Use the proposed copy and flag it in the PR.
- Spec concern 4: last day of the month divides by 0 days. Build the proposed behaviour (show the whole remaining amount) and cover it with a test.
- Existing databases need the new tables created on startup; `CREATE TABLE IF NOT EXISTS` in `init_db()` handles this without touching `expenses`.
- Dashboard will differ from the design spec until the alert strip and toast are built (spec concern 1).

## Proof

Backend (`uv run pytest`), `today` passed explicitly:
- `test_budgets.py`: save and read for the current and next month (R1); a month with no budget inherits the latest earlier one with its categories, and `GET` says which month it came from (R2); 0, over 1.000.000.000, floats and strings are rejected (R3); missing or 0 monthly, 0 category, and categories summing above the monthly each fail with 422 (R4); `PUT` to a past month is rejected and `GET` of one works (R5); no `DELETE` route exists, so it returns 405 or 404 (R6).
- `test_summary.py`: summary carries the budget in force, or null when none (R11).

Frontend (`npm test`, `npm run lint`, `npm run build`):
- `lib/budgets.test.ts`: 84.99%, 85%, 100% and 100.01% give On track, Near limit, Near limit, Over budget (R7); remaining goes negative as an overspent amount; safe per day rounds down to 1.000 ₫, with 15 days left on 16 Oct and the last-day case (R8).
- `lib/validation.test.ts`: form mirrors R3 and R4.
- `BudgetPage.test.tsx`: categories sorted Over budget, Near limit, then % used (R9); empty invite (R10); Save disabled on invalid input.
- `DashboardPage.test.tsx`: Remaining, Safe to spend (current month only) and badge text (R8); empty invite (R10).

UI test in Chrome, with captures (Claude in Chrome, run after step 7 against `npm run dev` on :5173 and `uv run fastapi dev app/main.py` on :8000, on a throwaway `EXPENSE_DB_PATH` seeded with the sample data so `today` is 16 Oct):
- Each step below is checked in the page and captured as a screenshot, saved to `intent/2026-10-22-monthly-budgets/proof/NN-name.png`. A GIF of the whole run is saved as `proof/budgets-flow.gif`.
- Each capture is compared with `design/DESIGN.md` (tokens, VND formatting, badge colours) and the result is noted next to the file name in the PR.

| # | Step | Expect | Req | Capture |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Open Dashboard and Budget page with no budget | Both invite the user to set one | R10 | `01-empty-dashboard.png`, `02-empty-budget.png` |
| 2 | Edit budgets: leave monthly empty, then enter 0 | Save disabled, "Enter a monthly budget." shown | R3, R4 | `03-error-missing.png` |
| 3 | Add a category budget of 0, then categories above the monthly | Save disabled, "Category budgets add up to more than the monthly budget." shown | R4 | `04-error-over-allocated.png` |
| 4 | Save a valid monthly budget with two category budgets | Budget page shows monthly, spent, remaining, allocated | R1, R9 | `05-budget-saved.png` |
| 5 | Open Dashboard | Remaining card, Safe to spend card (current month) and On track badge | R7, R8, R11 | `06-dashboard-on-track.png` |
| 6 | Add expenses to cross 85%, then 100% | Badge turns Near limit, then Over budget; remaining becomes the amount over | R7, R8 | `07-near-limit.png`, `08-over-budget.png` |
| 7 | Check the category list | Over budget first, then Near limit, then by % used | R9 | `09-category-order.png` |
| 8 | Switch to next month | Shows the carried-forward budget and its source month; Safe to spend hidden | R2, R8 | `10-next-month-inherited.png` |
| 9 | Switch to a past month | Budget visible, Edit budgets unavailable | R5 | `11-past-month-readonly.png` |
| 10 | Look for a way to remove the month's own budget | None offered | R6 | covered by `05-budget-saved.png` |
| 11 | Resize to phone width (375px) and repeat 5 and 7 | No horizontal scroll, layout follows `DESIGN.md` | design | `12-dashboard-mobile.png`, `13-budget-mobile.png` |
| 12 | Read the browser console and network tab | No errors; `PUT /api/budgets/{month}` returns 200, invalid saves never reach it | R4 | note in the PR |

If the run finds a mismatch with `DESIGN.md`, stop and ask before changing either one (spec concern 3).
