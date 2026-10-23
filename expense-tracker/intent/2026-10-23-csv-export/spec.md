# Spec: CSV export
From: intent.md (Tri Viet Huynh, Personal project). Status: ready for product owner review.
Skills applied: none.

## Requirements

- R1. The Transactions screen has an "Export CSV" button. It downloads the expenses in the current filtered list: the same search and date range the user sees, nothing more and nothing less.
- R2. Rows are in the order of the list, newest first (date descending, then newest entry first on the same day).
- R3. The first row is the header `Date,Category,Amount (VND),Note`. Each later row has the date as `YYYY-MM-DD`, the category's display name (for example `Food & Dining`), the amount as a plain whole number of đồng with no separators or currency symbol, and the note. An expense with no note has an empty note cell.
- R4. The file leaves out the record id and the creation time.
- R5. The file is UTF-8 and starts with a byte order mark, so Vietnamese notes show correctly when opened in a spreadsheet. Fields are separated by commas, rows end with CRLF, and any field containing a comma, a double quote or a line break is wrapped in double quotes with inner quotes doubled.
- R6. A note that starts with `=`, `+`, `-` or `@` is written with a single quote `'` placed in front of it, so a spreadsheet shows it as text and never runs it as a formula.
- R7. The file name is `expenses_<from>_<to>.csv`, using the first and last date of the active date range (for example `expenses_2026-10-01_2026-10-23.csv`). When a custom range has only one side set, or none, the name is `expenses_<today>.csv`.
- R8. The button is disabled while the filtered list is empty, and while the list is loading or failed to load.
- R9. After a successful export, a toast reads `Exported N expenses`, or `Exported 1 expense` when N is 1.
- R10. Exporting does not change the filters, the list, or any stored data.

## Design

- Frontend only. The API and the stored data are not touched, because the Transactions screen already holds every expense in memory and filters it in the browser.
- New pure helper in `src/lib` (`csv.ts`, with `csv.test.ts`): turns a list of expenses into the CSV text (R2 to R6) and builds the file name from the active range (R7). It reuses the category labels from `lib/categories.ts` and the range bounds from `lib/filters.ts`.
- `TransactionsPage` passes the already filtered list (`visible`) to the helper, so the file always matches the screen. It gets one new button in the page header next to "Add expense", and the page asks its parent to show the toast.
- The button is a secondary button, because the design spec allows one primary action per view and that stays "Add expense". It is disabled as in R8.
- The download is a Blob with the CSV text, saved through a temporary link click, then released. No library is added.
- Toast: the existing `Toast` component and the app's toast state in `App.tsx`, with the message from R9.
- Docs, updated in the same change: `design/DESIGN.md` (the button on the Transactions screen, the toast copy, and a phase 6 row in the roadmap table), the phase list in `README.md`, and the project overview in `CLAUDE.md`.
- New: the helper, its tests, the button. Reused: filtering, VND-free amounts from the stored integer, categories, the Toast, button styles.

## How each constraint in the intent is met

| Constraint | Met by |
| :---- | :---- |
| The export covers only the filtered Transactions list, not all expenses and not Dashboard or Budget data. | R1 and R10. The button lives only on the Transactions screen and reads the filtered list. |
| Out of scope: importing CSV, other formats such as Excel or JSON, choosing columns, scheduled or emailed exports. | None of the requirements or the design includes them. The column set is fixed in R3. |
| The file leaves out internal details (record id, creation time). | R4. |
| This is phase 6 of the tracker, built after the five existing phases. | Design: the docs update adds phase 6 to the roadmap, and the helper and button sit on top of the finished Transactions screen. |

## Open questions from the intent

- What exact wording and placement should the export button and the confirmation message have in the design spec? Answered by the defaults you accepted: a secondary "Export CSV" button in the Transactions header beside "Add expense", and the toast in R9. The design spec gets these words in the same change (see concern 1).
- If the date range is open-ended, is the fallback file name the export date acceptable? Answered: yes, R7.
- Is a very large export a concern? Answered: no. The list is already fully loaded in the browser, so the export adds no extra request, and the CSV is built from that same list.

## Areas of concern

1. `design/DESIGN.md` has nothing yet about export, and `CLAUDE.md` says to ask before picking between the design spec and the canvas when they disagree. The canvas (https://claude.ai/artifact/SdumiU3oAt8stbaR3ASLEa) has no export button either. The spec adds the button and toast copy to `DESIGN.md` only, and the canvas stays as it is. On mobile, where the header is tight, the button may need to wrap under the title or become an icon button with an `aria-label`. Owner: the product owner decides the mobile placement.
2. Prefixing `'` changes the stored text of notes that start with `=`, `+`, `-` or `@`, so a note such as `-50k refund` is exported as `'-50k refund`. The intent asks for this protection, so the spec follows it. Spreadsheets may also treat a leading tab or carriage return as a formula start, which R6 does not cover. Owner: the product owner decides whether to extend R6 to those two characters.
3. `design/DESIGN.md` lists category chips on the Transactions screen, but the filters today are search and date range only. The export follows whatever filters the screen has, so if category chips are added later, the export follows them without a change. Owner: none needed now, noted so a reader does not expect a separate category filter in the export.
4. The browser download step (the Blob and temporary link) cannot be fully exercised by the jsdom component tests, which lack a real download. The CSV content and file name are tested in the helper tests, and the download itself needs a manual check in the browser. Owner: the author checks it before merging into `dev`.
