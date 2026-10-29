# Spec: Duplicate expense
From: intent.md (Tri Viet Huynh, Personal project). Status: approved.
Skills applied: project-context.

## Requirements

R1. Every expense row in the Transactions list and in the Dashboard's Recent transactions list has a Duplicate icon button.
R2. The row's action buttons are in this order: Edit, Duplicate, Delete.
R3. The Duplicate button's accessible name is "Duplicate " followed by the same expense name the Edit and Delete buttons use (the note, or "expense of <amount>" when there is no note).
R4. The Duplicate button is visible at every width, including mobile (under 768px), where it sits next to Edit while Delete stays hidden as it is today.
R5. Activating Duplicate opens the expense form in add mode: title "Add expense", primary button "Add expense", and no Delete button.
R6. The form opens with Amount, Category and Note set to the original expense's values. An original without a note opens with an empty Note.
R7. The form opens with Date set to today's local date, whatever the original's date is.
R8. Every prefilled field can be changed, and the form validates exactly as Add expense does (same rules, messages, summary and focus behaviour as `design/DESIGN.md`, Add / Edit expense).
R9. Saving creates one new expense with the form's values. The original expense keeps its id and all its values.
R10. After saving, the form closes and the toast reads "Expense added", with the existing over-budget warning appended under the existing rules (judged on the month of the new expense's date).
R11. Closing the form without saving (Cancel, the close button or Esc) creates no expense and shows no toast.
R12. The new expense is not linked to any recurring rule and shows no Recurring badge, even when the original was added by a rule.
R13. When the form closes, focus returns to the Duplicate button that opened it, if that button is still on screen (see concern 4).
R14. Duplicating one row, closing the form, then duplicating another row opens the form with the second row's values, not the first's.

## Design

- **New pure helper** in `src/lib/` (with a Vitest test): given an expense, it returns the form's prefill (amount, category, note). It never returns a date or a recurring link, which covers R6, R7 and R12 in one testable place.
- **New `CopyIcon`** in `components/icons.tsx` (two overlapping rounded squares), in the same stroke style and default size as `PencilIcon`.
- **`ExpenseRow`**: a new required `onDuplicate(expense)` prop and an `icon-btn` (not `danger`) between Edit and Delete, labelled as in R3. Because it is not `.danger`, the existing mobile rule that hides Delete leaves it visible (R4). No CSS change is expected; on mobile the row has two icon buttons, and the note's ellipsis absorbs the space.
- **`DashboardPage` and `TransactionsPage`**: pass `onDuplicate` through to `ExpenseRow`, the same way `onEdit` and `onDelete` flow today.
- **`App.tsx`**: the form state's add variant gains an optional prefill (`{ mode: 'add', prefill? }`). `onDuplicate` opens it with the helper's output. Saving still goes down the existing create branch, because the mode is `add` (R9), so the existing toast and over-budget check apply unchanged (R10). The dialog's `key` is `dup-<id>` for a duplicate, so each duplicate remounts the form with fresh values (R14).
- **`ExpenseFormDialog`**: a new optional `prefill` prop seeds the initial amount, category and note when `expense` is absent. `isEdit` still depends only on `expense`, so the title, button and missing Delete stay those of add mode (R5). The date keeps its existing today default (R7).
- **Reused as is**: `createExpense`, the validation in `src/lib/validation.ts`, the form's existing server error (a failed save keeps the form open with "Couldn’t save this expense. Check your connection and try again." and shows no toast), the toast and the over-budget logic, and `useModalDialog`, which already returns focus to the opener (R13).
- No backend change and no stored data change.

## How each constraint in the intent is met

| Constraint | Met by |
|---|---|
| Frontend only: no change to stored data or to the server. | Design: only `src/` changes; the save uses the existing create request (R9). |
| The prefilled form follows the existing Add form rules and validation messages in the design spec. | R8; the form and `validation.ts` are reused unchanged. |
| No new dialog: the Add expense form is reused with its current wording. | R5; Design: `ExpenseFormDialog` gains only a `prefill` prop. |

## Open questions from the intent

- Which icon should the Duplicate action use? Not answered. Carried forward as concern 2.
- Should the design spec gain a short entry describing the Duplicate action? Not answered. Carried forward as concern 1.

## Areas of concern

1. `design/DESIGN.md` describes the row as "Desktop adds edit and delete icon buttons. On mobile the whole row is a link to Edit", and Key flows lists no Duplicate. R1 to R4 add a third action that shows on mobile too, so the built UI will differ from the design text (the current app already shows an Edit icon on mobile instead of a row link). Proposal: as part of this feature, update the `TransactionRow` entry and add a "Duplicate" key flow in `design/DESIGN.md` to match R1 to R7. Owner: product owner.
2. Neither `design/DESIGN.md` nor the design canvas has a copy icon, so the Duplicate icon is a design gap. The spec proposes a new copy icon (two overlapping rounded squares) in the stroke style and default size of the existing icons. Owner: product owner.
3. With two icon buttons on a mobile row, a long note is cut shorter than today. This is not checked yet; the UI check for the row task should include a mobile-width screenshot. Owner: implementer.
4. The Dashboard shows only the latest 6 expenses. A duplicate dated today will usually appear at the top of that list and may push the oldest one out. This is expected behaviour, not a defect. In that case the original row, and the Duplicate button that opened the form, leave the list, so R13 cannot apply and focus falls back to the page, as it already does when an Edit moves a row out of that list. The spec accepts this. Owner: product owner (acknowledge only).
