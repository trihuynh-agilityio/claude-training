# Spec: Recurring expenses
From: intent.md (Tri Viet Huynh, Personal project). Status: approved.
Skills applied: none.

## Requirements

- R1. A recurring rule has an amount, a category, an optional note, a day of the month (1 to 31), a start date, an optional end date and a paused flag. Amount, category and note follow the validation of an ordinary expense (whole VND, one of the 8 categories, note length). The end date, when set, is not before the start date.
- R2. A rule produces at most one expense per calendar month, dated on the rule's day of that month. When the month has fewer days, the expense is dated on the month's last day (day 31 gives 28 or 29 February and 30 April). The stored day stays as entered.
- R3. The first occurrence is the first date on or after the start date that falls on the rule's day. No occurrence is after the end date.
- R4. Adding is idempotent and runs when the app is opened: every occurrence of every active rule that is due on or before today and not yet handled becomes an ordinary expense with the rule's amount, category and note, dated on the occurrence date. Running it again the same day adds nothing. It never adds an expense dated after today.
- R5. The rule remembers the date of the last occurrence it handled. Occurrences up to that date are never added again, so an expense the user deletes from Transactions is not recreated.
- R6. The start date may be in the past, but not more than 24 months before today, so one catch-up adds at most 24 expenses per rule. Past occurrences between the start date and today are added by R4.
- R7. Each expense added by a rule is linked to it. Transactions shows a small "Recurring" badge on those rows. The linked expense can be edited and deleted like any other.
- R8. Editing a rule changes only future occurrences. Expenses already added are not touched. The start date can be changed only while the rule has not added anything yet.
- R9. Deleting a rule keeps the expenses it added; they become ordinary expenses and lose the badge. Deleting asks for confirmation through the existing confirm dialog.
- R10. A paused rule adds nothing. When it is resumed, occurrences that fell due while it was paused are skipped, and adding continues from the next occurrence after today.
- R11. The Recurring screen lists the rules, each with amount, category, note, "Day N of every month", the next due date (or "Paused" / "Ended"), and actions to edit, pause or resume, and delete. It has an "Add recurring expense" primary button and an empty state. Validation messages match the expense form.
- R12. Opening the app adds due expenses before the Transactions list and the Dashboard are loaded, so they already include them. After adding, the total of the new expenses is reflected in the Dashboard and budget status with no extra step. If the catch-up fails, the screens still load and show an error toast.
- R13. Exports and summaries are unchanged: CSV export, filtering, the Dashboard and budgets treat added expenses as ordinary ones.

## Design

Backend (`backend/app/`):
- `db.py`: new table `recurring_rules` (id, amount, category_id, note, day, start_date, end_date nullable, paused 0/1, last_generated nullable, created_at). `expenses` gets a nullable `recurring_id` column, added in `init_db()` the same way `category_id` was for older databases. No foreign key action beyond setting it to NULL when a rule is deleted, done in code.
- `schemas.py`: `RecurringIn` (reuses the amount, category and note rules of `ExpenseIn`, plus day, start date, end date, and the date rules of R1 and R6) and `Recurring` (adds id, paused, `last_generated`, computed `next_due`). `Expense` gets an optional `recurring_id`. `RecurringIn` must stay in sync with `validateRecurring` in `frontend/src/lib/validation.ts` and the copy in `design/DESIGN.md`.
- `recurring.py` (new): routes under `/api/recurring`: `GET` list, `POST` create, `PUT /{id}` replace, `PATCH /{id}` pause or resume, `DELETE /{id}`, and `POST /generate?today=YYYY-MM-DD`, which runs R4 and returns the number added. `today` defaults to the server's date, as `GET /api/summary` does, so tests pass it explicitly. The occurrence maths (R2, R3, R6) lives in one pure function that is tested on its own.
- `expenses.py`: select and return `recurring_id`. Nothing else changes.
- Generation is a separate explicit endpoint, not a side effect of `GET`, so reads stay free of writes and the rest of the tests need no clock.

Frontend (`frontend/src/`):
- `api/`: typed client for the recurring routes and `generate`.
- `lib/recurring.ts` (new, with tests): next-due date, "Day N" label, clamp for short months, mirroring the backend so the screen can show the next due date without a request. `lib/validation.ts` gets `validateRecurring`.
- `components/RecurringPage.tsx`, `RecurringFormDialog.tsx` (new, native `<dialog>` through `useModalDialog`), rows with pause and delete; delete uses `ConfirmDeleteDialog`.
- `components/ExpenseRow.tsx`: "Recurring" badge when `recurring_id` is set.
- `App.tsx`: a fourth `view` value; on mount, call `generate` with the browser's date, then load expenses and bump `version` so the Dashboard refetches. A failure shows a toast and continues.
- `types.ts`, `index.css`, `components/AppShell.tsx` (nav entry), `components/icons.tsx` (a repeat icon).

Docs, updated in the same change: `design/DESIGN.md` (the Recurring screen, form, badge, copy and phase 7 row), `README.md` (phase list) and `CLAUDE.md` (project overview, backend routes, frontend layout).

## How each constraint in the intent is met

| Constraint | Met by |
| :---- | :---- |
| Monthly only, day 1 to 31, short months use the last day. | R1, R2. |
| Amount, category and note follow ordinary expense rules. | R1, shared validation. |
| Expenses added only up to today. | R4. |
| No background scheduler. | R4, R12: adding runs when the app is opened. |
| Out of scope: other frequencies, bulk edit of past expenses, reminders, separate name, import, CSV column. | Not in any requirement; R8 and R13 state that past expenses and exports are untouched. |
| Phase 7, after the six existing phases. | Docs update adds the phase 7 row; built on top of the finished screens. |

## Open questions from the intent

- Missed months while paused? Answered by default: skipped (R10).
- Limit on months added at once? Answered by default: 24 months, enforced by the start-date rule (R6).
- Badge in CSV or Dashboard? Answered: no (R13); the badge is only in Transactions.

## Areas of concern

1. Skipping months missed while paused (R10) can leave a gap the user did not expect, and the other option (adding them on resume) can create many surprise expenses. The spec picks skip. Owner: the product owner confirms.
2. Adding happens when the app is opened in a browser, using the browser's date. If the browser clock is wrong the dates are wrong, and two open tabs may call `generate` at once. R5 and the stored `last_generated` make a second run add nothing, but the two calls must be run inside one transaction per rule so a race cannot add an occurrence twice. Owner: the author, covered by a backend test.
3. A past start date can add up to 24 expenses in months that already have a closed budget and a Dashboard history. The totals of those months change without a visible event. Owner: the product owner decides whether the form should warn ("This adds N expenses") before saving.
4. Locking the start date after the first expense (R8) means a wrong start date can only be fixed by deleting and recreating the rule, which keeps the already added expenses. Owner: none needed now, noted for the PR.
5. `design/DESIGN.md` and the design canvas (https://claude.ai/artifact/SdumiU3oAt8stbaR3ASLEa) show no Recurring screen, badge or fourth navigation item, and `CLAUDE.md` says to ask before picking when they disagree. The spec adds the copy to `DESIGN.md` only. Owner: the product owner decides the navigation placement on mobile, where three tabs already fill the bar.
6. The sort order of Transactions, `date DESC, id DESC`, puts backfilled rows by their occurrence date among older entries, not at the top. This is expected, but it can look as if rows appeared in the past. Owner: none needed.
