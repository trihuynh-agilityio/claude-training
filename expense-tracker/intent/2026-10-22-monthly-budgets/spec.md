# Spec: Monthly budgets
From: intent.md (Tri Viet Huynh, Personal). Status: approved.
Skills applied: none.

## Requirements

- R1. The user can save a monthly budget for the current month or the next month. A category budget for any of the 8 categories is optional.
- R2. A month with no budget of its own uses the budget of the latest earlier month that has one. Category budgets carry forward with it.
- R3. A budget is a whole number of đồng from 1 to 1.000.000.000, the same limit as an expense.
- R4. The API rejects a budget when the monthly budget is missing or 0, a category budget is 0, or the category budgets add up to more than the monthly budget.
- R5. The API rejects a change to a month before the current month. Those months can be read only.
- R6. Once a month has its own budget, the user cannot remove it to fall back on an earlier month.
- R7. Status is spent ÷ budget: On track below 85%, Near limit from 85% up to and including 100%, Over budget above 100%. Status is also written as text.
- R8. The Dashboard shows the remaining budget (or the amount over) and its status. For the current month it also shows the safe amount to spend per day: remaining ÷ days left after today, rounded down to 1.000 ₫.
- R9. The Budget page shows the monthly budget, spent, remaining, the amount allocated to categories, and every category's progress. Categories are sorted Over budget first, then Near limit, then by % used.
- R10. When no budget exists for a month, the Dashboard and the Budget page invite the user to set one.
- R11. The monthly summary includes the month's budget, so the Dashboard needs no second request.

## Design

- Stored data: a table for monthly budgets (month, amount) and one for category budgets (month, category, amount). A month with no rows has no budget of its own. The existing expenses table is unchanged.
- API, under the `/api` prefix in a new `budgets.py`:
  - `GET /api/budgets?month=YYYY-MM&today=...` returns the budget in force for that month, the month it comes from, and whether it is the month's own.
  - `PUT /api/budgets/{month}` replaces the month's monthly and category budgets in one write. It uses the `today` parameter pattern of the summary so tests do not depend on the real clock.
- Validation sits in `schemas.py` next to `ExpenseIn`. R4 and R3 are checked there, and R5 and R6 in the route.
- `GET /api/summary` gains the budget in force, as in R11. Spent per category already comes from the summary.
- Frontend:
  - A new Budget page, reached from the navigation, with an Edit budgets mode that follows `design/DESIGN.md`.
  - Remaining and Safe to spend KPI cards and a status badge on the Dashboard.
  - A `lib/budgets.ts` helper for status, remaining and safe per day, with Vitest tests.
  - `lib/validation.ts` mirrors R3 and R4 so the form can disable Save, but the API stays the authority.
- Reused: the VND formatting, tokens, `MoneyInput`, `ProgressBar` and `StatusBadge` from the design spec.
- Not built: the Dashboard alert strip and the "pushed over budget" toast.

## How each constraint in the intent is met

| Constraint | Met by |
| :---- | :---- |
| The UI follows the existing design spec: its budget status thresholds, VND formatting, and budgets set per month. | R7 for the thresholds. The Design reuses the VND formatter and the tokens in `design/DESIGN.md`. Budgets are stored per month. |
| Amounts are whole đồng with the same upper limit as expenses. | R3. |
| The app must reject invalid budgets, not just the screen. | R4, R5 and R6 are enforced in the API. The form check in `lib/validation.ts` is only a convenience. |
| Keep the phase small. The Dashboard alert strip and the "pushed over budget" toast are out of scope for now. | Listed under "Not built" in the Design. See concern 1. |
| A month that has its own budget can't be reset to use the previous month's budget again. | R6. The API has no delete route for a month's budget. |

## Open questions from the intent

- What should the new error messages and the empty Budget page say? Not answered. Carried forward as concern 2.
- Does the design canvas match the design spec on the Budget page layout? Not answered. Carried forward as concern 3.

## Areas of concern

1. `design/DESIGN.md` maps the alert strip and the over-budget toast to phase 5 (Budgets), and its Add/Edit and Dashboard sections describe them. The intent puts both out of scope. This spec follows the intent and leaves them out, so the Dashboard will not match the design spec until they are built. Owner: product owner.
2. The design spec gives the rules for the new errors but not the wording, and gives no copy for the empty Budget page. The spec does not invent any. Proposed: reuse the form pattern of the expense errors, for example "Enter a monthly budget." and "Category budgets add up to more than the monthly budget." Owner: product owner.
3. The design canvas was not opened for this spec, so its Budget page layout is unchecked against `design/DESIGN.md`. `CLAUDE.md` says to ask before picking one if they disagree. Owner: product owner.
4. The safe amount per day divides by the days left after today (15 on 16 Oct in the sample data). On the last day of the month that is 0 days. The design spec does not say what to show. Proposed: show the whole remaining amount as that day's limit. Owner: product owner.
5. The intent lets the user set the current or next month only, but a month's own budget cannot be removed (R6). A budget saved by mistake for next month can be edited but never undone. Owner: product owner.
