# UI test report: Monthly budgets

Run on 22 Oct 2026 in Claude in Chrome against `npm run dev` (:5173) and `uv run fastapi dev` (:8000) on a throwaway `EXPENSE_DB_PATH`.
Captures are in `proof/`; `proof/budgets-flow.gif` is the recording (the recorder keeps at most 50 frames).

## Deviations from the plan

- **Today is 22 Oct, not 16 Oct.** The browser clock cannot be set, so the data was sized to the real date (9 days left, not 15). Safe to spend: 10.000.000 ₫ ÷ 9 = 1.111.000 ₫ and 8.000.000 ₫ ÷ 9 = 888.000 ₫, both rounded down correctly.
- **Mobile width is 500px, not 375px.** Chrome would not shrink the window below 500px. The mobile layout (under 768px) was in effect, and no horizontal scroll was found (scrollWidth 485 of 500). The 375px check is still open.
- **Expenses were added through the API**, then the page reloaded, to move between thresholds quickly. Adding through the UI was not exercised in this run.
- **The September budget was inserted straight into the database** for step 9, because the API refuses to create one for a past month (that is R5, and was verified).

## Results

| # | Step | Result | Capture |
| :-- | :-- | :-- | :-- |
| 1 | Empty Dashboard and Budget page | Pass. Both show an invite with "Set a monthly budget". | `01-empty-dashboard.jpg`, `02-empty-budget.jpg` |
| 2 | Monthly empty, then 0 | Pass. Save is disabled. "Enter a monthly budget." then "Monthly budget must be greater than 0 ₫." | `03a-error-missing-monthly.jpg`, `03-error-zero-monthly.jpg` |
| 3 | Category 0, then categories over the monthly | Pass. "Category budget must be greater than 0 ₫.", then "Category budgets add up to more than the monthly budget." (1.100.000 of 1.000.000). Save stays disabled. | `04a-error-category-zero.jpg`, `04-error-over-allocated.jpg` |
| 4 | Save 10.000.000 with Food 4.000.000 and Transport 3.000.000 | Pass. Toast "Budget saved". Budget page shows monthly, spent, remaining (≈ 1.111.000 ₫/day) and allocated (3.000.000 ₫ unallocated). | `05-budget-saved.jpg` |
| 5 | Dashboard with 2.000.000 spent | Pass. Remaining 8.000.000 ₫, On track, 20% of 10.000.000 ₫ used, Safe to spend 888.000 ₫, 9 days left. | `06-dashboard-on-track.jpg` |
| 6 | Spend to exactly 85%, then 110% | Pass. 8.500.000 gives Near limit (the 85% boundary), remaining 1.500.000 ₫. 11.000.000 gives Over budget, "Over budget by 1.000.000 ₫", Safe to spend 0 ₫. | `07-near-limit.jpg`, `08-over-budget.jpg` |
| 7 | Category order | Pass. Food 113% Over budget first, then Transport 90% Near limit. Header shows "1 Over budget" and "1 Near limit". | `09-category-order.jpg` |
| 8 | Next month | Pass. Shows the October budget with "Using the budget from October 2026…". No per-day figure. Edit is available. | `10-next-month-inherited.jpg` |
| 9 | Past month | Pass. September budget is visible and there is no Edit budgets button. | `11-past-month-readonly.jpg` |
| 10 | Way to remove a month's budget | Pass. None in the UI. `DELETE /api/budgets/2026-10` returns 405. | `05-budget-saved.jpg` |
| 11 | Phone layout | Partial. Bottom bar is Dashboard, Transactions, +, Budget. No horizontal scroll on Dashboard, Budget or Edit. Checked at 500px, not 375px. | `12-dashboard-mobile.jpg`, `13-budget-mobile.jpg`, `13a-budget-mobile-categories.jpg`, `13b-budget-mobile-edit.jpg` |
| 12 | Console and network | Pass. No console errors. The invalid saves sent no request. The valid save sent `PUT /api/budgets/2026-10` and got 200. A hand-made `PUT` to 2026-09 got 422. | note here |

## Bug found and fixed during the run

On desktop, a category error such as "Category budget must be greater than 0 ₫." squeezed its row: the label wrapped to three lines and the input shrank. Cause: `.budget-edit-row` only wrapped on mobile. Fix: `flex-wrap: wrap` for all widths in `frontend/src/index.css`. Re-checked in the browser (`04a-error-category-zero.jpg` shows the fixed layout).

## Open items

- **Design comparison:** captures were compared only by eye with `design/DESIGN.md` (badge colours, VND format, the tick on the bar). The design canvas was not opened, so spec concern 3 is still open.
- **Layout shift:** the monthly-budget error appears and disappears without reserved space, so the form below it moves up and down by about 17px. It did not cause a wrong result.
- **Progress bar width:** category rows have different bar widths, because the right-hand column ("300.000 ₫ left" vs "500.000 ₫ over") has a different width per row. Cosmetic.
- **Dashboard next month:** "Next" stays disabled on the Dashboard (per the design), so Safe to spend hiding for a future month was checked on the Budget page, which has no per-day figure for next month.
