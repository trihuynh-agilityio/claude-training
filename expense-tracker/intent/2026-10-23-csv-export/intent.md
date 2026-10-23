# Intent: CSV export
Author: Tri Viet Huynh (Personal project). Status: approved.

## Problem

The tracker keeps all expenses inside the app. A user who wants to look at their spending in a spreadsheet, keep a copy, or share it with someone has no way to get the data out. Today they would have to retype the list by hand, which is slow and error-prone.

## Proposed outcome

On the Transactions screen the user can download the expenses they are currently looking at as a CSV file. What they see after searching and choosing a date range is exactly what ends up in the file, newest first, with columns for date, category, amount in VND and note.

The file opens correctly in a spreadsheet, including Vietnamese notes with diacritics, and amounts can be summed. A note that begins with a formula character is stored as plain text and never runs as a formula. The file is named after the date range it covers. When nothing matches the filters the export action is unavailable. After a successful export the user sees a confirmation saying how many expenses were exported.

## Affected users and systems

- The person using the tracker, on the Transactions screen.
- The Transactions screen itself (a new export action and its confirmation message).
- The design spec and project docs, which describe screens and phases.
- The API and the stored data are not touched.

## Constraints

- The export covers only the filtered Transactions list, not all expenses and not Dashboard or Budget data.
- Out of scope: importing CSV, other formats such as Excel or JSON, choosing columns, scheduled or emailed exports.
- The file leaves out internal details (record id, creation time).
- This is phase 6 of the tracker, built after the five existing phases.

## Open questions

- What exact wording and placement should the export button and the confirmation message have in the design spec?
- If the date range is open-ended (a custom range with only one side set), is the fallback file name the export date acceptable?
- Is a very large export a concern, or is the current list size small enough to ignore?
