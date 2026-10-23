# Intent: Recurring expenses
Author: Tri Viet Huynh (Personal project). Status: accepted.

## Problem

Many expenses repeat every month: rent, internet, a streaming subscription, a gym fee. Today the user has to add each one by hand every month, and forgetting one makes the Dashboard totals and the budget status wrong without any sign that something is missing.

## Proposed outcome

The user can set up a recurring expense once: amount, category, note, the day of the month it falls on, a start date and, if it is known, an end date. From then on the tracker adds that expense to Transactions on its own each month, so Transactions, the Dashboard, budgets and CSV export all include it like any other expense.

If the app was not opened for a while, the missed months are added the next time it is opened, up to today and never beyond. A start date in the past adds the months since then. An expense the user deletes from Transactions stays deleted and is not added again.

A new "Recurring" screen lists the rules, shows when each is next due, and lets the user add, edit, pause, resume and delete them. Expenses added by a rule carry a small "Recurring" badge in Transactions. Changing or deleting a rule only affects future months: expenses already added are kept as ordinary expenses.

## Affected users and systems

- The person using the tracker: a new Recurring screen, a badge in Transactions, and expenses that appear without being typed.
- The backend: a new place to store the rules, a link from an expense to the rule that made it, and the catch-up that adds due expenses.
- The Dashboard, budgets and CSV export, which read expenses and need no change of their own.
- The design spec and project docs, which describe screens and phases.

## Constraints

- Monthly only. A day of the month from 1 to 31; in a shorter month it falls on the month's last day.
- Amount, category and note follow the same rules as an ordinary expense.
- Expenses are added only up to today, never for future dates.
- There is no background scheduler. Adding happens when the app is used.
- Out of scope: other frequencies (weekly, yearly), editing the past expenses of a rule in bulk, reminders or notifications, a name field separate from the note, import of rules, and a new column in the CSV export.
- This is phase 7 of the tracker, built after the six existing phases.

## Open questions

- If a rule is paused for some months and then resumed, should the months missed while paused be added?
- Should the number of months added at once for an old start date be limited, and to what?
- Should the badge also show in the CSV export or on the Dashboard category breakdown?
