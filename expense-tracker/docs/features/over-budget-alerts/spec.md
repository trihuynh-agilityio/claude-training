# Spec: Over-budget alerts
From: intent.md (Tri Viet Huynh, Personal project). Status: approved.
Skills applied: project-context, write-spec.

## Requirements

Dashboard strip

- R1. The Dashboard shows a budget alert strip for the month being viewed when at least one item is over budget or near its limit. Otherwise nothing is rendered in its place.
- R2. An item is the monthly budget (spent = the month's total spending) or one category that has its own budget (spent = that category's total, 0 if it has no expenses). A category with no budget is never an item. A month with no budget in force, or with no expenses, has no items, so the strip is absent there and the existing "set a budget" invite stays as it is.
- R3. An item is "over budget" when spent is above its budget, and "near limit" when it is at or above 85% of the budget and not above it. These are the existing status rules (`budgetStatus`), unchanged.
- R4. The strip is one summary line. It lists the over-budget items, then the near-limit items, each list led by its status label, and names the items: the monthly budget as "Monthly budget" and a category by its name. A list with no items is left out. Example: "Over budget: Food, Monthly budget. Near limit: Bills."
- R5. Inside each list, items are ordered by percent used, highest first.
- R6. The strip has a "View budget" link that opens the Budget screen.
- R7. The strip has no close button. It follows the data: it updates when the month switcher changes, when the Dashboard refetches after an expense or budget change, and disappears when no item is over or near.

Save toast

- R8. After an expense is added or edited successfully, the toast keeps its current text ("Expense added" or "Changes saved") and, when the save moved items into over budget, adds the names of those items: "Expense added. Over budget: Food, Monthly budget."
- R9. An item "moved into over budget" when it was not over budget in the expense's month before the save and is over budget in that month after it. The month is the month of the date the user saved (the new date on an edit). The budget used is the one in force for that month.
- R10. Items already over budget before the save, items that are only near their limit, and any save that moves nothing into over budget add nothing to the toast.
- R11. Deleting an expense, and the expenses added by recurring catch-up when the app opens, never add an over-budget message.
- R12. The save never waits on the check for more than 2 seconds per lookup. If either summary lookup fails or takes longer than that, the save still succeeds and the toast shows its current text only. A failed or slow check is never shown as an error.
- R13. The toast appears once, after the check has finished or been given up on. It is never shown and then changed.

Boundaries

- R14. No change to the API, to stored expenses or budgets, or to any other screen. The Budget screen, its badges and its sorting stay as they are.

## Design

Frontend only, in the existing layout (`src/lib`, `src/components`, `App.tsx`).

- New pure helper in `src/lib/budgets.ts`, with Vitest tests:
  - `budgetAlerts(summary)` builds the items of R2 from a summary (`total`, `categories`, `budget.monthly`, `budget.categories`) and returns the over-budget and near-limit lists of R3 and R5. It returns nothing when `budget` is null. Category names come from the existing `src/lib/categories.ts`.
  - `newlyOver(before, after)` returns the names of items over budget in `after` but not in `before` (R9, R10).
  - `alertText(over, near)` builds the strip text of R4; the toast text of R8 reuses the over-budget part.
- New component `BudgetAlertStrip` in `src/components`, rendered by `DashboardPage` inside `.dashboard` between the KPI cards and "Spending by category". It takes the already-fetched summary and the existing `onOpenBudget` callback, so the Dashboard makes no extra request and refetches through its existing `version` key (R7).
- Styling: the strip reuses the `.alert` pattern and `AlertIcon` from `index.css`, with the 12px alert radius (`--radius-tile`) that `design/DESIGN.md` asks for. With any over-budget item it uses the danger colors (`--danger-soft`, `--danger-text`); with only near-limit items it uses the near-limit badge colors (#8f4a00 on #fdf0dc), which are hard-coded today because no token exists. The strip is a plain block with no live-region role, so it is not announced on every refetch. The link is a button-styled link, not a route.
- Toast check in the save flow of `App.tsx`: the summary of the saved date's month is read once before the expense is written and once after, both through the existing `getSummary` client, which already carries the budget in force. `newlyOver` compares the two. Each read is limited to 2 seconds; a read that fails or times out ends the check without affecting the save (R12). The single toast is shown after the check ends (R13), so the existing text and the over-budget names arrive together. Editing needs no special case: the two summaries already contain the old and the new version of the expense.
- Not touched: the recurring catch-up call on mount, the delete flow, the backend, `Toast` itself (it already shows a single string for 3.5 seconds).

## How each constraint in the intent is met

| Constraint | Met by |
|---|---|
| Frontend only: no new data, no change to stored budgets or expenses. | R14; Design uses only the existing `getSummary` call and adds no endpoint or stored field. |
| Over budget, near limit and their thresholds follow the existing budget status rules and the design spec. | R3 reuses `budgetStatus` unchanged. See concern 2 for monthly-budget items, which the design spec words only for categories. |
| Only the two surfaces named in the design spec are in scope; no email, push or other notifications. | R1 to R7 (Dashboard strip) and R8 to R13 (save toast) are the only surfaces; Design lists what is not touched. |
| Toast wording and strip layout follow the design spec's existing toast and alert styles. | Design: the strip reuses the `.alert` pattern and the toast stays the existing `Toast`. See concern 1 for the exact wording. |

## Open questions from the intent

- What exact wording should the strip and the over-budget toast use? Answered by proposal: R4 and R8 give the wording and examples. Not yet confirmed by the product owner. Carried forward as concern 1.
- If a save pushes both the monthly budget and a category over at once, should the toast name both or just one? Answered: it names all items that moved into over budget (R8, R9), for example "Over budget: Food, Monthly budget."

## Areas of concern

1. Wording is a proposal. The strip text (R4) and the toast text (R8) are my wording, not in the design spec. The intent's example for the strip was counts ("2 over budget, 1 near limit"); the spec names the items instead, so the line can be long (up to all 8 categories plus the monthly budget). It wraps onto more lines on narrow screens and is never cut off. Owner: product owner, at spec approval.
2. Monthly budget as an alert item. `design/DESIGN.md` describes the strip and the toast only for categories, while the intent includes the monthly budget. The spec follows the intent. Owner: product owner, to confirm; then `design/DESIGN.md` should be updated to say so.
3. "View budget" opens the current month. The Budget screen always starts on the current month, so from a past month's strip the link lands on a different month than the one that raised the alert. Passing the month would change the Budget screen's API, which R14 leaves out. Proposed: accept it for now. Owner: product owner.
4. Two extra summary requests per save. The toast check costs one lookup before and one after each add or edit, so a save can take up to 4 seconds longer in the worst case (R12) and can race with a change made elsewhere. One known case: if the user saves while the catch-up at app open is still adding recurring expenses, one of them can land between the two lookups and the save gets the blame, against R11. Accepted for a single-user app; the alternatives (a server-side check, or waiting for the catch-up to finish) are out of scope for this change. Owner: product owner.
