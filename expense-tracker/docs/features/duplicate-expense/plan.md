# Plan: Duplicate expense
Status: approved.
From: [intent.md](intent.md) and [spec.md](spec.md).

## Issues with the spec

1. **Mobile row in `design/DESIGN.md`.** The spec's concern 1 (approved) says this feature updates the `TransactionRow` entry and adds a Duplicate key flow. The spec's Design section lists only `src/` files, and its constraint table says "only `src/` changes". The plan adds the `design/DESIGN.md` update as part of T4, since the approval of concern 1 covers it, and it changes no code. Owner: product owner (Tri Viet Huynh).
2. **R4 cannot be checked in jsdom.** Visibility at 768px depends on the CSS in `src/index.css`, which jsdom does not apply. R4 is proved by the T5 UI check at 375px wide, not by an acceptance test. Owner: none (recorded only).

## Wave 0

## T1: Acceptance tests for the Duplicate action  [ ]

- **Lane**: A
- **Goal**: Write the acceptance tests for R1, R2, R3, R13 and R14 at the `App` level, with `./api/*` mocked as in `App.test.tsx`. They fail until T3 and T5 are merged.
- **Files**: `frontend/src/App.duplicate.test.tsx` (new)
- **Size**: ~170 lines, 1 file
- **Covers**: R1, R2, R3, R13, R14
- **Depends on**: none
- **Tests**: jsdom file in the style of `App.test.tsx` (own local expense and summary builders). `getSummary` resolves with a month summary with `budget: null`, so the Dashboard renders its Recent transactions list. Key cases:
  - R1: with three expenses, every row in the Dashboard's Recent transactions list has a Duplicate button; after switching to Transactions, every row there has one too.
  - R2: inside one row, the buttons in order are Edit, Duplicate, Delete.
  - R3: a row with the note "Phở bò" has the button named "Duplicate Phở bò"; a row with no note and amount 50.000 has "Duplicate expense of " plus `formatVND(50000)`.
  - R13: Duplicate, then Cancel: focus is on that row's Duplicate button.
  - R14: Duplicate row A, Cancel, Duplicate row B: the form shows row B's amount, category and note.
- **Verify**: `cd frontend && npm test -- src/App.duplicate.test.tsx` (expected to fail on assertions), then `cd frontend && npm run build && npm run lint`.
- **Done when**: every case above exists; each fails on an assertion (no Duplicate button found), never on an import or type error; `npm run build` and `npm run lint` pass; the file imports only modules that exist today.
- **Slug**: `duplicate-action-tests`
- **Issue**: #40
- **Branch**: `feat/40-duplicate-action-tests`
- **PR target**: `feat/39-duplicate-expense`
- **PR title**: `T1: Acceptance tests for the Duplicate action (#40)`

## T2: Acceptance tests for saving a duplicate  [ ]

