# Intent: Duplicate expense
Author: Tri Viet Huynh (Personal project). Status: approved.

## Problem

Many expenses repeat irregularly with the same amount, category and note (a coffee, a ride, a lunch), but not on a fixed monthly schedule, so recurring rules do not fit them. Today the user has to open the Add form and type every field again each time, even though an identical expense is already in the list.

## Proposed outcome

- Every expense row, on Transactions and in the Dashboard's list, has a Duplicate action between Edit and Delete, shown on desktop and on mobile. Its accessible name follows the same pattern as Edit and Delete ("Duplicate" plus the expense's name).
- Duplicate opens the usual Add expense form, with the same title and save button, prefilled with the original's amount, category and note. The date is set to today. The user can change any field before saving.
- Saving creates a new, ordinary expense and shows the same toast as adding one, including the existing over-budget warning. The original expense is unchanged. Closing the form without saving creates nothing.
- Duplicating an expense that a recurring rule added gives a plain expense, not linked to any rule and without the Recurring badge.

## Affected users and systems

- The person recording their expenses, on the Transactions screen and on the Dashboard.
- The expense row and the Add expense form.
- Existing expense data and validation are reused as they are.

## Constraints

- Frontend only: no change to stored data or to the server.
- The prefilled form follows the existing Add form rules and validation messages in the design spec.
- No new dialog: the Add expense form is reused with its current wording.

## Open questions

- Which icon should the Duplicate action use? The design spec has no copy icon yet.
- Should the design spec gain a short entry describing the Duplicate action?
