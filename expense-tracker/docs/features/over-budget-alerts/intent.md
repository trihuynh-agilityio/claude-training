# Intent: Over-budget alerts
Author: Tri Viet Huynh (Personal project). Status: approved.

## Problem

Monthly and category budgets can be set and tracked on the Budget screen, but nothing warns the user while they spend. Someone adding an expense that pushes a category past its budget learns about it only by opening Budget, and the Dashboard shows no sign that a category is over or close to its limit. The design spec already describes a Dashboard alert strip and an over-budget toast, and neither is built.

## Proposed outcome

- The Dashboard shows an alert strip for the month being viewed whenever the monthly budget or any category budget is over budget or near its limit. Categories with no budget are never flagged. The strip is one summary line that names what is affected (for example "2 over budget, 1 near limit") and links to Budget. It is not dismissible and disappears by itself once nothing is over or near.
- After the user adds or edits an expense, a toast warns them only if that save moved the monthly budget or a category from within budget to over budget. It checks the month of the expense's own date, so a back-dated expense is judged against that month's budget. Items already over budget before the save, deletes, and expenses added by recurring catch-up never trigger it.
- Near-limit never raises a toast.

## Affected users and systems

- The person tracking their spending, on the Dashboard and when saving an expense.
- The Dashboard (new strip) and the add/edit expense flow (new toast message).
- Existing budget and monthly summary data are reused as they are.

## Constraints

- Frontend only: no new data, no change to stored budgets or expenses.
- Over budget, near limit and their thresholds follow the existing budget status rules and the design spec.
- Only the two surfaces named in the design spec are in scope; no email, push or other notifications.
- Toast wording and strip layout follow the design spec's existing toast and alert styles.

## Open questions

- What exact wording should the strip and the over-budget toast use?
- If a save pushes both the monthly budget and a category over at once, should the toast name both or just one?