- **Lane**: B
- **Goal**: Write the acceptance tests for R5 to R12 at the `App` level, with `./api/*` mocked as in `App.test.tsx`. They fail until T3 and T5 are merged.
- **Files**: `frontend/src/App.duplicate-save.test.tsx` (new)
- **Size**: ~230 lines, 1 file
- **Covers**: R5, R6, R7, R8, R9, R10, R11, R12
- **Depends on**: none
- **Tests**: jsdom file. `getSummary` resolves with `budget: null` (no budget in force, so the save's lookups answer at once and add no suffix). Originals are dated 10 days before `todayISO()` from `src/lib/dates.ts`. Key cases:
  - R5: after Duplicate, the dialog title is "Add expense", the primary button is "Add expense", and there is no Delete button.
  - R6: Amount shows the original's amount, its category is pressed, and Note holds its note; an original with no note opens with an empty Note.
  - R7: Date holds `todayISO()`, not the original's date.
  - R8: clearing Amount and submitting shows "Enter an amount." and the summary "Fix 1 field to save this expense.", and `createExpense` is not called; changing Amount to 75.000 then saving sends 75000.
  - R9: saving calls `createExpense` once with `{ amount, category_id, date: todayISO(), note }` from the form and never calls `updateExpense`; the original row is still in the list with its values.
  - R10: after saving, the dialog closes and the toast reads "Expense added".
  - R11: Cancel, and Esc on the dialog, each close it with no `createExpense` call and no toast.
  - R12: duplicating an original with `recurring_id: 3` sends a payload with no `recurring_id` key; the new row (returned with `recurring_id: null`) shows no "Recurring" badge.
  - Failed save (Design, reused): `createExpense` rejecting keeps the dialog open with "Couldn’t save this expense. Check your connection and try again." and no toast.
- **Verify**: `cd frontend && npm test -- src/App.duplicate-save.test.tsx` (expected to fail on assertions), then `cd frontend && npm run build && npm run lint`.
- **Done when**: every case above exists; each fails on an assertion (no Duplicate button found), never on an import or type error; `npm run build` and `npm run lint` pass; the file imports only modules that exist today.
- **Slug**: `duplicate-save-tests`
- **Issue**: #41
- **Branch**: `feat/41-duplicate-save-tests`
- **PR target**: `feat/39-duplicate-expense`
- **PR title**: `T2: Acceptance tests for saving a duplicate (#41)`

## Wave 1

## T3: Duplicate draft and form prefill  [ ]

- **Lane**: A
- **Goal**: Add the pure helper `duplicateDraft(expense)` returning only `{ amount, category_id, note }`, and an optional `prefill` prop on `ExpenseFormDialog` that seeds Amount, Category and Note when `expense` is absent. `isEdit` and the date default stay as they are.
- **Files**: `frontend/src/lib/duplicate.ts` (new), `frontend/src/lib/duplicate.test.ts` (new), `frontend/src/components/ExpenseFormDialog.tsx`, `frontend/src/components/ExpenseFormDialog.test.tsx` (new)
- **Size**: ~170 lines, 4 files
- **Covers**: R5, R6, R7, R12
- **Depends on**: none
- **Tests**: `duplicate.test.ts`: an expense with a note gives its amount, category and note; a `null` note stays `null`; an expense with `recurring_id` and `date` set gives an object whose keys are exactly `amount`, `category_id`, `note`. `ExpenseFormDialog.test.tsx` (jsdom): with `prefill`, the title and button read "Add expense", Amount, Category and Note are filled, Date is `todayISO()`, and there is no Delete button; a `null` note in `prefill` gives an empty Note; without `prefill` the form opens empty as today.
- **Verify**: `cd frontend && npm test -- src/lib/duplicate.test.ts src/components/ExpenseFormDialog.test.tsx`
- **Done when**: the cases pass; `App.test.tsx` and `App.alerts.test.tsx` still pass unchanged; `npm run build` and `npm run lint` pass.
- **Slug**: `duplicate-form-prefill`
- **Issue**: #42
- **Branch**: `feat/42-duplicate-form-prefill`
- **PR target**: `feat/39-duplicate-expense`
- **PR title**: `T3: Duplicate draft and form prefill (#42)`

## T4: Copy icon and design spec entry  [ ]

- **Lane**: B
- **Goal**: Add `CopyIcon` (two overlapping rounded squares, default size 18, through the shared `Svg` wrapper) to `icons.tsx`, and update `design/DESIGN.md` per spec concern 1: the `TransactionRow` entry lists Edit, Duplicate and Delete and says Duplicate shows on mobile next to Edit; a "Duplicate" key flow (open from a row, form prefilled with date today, save adds a new expense); the Add / Edit expense section notes that Duplicate opens it in add mode.
- **Files**: `frontend/src/components/icons.tsx`, `frontend/src/components/icons.test.tsx` (new), `design/DESIGN.md`
- **Size**: ~45 lines, 3 files
- **Covers**: R1, R2, R4 (design text), R5
- **Depends on**: none
- **Tests**: `icons.test.tsx` (jsdom): `CopyIcon` renders an `<svg>` 18 wide by default and at a given size, with `aria-hidden="true"`.
- **Verify**: `cd frontend && npm test -- src/components/icons.test.tsx`
- **Done when**: the test passes; `DESIGN.md` changes only those three places and its wording matches R1 to R7; `npm run build` and `npm run lint` pass.
- **Slug**: `copy-icon-design`
- **Issue**: #43
- **Branch**: `feat/43-copy-icon-design`
- **PR target**: `feat/39-duplicate-expense`
- **PR title**: `T4: Copy icon and design spec entry (#43)`

## Wave 2

## T5: Duplicate button on expense rows  [ ]

- **Lane**: solo
- **Goal**: Add a required `onDuplicate(expense)` prop to `ExpenseRow`, rendered as a non-danger `icon-btn` with `CopyIcon` between Edit and Delete and named "Duplicate <name>". Thread it through `DashboardPage` and `TransactionsPage` like `onEdit`. In `App.tsx`, the add variant of the form state gains an optional `prefill`; `onDuplicate` opens it with `duplicateDraft(expense)`, the dialog `key` is `dup-<id>` for a duplicate, and `prefill` is passed to `ExpenseFormDialog`. `save` is unchanged.
- **Files**: `frontend/src/components/ExpenseRow.tsx`, `frontend/src/components/ExpenseRow.test.tsx`, `frontend/src/components/DashboardPage.tsx`, `frontend/src/components/TransactionsPage.tsx`, `frontend/src/App.tsx`, `frontend/src/components/DashboardPage.test.tsx`, `frontend/src/components/DashboardPage.alerts.test.tsx`, `frontend/src/components/TransactionsPage.test.tsx`
- **Size**: ~120 lines, 8 files
- **Covers**: R1, R2, R3, R4, R5, R6, R7, R9, R10, R11, R12, R13, R14
- **Depends on**: T3, T4
- **Tests**: `ExpenseRow.test.tsx`: the three buttons in order Edit, Duplicate, Delete; the Duplicate name with a note and without one; clicking it calls `onDuplicate` with the expense; the Duplicate button has no `danger` class. The other three test files only gain the new required prop where they render the pages.
- **Verify**: `cd frontend && npm test -- src/components/ExpenseRow.test.tsx src/App.duplicate.test.tsx src/App.duplicate-save.test.tsx src/App.test.tsx`
- **Done when**: the unit tests and every case in both acceptance files pass; the existing App, Dashboard and Transactions tests pass; `npm run build` and `npm run lint` pass; the UI check passes.
- **Slug**: `duplicate-row-action`
- **Issue**: #44
- **Branch**: `feat/44-duplicate-row-action`
- **PR target**: `feat/39-duplicate-expense`
- **PR title**: `T5: Duplicate button on expense rows (#44)`
- **UI check**:
  - **Route/URL**: http://localhost:5181/ (lane A; the Dashboard is the start view).
  - **Setup**: lane A servers from `.claude/scripts/dev-servers.sh start A <worktree>` (fresh temp database). Add two expenses: Food & Dining 45.000 ₫ dated 3 days ago with the note "Cà phê sữa đá", and Transport 30.000 ₫ dated yesterday with no note.
  - **Scenarios**:
    1. Dashboard, at 1280px wide: each Recent transactions row shows the icons Edit, Duplicate (copy icon), Delete in that order.
    2. Open Transactions. Click Duplicate on "Cà phê sữa đá". The dialog reads "Add expense", Amount 45.000 ₫, Food & Dining selected, Note "Cà phê sữa đá", Date today, no Delete button.
    3. Click "Add expense". The dialog closes, the toast reads "Expense added", the list has a new "Cà phê sữa đá" row under today, and the original row 3 days ago is unchanged.
    4. Click Duplicate on the Transport row, change Amount to 35.000 ₫, then Cancel. No new row and no toast; focus is on that row's Duplicate button.
    5. Click Duplicate on the Transport row, then Duplicate on "Cà phê sữa đá" after closing: the second form shows the coffee values, not Transport's.
    6. At 375px wide on Transactions: each row shows the Duplicate and Edit icons and no Delete icon; a long note is cut with an ellipsis, and nothing overflows the row.
  - **Evidence**: a screenshot per scenario, a GIF of scenarios 2 to 4, and the browser console log, in `docs/features/duplicate-expense/evidence/T5/` with `result.md`.

## Wave 3

## T6: Integration and full suite  [ ]

- **Lane**: solo
- **Goal**: With T1 to T5 merged into `feat/39-duplicate-expense`, run the full frontend suite (acceptance tests included), lint and build, and confirm nothing outside the planned files changed. If all pass with nothing to change, make no commit and no task PR; note the results in the final PR to `dev`. Branch, PR target and PR title apply only when fixes are needed.
- **Files**: none expected. If fixes are needed, only files already listed in T3 to T5 (never the acceptance test files).
- **Size**: ~0 lines, 0 files (fixes, if any, stay under 300 lines and 10 files)
- **Covers**: R1 to R14
- **Depends on**: T1, T2, T3, T4, T5
- **Tests**: the whole suite, including `App.duplicate.test.tsx` and `App.duplicate-save.test.tsx`. No test in this feature needs a shared port, database or temp file, so none is marked serial.
- **Verify**: `cd frontend && npm test && npm run lint && npm run build`, then `git diff --stat dev...feat/39-duplicate-expense` lists only the files named in T1 to T5 plus this feature's docs (nothing under `backend/`).
- **Done when**: all three commands pass; the diff check shows no backend change; the result is noted for the final PR description.
- **Slug**: `duplicate-integration`
- **Issue**: #45
- **Branch**: `feat/45-duplicate-integration` (only if fixes are needed)
- **PR target**: `feat/39-duplicate-expense` (only if fixes are needed)
- **PR title**: `T6: Integration and full suite (#45)` (only if fixes are needed)

## Risks

- **Design text (concern 1).** The `DESIGN.md` update in T4 is new wording that the product owner has approved only in outline. A wording change later touches T4 only.
- **Icon (concern 2).** The two-squares icon is the spec's proposal. T5's UI check shows it in screenshots for the product owner to confirm; changing it later touches T4 only.
- **Mobile row width (concern 3).** Two icons on a narrow row can cut long notes shorter. T5 scenario 6 checks it at 375px; if something overflows, T5 fixes it in `index.css`, which would add a ninth file (still under 10).
- **Dashboard list of 6 (concern 4).** A duplicate can push the oldest row out of Recent transactions, and focus then falls back to the page. Accepted by the spec; T1's R13 case uses Cancel on Transactions, where the row stays.
- **Pending summary in App tests.** `App.test.tsx` leaves `getSummary` pending by default, which would make each save wait 2 seconds for the lookup timeout. T1 and T2 resolve it with `budget: null`.
- **Required prop breaks other tests.** Making `onDuplicate` required means every test that renders `DashboardPage`, `TransactionsPage` or `ExpenseRow` must pass it, so T5 lists those three test files.
- **Acceptance tests red between waves.** After Wave 0, `npm test` fails on the integration branch until T5 is merged. Task Verify commands run only their own files, and `npm run build` must stay green, so T1 and T2 import only modules that exist today and find the Duplicate button only by role and name.
- **Wave 0 has two lanes.** As in the previous feature, "runs alone" is read as "runs before every other wave"; one task with both files would be about 400 lines. Owner: user.
- **No Playwright.** `frontend/package.json` has no Playwright, so no end-to-end test is planned; the flow is covered by jsdom tests and the T5 UI check. Owner: user.

## Checks

### AC coverage

| Requirement | Tasks |
|---|---|
| R1 | T1, T4, T5, T6 |
| R2 | T1, T4, T5, T6 |
| R3 | T1, T5, T6 |
| R4 | T4, T5 (UI check), T6 |
| R5 | T2, T3, T4, T5, T6 |
| R6 | T2, T3, T5, T6 |
| R7 | T2, T3, T5, T6 |
| R8 | T2, T6 |
| R9 | T2, T5, T6 |
| R10 | T2, T5, T6 |
| R11 | T2, T5, T6 |
| R12 | T2, T3, T5, T6 |
| R13 | T1, T5, T6 |
| R14 | T1, T5, T6 |

No requirement is uncovered.

### Parallel safety

- Wave 0: A (T1) `frontend/src/App.duplicate.test.tsx`; B (T2) `frontend/src/App.duplicate-save.test.tsx`. No overlap.
- Wave 1: A (T3) `frontend/src/lib/duplicate.ts`, `frontend/src/lib/duplicate.test.ts`, `frontend/src/components/ExpenseFormDialog.tsx`, `frontend/src/components/ExpenseFormDialog.test.tsx`; B (T4) `frontend/src/components/icons.tsx`, `frontend/src/components/icons.test.tsx`, `design/DESIGN.md`. No overlap.
- Wave 2: solo (T5).
- Wave 3: solo (T6), no files expected.

### Size

| Task | Estimate | Under 300 lines and 10 files |
|---|---|---|
| T1 | ~170 lines, 1 file | yes |
| T2 | ~230 lines, 1 file | yes |
| T3 | ~170 lines, 4 files | yes |
| T4 | ~45 lines, 3 files | yes |
| T5 | ~120 lines, 8 files | yes |
| T6 | ~0 lines, 0 files | yes |

### Test plan

| Requirement | Acceptance test file | Task that writes it | Tasks that make it pass |
|---|---|---|---|
| R1 | `frontend/src/App.duplicate.test.tsx` | T1 | T4, T5 |
| R2 | `frontend/src/App.duplicate.test.tsx` | T1 | T4, T5 |
| R3 | `frontend/src/App.duplicate.test.tsx` | T1 | T5 |
| R4 | none (CSS; T5 UI check scenario 6) | n/a | T5 |
| R5 | `frontend/src/App.duplicate-save.test.tsx` | T2 | T3, T5 |
| R6 | `frontend/src/App.duplicate-save.test.tsx` | T2 | T3, T5 |
| R7 | `frontend/src/App.duplicate-save.test.tsx` | T2 | T3, T5 |
| R8 | `frontend/src/App.duplicate-save.test.tsx` | T2 | T3, T5 |
| R9 | `frontend/src/App.duplicate-save.test.tsx` | T2 | T5 |
| R10 | `frontend/src/App.duplicate-save.test.tsx` | T2 | T5 |
| R11 | `frontend/src/App.duplicate-save.test.tsx` | T2 | T5 |
| R12 | `frontend/src/App.duplicate-save.test.tsx` | T2 | T3, T5 |
| R13 | `frontend/src/App.duplicate.test.tsx` | T1 | T5 |
| R14 | `frontend/src/App.duplicate.test.tsx` | T1 | T5 |
