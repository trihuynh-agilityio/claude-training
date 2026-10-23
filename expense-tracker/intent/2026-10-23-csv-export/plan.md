# Plan: CSV export (from intent.md and spec.md)

## Files that change

Backend: none. The API and the stored data are not touched.

Frontend (`expense-tracker/frontend/src/`):
- `lib/csv.ts` (new): turns a list of expenses into the CSV text (R2 to R6) and builds the file name from the active filters (R7). Reuses `getCategory` from `lib/categories.ts` and `rangeBounds` and `Filters` from `lib/filters.ts`.
- `lib/csv.test.ts` (new): header, row order, quoting, BOM, formula prefix, file name cases.
- `lib/download.ts` (new, small): saves text as a file through a Blob and a temporary link, then releases the URL. Kept apart so the page test can mock it.
- `components/TransactionsPage.tsx`: "Export CSV" secondary button in the header next to "Add expense", disabled per R8, builds the file from `visible` and `filters` (R1, R9, R10). New prop `onExported(message)`.
- `components/TransactionsPage.test.tsx` (new): button state and what gets exported; component test pattern from `DashboardPage.test.tsx`.
- `components/icons.tsx`: a download icon for the button, if none fits.
- `App.tsx`: pass `onExported={setToast}` to `TransactionsPage`, so the existing `Toast` shows the message (R9).
- `index.css`: only if the header needs a rule so the two buttons sit and wrap well on narrow screens (spec concern 1). The existing `.btn-secondary` is reused.

Docs:
- `design/DESIGN.md`: Export CSV button and toast copy on the Transactions screen, and a phase 6 row in the roadmap table.
- `README.md`: add phase 6 to the phase list.
- `CLAUDE.md`: phase 6 done in the project overview, and `lib/csv.ts` in the frontend layout notes.
- `intent/2026-10-23-csv-export/proof/` (new): browser captures from the UI test.

## Order of work

1. Docs branch `day13/csv-export-docs`, cut from `dev`, holds only documents: this intent, spec and plan, and the `design/DESIGN.md` update with the button and toast copy, so the UI is built to a written spec (R1, R9). No code lands on it. The code goes on a separate `day13/csv-export-ui` branch cut from `dev` after the docs branch has merged (as with `day12/budgets-docs` and `day12/budgets-ui`).
2. `lib/csv.ts` with `lib/csv.test.ts`, tests first: header and columns, order, quoting, BOM, formula prefix, file name (R2, R3, R4, R5, R6, R7).
3. `lib/download.ts` (R1).
4. `TransactionsPage.tsx`: button, disabled states, export on click, `onExported` callback, with `TransactionsPage.test.tsx` (R1, R8, R9, R10).
5. `App.tsx` wiring so the toast shows; styling check at phone width (R9).
6. Update `README.md` and `CLAUDE.md`.
7. Run `npm test`, `npm run lint`, `npm run build`, then the browser test below and the manual download check.

Each step lands green before the next. Step 1 lands on the docs branch; steps 2 to 7 land on the UI branch (the `README.md` and `CLAUDE.md` updates in step 6 may go on whichever branch is open). Both merge into `dev` only with the usual merge commit, never into `main`.

## Risks

- Spec concern 1: neither `design/DESIGN.md` nor the design canvas shows an export button, and `CLAUDE.md` says to ask when they disagree. Step 1 writes the copy into `DESIGN.md` only. The mobile placement (wrap under the title or icon button) must be decided by the product owner before step 5.
- Spec concern 2: the `'` prefix changes notes that start with `=`, `+`, `-` or `@`, and a leading tab or carriage return is not covered. Build R6 as written; the test for the tab and carriage return characters waits for the product owner's answer.
- Spec concern 3: category chips are in `DESIGN.md` but not in the code, so the export follows search and date range only. No work, noted for the PR.
- Spec concern 4: jsdom has no real download. `lib/download.ts` is mocked in the page test, the CSV text is tested in `csv.test.ts`, and the real download is checked by hand in the browser.
- The file name needs the active range's bounds, and `rangeBounds` returns null for Custom. The helper must read `from` and `to` from the filters for Custom and fall back to `expenses_<today>.csv` when either is empty (R7). `today` is passed in, so tests do not depend on the clock.
- `Expense.note` can be null in the type (`string | null`), so the helper must write an empty cell, not the text "null" (R3).
- Amounts come from the stored integer, so R3's plain whole number needs no formatting. `formatVND` is deliberately not used.
- The page filters in the browser, so it is the only source for "what is on screen"; the helper must receive `visible`, not the full list, or R1 breaks.

