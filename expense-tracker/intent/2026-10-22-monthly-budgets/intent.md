# Intent: Monthly budgets
Author: Tri Viet Huynh (Personal). Status: approved.

## Problem

The tracker shows what was spent each month and per category, but not whether that spending is too much. There is no way to set a limit, so the user has to work out in their head how much is left this month, which categories are running hot, and how much they can still spend per day. Budgets are the last unbuilt phase of the roadmap.

## Proposed outcome

- The user can set a monthly budget, and optionally a budget for any category, for the current month or next month.
- A month with no budget of its own uses the latest earlier month's budget, so setting it once carries forward until the user changes it.
- The Dashboard shows the remaining budget (or the overspent amount) with a status of On track, Near limit or Over budget. For the current month it also shows how much is safe to spend per day for the rest of the month.
- A Budget page shows the monthly budget, spent, remaining, how much is allocated to categories, and every category's progress, worst first.
- Invalid budgets can't be saved: the monthly budget is missing or 0, a category budget is 0, or the category budgets add up to more than the monthly budget.
- Past months' budgets can be viewed but not changed.
- Before any budget exists, the user is invited to set one.

## Affected users and systems

- **User:** the single person tracking their own spending.
- **Screens:** the Dashboard, a new Budget page, and the navigation.
- **Backend:** the API and the stored data gain budgets. The monthly summary also reflects the budget.

## Constraints

- The UI follows the existing design spec: its budget status thresholds, VND formatting, and budgets set per month.
- Amounts are whole đồng with the same upper limit as expenses.
- The app must reject invalid budgets, not just the screen.
- Keep the phase small. The Dashboard alert strip and the "pushed over budget" toast are out of scope for now.
- A month that has its own budget can't be reset to use the previous month's budget again.

## Open questions

- What should the new error messages and the empty Budget page say? The design spec gives the rules but not the wording.
- Does the design canvas match the design spec on the Budget page layout?