## Proof

Frontend (`npm test`, `npm run lint`, `npm run build`):
- `lib/csv.test.ts`:
  - Header row is exactly `Date,Category,Amount (VND),Note` and no id or created-at column (R3, R4).
  - Rows keep the order they are given (the page passes newest first); a same-day pair keeps its order (R2).
  - Category shows the display name, `Food & Dining`, and the `&` is not escaped (R3).
  - Amount is `1250000`, with no dot, space or `₫`; amounts of 1 and 1.000.000.000 are written whole (R3).
  - `null` note and empty note give an empty cell (R3).
  - Output starts with the BOM `﻿`, rows end with CRLF, Vietnamese text such as `Phở bò — Bách Hóa Xanh` is unchanged (R5).
  - A note with a comma, a double quote, and a line break is wrapped in quotes with inner quotes doubled (R5).
  - Notes starting with `=`, `+`, `-` and `@` each get a leading `'`; a note with those characters in the middle, or starting with a letter or digit, does not (R6).
  - File name: `this-month` on `2026-10-23` gives `expenses_2026-10-01_2026-10-23.csv`; `last-7-days` gives `expenses_2026-10-17_2026-10-23.csv`; `last-month` gives `expenses_2026-09-01_2026-09-30.csv`; custom with both dates uses them; custom with only From, only To or neither gives `expenses_2026-10-23.csv` (R7). `today` is passed in.
- `TransactionsPage.test.tsx`, `lib/download.ts` mocked:
  - Button is enabled with matching rows and disabled with an empty list, with no match, while loading and on error (R8).
  - Clicking after a search exports only the matching rows, not the full list (R1).
  - `onExported` is called with `Exported 3 expenses`, and with `Exported 1 expense` for one row (R9).
  - Filters and the rendered list are the same before and after the click, and the API module is never called by the click (R10).

Manual and UI:

UI test in Chrome, with captures (Claude in Chrome, run after step 5 against `npm run dev` on :5173 and `uv run fastapi dev app/main.py` on :8000, on a throwaway `EXPENSE_DB_PATH` seeded with the sample data from `design/DESIGN.md` section 9 so `today` is 16 Oct):
- Each step below is checked in the page and captured as a screenshot, saved to `intent/2026-10-23-csv-export/proof/NN-name.png`.
- The downloaded file is opened to check content (BOM, columns, Vietnamese text, formula prefix) and its name; its path and a few lines are noted in the PR.
- Each capture is compared with `design/DESIGN.md` (button style, toast, tokens), noted next to the file name in the PR. A mismatch stops the run for a decision.

| # | Step | Expect | Req | Capture |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Open Transactions on a fresh database | "Export CSV" is visible and disabled, empty state shown | R8 | `01-empty-disabled.png` |
| 2 | Load the sample data, open Transactions | Button enabled beside "Add expense", Add is still the only primary button | R1 | `02-button-enabled.png` |
| 3 | Click Export CSV on This month | File `expenses_2026-10-01_2026-10-16.csv` downloads, toast "Exported N expenses" | R1, R7, R9 | `03-exported-toast.png` |
| 4 | Open the file | BOM, header row, newest first, plain integer amounts, `Phở bò — breakfast` intact | R2, R3, R4, R5 | `04-file-contents.png` |
| 5 | Search for "grab" and export | File holds only the matching rows | R1 | `05-filtered-export.png` |
| 6 | Add an expense with note `=SUM(1,2)` and export | Note is `'=SUM(1,2)` in the file and shows as text in a spreadsheet | R6 | `06-formula-note.png` |
| 7 | Choose Custom with only From set and export | File is named `expenses_<today>.csv` | R7 | `07-custom-open-range.png` |
| 8 | Search for text that matches nothing | Button disabled, "no match" state shown | R8 | `08-no-match-disabled.png` |
| 9 | Export one expense | Toast reads "Exported 1 expense" | R9 | `09-toast-singular.png` |
| 10 | Check the list and filters after exporting | Unchanged, no request sent by the click | R10 | note in the PR |
| 11 | Resize to phone width (375px) | Both buttons fit, no horizontal scroll, layout follows the decided placement | design | `10-transactions-mobile.png` |
| 12 | Read the browser console and network tab | No errors; no new API request on export | R10 | note in the PR |

If the run finds a mismatch with `DESIGN.md`, stop and ask before changing either one (spec concern 1).
