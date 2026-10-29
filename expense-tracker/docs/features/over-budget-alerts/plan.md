# Plan: Over-budget alerts
Status: approved.
From: [intent.md](intent.md) and [spec.md](spec.md).

## Build rules

- Branches are named `feat/<number>-<slug>` (lowercase kebab-case, ASCII, 2 to 5 words). Slugs are unique within the feature.
- The integration branch `feat/22-over-budget-alerts` is created from `dev`, never from `main`.
- A task branch `feat/<sub-issue-number>-<task-slug>` is created from `feat/22-over-budget-alerts` after the previous wave's PRs are merged into it. Each task PR targets `feat/22-over-budget-alerts` and is titled `T<n>: <task title> (#<sub-issue-number>)`. No stacked PRs.
- After the plan is approved, the build phase creates one sub-issue per task under issue #22 through `github-ops` (Haiku): title `T<n>: <task title>`, a short body (goal, covered requirements, link to `plan.md`). It then replaces each task's `Issue: pending` with `Issue: #<n>` and fills in the final `Branch:` and `PR title:` in `plan.md`. This is the only edit allowed to an approved plan; nothing else in it changes.
- Task PRs target `feat/22-over-budget-alerts`, not the default branch, so closing keywords such as "Closes #n" do not close the sub-issues. Do not rely on them.
- PRs are created on GitHub, in the repo `trihuynh-agilityio/claude-training` (confirmed by the user; `CLAUDE.md` has no GitHub repo line).
- The workflow never merges a PR and never pushes to `dev` or `main`. The user reviews and merges every task PR.
- After a wave's PRs are created, the build phase sets the workflow state to `waiting_review` and uses `/loop` (about every 10 minutes) to watch them. Each tick delegates the status check to `github-ops` (Haiku). When all are merged, it stops the loop and starts the next wave. When a PR is closed without merge, it stops the loop and tells the user. The loop is always stopped once the wave is resolved or the feature is done.
- After the final wave, it only creates the PR from `feat/22-over-budget-alerts` to `dev`.
- Commands, from `CLAUDE.md`:
  - Test command: `cd frontend && npm test` (`vitest run`). One file: `cd frontend && npm test -- <path under frontend/>`. Also run `npm run lint` (oxlint) and `npm run build` (`tsc -b` type-check, which includes test files under `src`).
  - Dev servers: backend `cd backend && uv run fastapi dev app/main.py` (http://localhost:8000), frontend `cd frontend && npm run dev`, at **http://localhost:5173**. Both must run together (Vite proxies `/api`).
  - GitHub repo: `trihuynh-agilityio/claude-training`.
- Implementer tasks never edit `frontend/src/components/DashboardPage.alerts.test.tsx` or `frontend/src/App.alerts.test.tsx` (the acceptance tests).

## Issues with the spec

1. **Category names in the examples.** R4 and R8 use "Food" in their examples, but R4 and the Design say a category is named by its name from `src/lib/categories.ts`, where food is "Food & Dining" (and bills is "Bills & Utilities"). The plan uses the names from `categories.ts`, so the strip reads, for example, "Over budget: Food & Dining, Monthly budget." The acceptance tests use those names. Owner: product owner (Tri Viet Huynh).
2. **`.alert` radius.** The Design says the strip reuses the `.alert` pattern "with the 12px alert radius (`--radius-tile`)", but `.alert` in `src/index.css` uses `--radius-control` (10px), against `design/DESIGN.md` ("12 for tiles and alerts"). Changing `.alert` would also change the form error summaries on other screens, which R14 rules out. The plan adds a strip-only modifier class with `--radius-tile` and leaves `.alert` as it is. Owner: product owner, to decide whether `.alert` itself should be fixed in a separate change.
3. **"Button-styled link, not a route".** The Design does not say whether "View budget" is an `<a>` or a `<button>`. There is no router and `onOpenBudget` is a callback, so the plan uses a `<button>` with the existing `link-btn` class, like "View all" on the Dashboard; the acceptance tests find it by role `button` and name "View budget". Owner: product owner.

## Wave 0

## T1: Acceptance tests for the Dashboard strip  [ ]

- **Lane**: A
- **Goal**: Write the acceptance tests for R1 to R7 at the `DashboardPage` level, with `getSummary` mocked. They fail until T3 and T5 are merged.
- **Files**: `frontend/src/components/DashboardPage.alerts.test.tsx` (new)
- **Size**: ~200 lines, 1 file
- **Covers**: R1, R2, R3, R4, R5, R6, R7
- **Depends on**: none
- **Tests**: jsdom file in the style of `DashboardPage.test.tsx` (own local summary and budget builders, no shared fixture file). Key cases:
  - R1: no strip when every item is under 85%; strip present when one item is near or over.
  - R2: a category with spending but no budget is never named; a budgeted category with no expenses counts as spent 0 (not named); `budget: null` gives no strip and the existing budget invite stays; a month with `count: 0` gives no strip.
  - R3 boundaries on a 1.000.000 ₫ budget: 849.999 not named, 850.000 near limit, 1.000.000 near limit, 1.000.001 over budget. Same for the monthly budget.
  - R4: exact text "Over budget: Food & Dining, Monthly budget. Near limit: Bills & Utilities."; only-near text has no "Over budget" part; only-over text has no "Near limit" part.
  - R5: two over items and two near items each listed by percent used, highest first.
  - R6: clicking the "View budget" button calls `onOpenBudget` once.
  - R7: no close button in the strip; the strip changes when `version` bumps to a summary with nothing near or over (it disappears) and when the month switcher shows a month with a different summary.
- **Verify**: `cd frontend && npm test -- src/components/DashboardPage.alerts.test.tsx` (expected to fail on assertions), then `cd frontend && npm run build && npm run lint`.
- **Done when**: every case above exists; each fails on an assertion (strip text or button not found), never on an import or type error; the R2 "no strip" cases may already pass; `npm run build` and `npm run lint` pass; the file imports only modules that exist today.
- **Slug**: `strip-acceptance-tests`
- **Issue**: #23
- **Branch**: `feat/23-strip-acceptance-tests`
- **PR target**: `feat/22-over-budget-alerts`
- **PR title**: `T1: Acceptance tests for the Dashboard strip (#23)`

## T2: Acceptance tests for the save toast  [ ]

- **Lane**: B
- **Goal**: Write the acceptance tests for R8 to R14 at the `App` level, with `../api/*` mocked as in `App.test.tsx`. They fail until T3, T4 and T6 are merged.
- **Files**: `frontend/src/App.alerts.test.tsx` (new)
- **Size**: ~240 lines, 1 file
- **Covers**: R8, R9, R10, R11, R12, R13, R14
- **Depends on**: none
- **Tests**: jsdom file, `getSummary` answering per call (before, then after), fake timers for the 2-second cases. Key cases:
  - R8: add that moves Food & Dining over shows exactly "Expense added. Over budget: Food & Dining."; an edit shows "Changes saved. Over budget: …"; both the monthly budget and a category moving over are both named.
  - R9: `getSummary` is called with the month of the saved date (a back-dated add and an edit that moves the date to another month both look up the new date's month).
  - R10: item already over before the save gives the plain text; item moving into near limit only (for example 849.999 to 850.000) gives the plain text; item moving from 1.000.000 (near) to 1.000.001 (over) is named.
  - R11: a confirmed delete shows "Expense deleted" with no over-budget part and calls no extra `getSummary`; the catch-up on mount (`generateRecurring` returning `added > 0`) shows no over-budget toast.
  - R12: the before lookup rejecting, the after lookup rejecting, and a lookup that never answers (advance 2 seconds) each end with the save done, the dialog closed and the plain text; no error text shown.
  - R13: while the after lookup is pending, no toast is shown; once it resolves, the full text appears once (the toast element never shows the plain text first).
  - R14: the save flow calls only `createExpense` or `updateExpense` and `getSummary` (no other API function).
- **Verify**: `cd frontend && npm test -- src/App.alerts.test.tsx` (expected to fail on assertions), then `cd frontend && npm run build && npm run lint`.
- **Done when**: every case above exists; the R8, R9, R10 (named case), R12 and R13 cases fail on an assertion, never on an import or type error; the R11, R14 and plain-text cases may already pass; `npm run build` and `npm run lint` pass; the file imports only modules that exist today.
- **Slug**: `toast-acceptance-tests`
- **Issue**: #24
- **Branch**: `feat/24-toast-acceptance-tests`
- **PR target**: `feat/22-over-budget-alerts`
- **PR title**: `T2: Acceptance tests for the save toast (#24)`

## Wave 1

## T3: Budget alert helpers  [ ]

- **Lane**: A
- **Goal**: Add the pure helpers `budgetAlerts(summary)`, `newlyOver(before, after)` and `alertText(over, near)` to `budgets.ts`, built on the existing `budgetStatus` and `percentUsed`, with category names from `getCategory`.
- **Files**: `frontend/src/lib/budgets.ts`, `frontend/src/lib/budgets.test.ts`
- **Size**: ~170 lines, 2 files
- **Covers**: R2, R3, R4, R5, R9, R10
- **Depends on**: none
- **Tests**: in `budgets.test.ts`: items built only from the monthly budget and budgeted categories (unbudgeted category ignored, budgeted category with no row counts as 0); `budget: null` gives empty lists; the R3 boundaries 849.999 / 850.000 / 1.000.000 / 1.000.001 on a 1.000.000 budget; ordering by percent used inside each list; `alertText` with both lists, only over, only near, and neither; `newlyOver` with an item already over, an item only moving to near, an item moving from near to over, an item new to `after` (category budget added), and `before` with `budget: null`, with the result ordered like the strip.
- **Verify**: `cd frontend && npm test -- src/lib/budgets.test.ts`
- **Done when**: the cases pass; `budgetStatus`, `percentUsed` and `sortByStatus` keep their behaviour (existing cases unchanged); `npm run build` and `npm run lint` pass.
- **Slug**: `budget-alert-helpers`
- **Issue**: #25
- **Branch**: `feat/25-budget-alert-helpers`
- **PR target**: `feat/22-over-budget-alerts`
- **PR title**: `T3: Budget alert helpers (#25)`

## T4: Lookup timeout helper  [ ]

- **Lane**: B
- **Goal**: Add a small pure helper that settles a promise within a time limit and rejects when the limit passes, for the 2-second limit per summary lookup in R12.
- **Files**: `frontend/src/lib/timeout.ts` (new), `frontend/src/lib/timeout.test.ts` (new)
- **Size**: ~65 lines, 2 files
- **Covers**: R12
- **Depends on**: none
- **Tests**: with fake timers: resolves with the value when the promise settles first; rejects when the promise rejects first; rejects once the limit passes (1.999 s still pending, 2 s rejected); the timer is cleared after the promise settles.
- **Verify**: `cd frontend && npm test -- src/lib/timeout.test.ts`
- **Done when**: the cases pass; `npm run build` and `npm run lint` pass.
- **Slug**: `summary-lookup-timeout`
- **Issue**: #26
- **Branch**: `feat/26-summary-lookup-timeout`
- **PR target**: `feat/22-over-budget-alerts`
- **PR title**: `T4: Lookup timeout helper (#26)`

## Wave 2

## T5: Dashboard alert strip  [ ]

- **Lane**: A
- **Goal**: Add `BudgetAlertStrip` (takes the already-fetched summary and `onOpenBudget`) and render it in `DashboardPage` inside `.dashboard`, between the KPI grid and `.dashboard-panels`. Style it from `.alert` plus a strip modifier: `--radius-tile`, danger colors with any over item, near-limit badge colors (#8f4a00 on #fdf0dc) with only near items, no live-region role, wrapping on narrow screens.
- **Files**: `frontend/src/components/BudgetAlertStrip.tsx` (new), `frontend/src/components/BudgetAlertStrip.test.tsx` (new), `frontend/src/components/DashboardPage.tsx`, `frontend/src/index.css`
- **Size**: ~165 lines, 4 files
- **Covers**: R1, R2, R4, R6, R7
- **Depends on**: T3
- **Tests**: `BudgetAlertStrip.test.tsx` (jsdom): renders nothing with no items; text and danger modifier with an over item; near-limit modifier with only near items; no `role="alert"`/`role="status"`/`aria-live`; no close button; "View budget" button calls `onOpenBudget`. `DashboardPage.test.tsx` must keep passing unchanged (its `getByText('Over budget')` on the badge needs the strip line to be one text, not a separate "Over budget" element).
- **Verify**: `cd frontend && npm test -- src/components/BudgetAlertStrip.test.tsx src/components/DashboardPage.test.tsx src/components/DashboardPage.alerts.test.tsx`
- **Done when**: the unit tests, the existing Dashboard tests and every case in `DashboardPage.alerts.test.tsx` pass; the Dashboard makes no extra `getSummary` call; `npm run build` and `npm run lint` pass; the UI check passes.
- **Slug**: `dashboard-alert-strip`
- **Issue**: #27
- **Branch**: `feat/27-dashboard-alert-strip`
- **PR target**: `feat/22-over-budget-alerts`
- **PR title**: `T5: Dashboard alert strip (#27)`
- **UI check**:
  - **Route/URL**: http://localhost:5173/ (the Dashboard is the start view).
  - **Setup**: start the backend on a fresh database, `cd backend && EXPENSE_DB_PATH="$(mktemp -d)/ui-check.db" uv run fastapi dev app/main.py`, and the frontend dev server. On Budget, save for the current month: monthly 1.000.000 ₫, Food & Dining 200.000 ₫, Bills & Utilities 300.000 ₫. All expenses below are dated today.
  - **Scenarios**:
    1. Add Food & Dining 100.000 ₫. Dashboard: no strip between the KPI cards and "Spending by category".
    2. Add Food & Dining 80.000 ₫ (180.000, 90%). Dashboard: strip "Near limit: Food & Dining." in amber (#8f4a00 on #fdf0dc), 12px radius, no close button.
    3. Add Bills & Utilities 350.000 ₫ (117%). Dashboard: strip "Over budget: Bills & Utilities. Near limit: Food & Dining." in danger colors.
    4. Click "View budget". The Budget screen opens.
    5. Back on Dashboard, click "Previous month". No strip (no budget in force there). Click "Next month": the strip of scenario 3 is back.
    6. Delete the Bills & Utilities expense and the 80.000 ₫ Food & Dining expense. Dashboard: the strip disappears.
    7. At 375px wide, repeat scenario 3: the strip text wraps onto more lines and is not cut off.
  - **Evidence**: a screenshot per scenario, a GIF of scenarios 2 to 6, and the browser console log, in `docs/features/over-budget-alerts/evidence/T5/` with `result.md`.

## T6: Over-budget check in the save toast  [ ]

- **Lane**: B
- **Goal**: In `save` in `App.tsx`, read the saved date's month summary before and after the write through `getSummary`, each limited to 2 seconds with the T4 helper; compare with `newlyOver`; show one toast after the check, with " Over budget: …" (from `alertText`) appended when something moved into over budget. A failed or slow lookup ends the check silently. Delete and the catch-up on mount are not touched.
- **Files**: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`
- **Size**: ~140 lines, 2 files
- **Covers**: R8, R9, R10, R11, R12, R13
- **Depends on**: T3, T4
- **Tests**: in `App.test.tsx` (jsdom): add with a category moving over; edit with the date moved to a back month (lookups use that month); before lookup failing skips the after lookup and shows the plain text; a write that fails shows the form error and no toast; the existing three tests still pass.
- **Verify**: `cd frontend && npm test -- src/App.test.tsx src/App.alerts.test.tsx`
- **Done when**: the unit tests and every case in `App.alerts.test.tsx` pass; `Toast.tsx`, the delete flow and the catch-up effect are unchanged; `npm run build` and `npm run lint` pass; the UI check passes.
- **Slug**: `save-toast-check`
- **Issue**: #28
- **Branch**: `feat/28-save-toast-check`
- **PR target**: `feat/22-over-budget-alerts`
- **PR title**: `T6: Over-budget check in the save toast (#28)`
- **UI check**:
  - **Route/URL**: http://localhost:5173/ (save from the Dashboard or Transactions).
  - **Setup**: same fresh database and budget as T5 (current month: monthly 1.000.000 ₫, Food & Dining 200.000 ₫, Bills & Utilities 300.000 ₫). Expenses dated today unless stated.
  - **Scenarios**:
    1. Add Food & Dining 180.000 ₫ (90%). Toast "Expense added" only.
    2. Add Bills & Utilities 350.000 ₫. Toast "Expense added. Over budget: Bills & Utilities."
    3. Add Bills & Utilities 10.000 ₫ (already over). Toast "Expense added" only.
    4. Add Food & Dining 500.000 ₫ (Food & Dining 680.000, month 1.040.000). Toast "Expense added. Over budget: Food & Dining, Monthly budget."
    5. Edit the 500.000 ₫ expense to 5.000 ₫. Toast "Changes saved" only.
    6. Edit it back to 500.000 ₫ and change its date to the 15th of the previous month (no budget in force there). Toast "Changes saved" only.
    7. Delete the 10.000 ₫ Bills & Utilities expense. Toast "Expense deleted" only.
    8. In the browser console, replace `window.fetch` with a wrapper that returns a promise that never settles for URLs starting with `/api/summary` and calls the original `fetch` for everything else. Open Transactions and add Health 10.000 ₫. The dialog closes, and after about 2 seconds the toast "Expense added" appears with no error. Reload the page to remove the override.
  - **Evidence**: a screenshot per scenario (the toast visible), a GIF of scenario 8, and the browser console log, in `docs/features/over-budget-alerts/evidence/T6/` with `result.md`.

## Wave 3

## T7: Integration and full suite  [ ]

- **Lane**: solo
- **Goal**: With T1 to T6 merged into `feat/22-over-budget-alerts`, run the full frontend suite (acceptance tests included), lint and build, and confirm nothing outside the planned files changed. If all pass with nothing to change, make no commit and no task PR; note the results in the final PR to `dev`. Branch, PR target and PR title apply only when fixes are needed.
- **Files**: none expected. If fixes are needed, only files already listed in T3 to T6 (never the acceptance test files).
- **Size**: ~0 lines, 0 files (fixes, if any, stay under 300 lines and 10 files)
- **Covers**: R1 to R14
- **Depends on**: T1, T2, T3, T4, T5, T6
- **Tests**: the whole suite, including `DashboardPage.alerts.test.tsx`, `App.alerts.test.tsx` and the unchanged `BudgetPage.test.tsx` (R14). No test in this feature needs a shared port, database or temp file, so none is marked serial.
- **Verify**: `cd frontend && npm test && npm run lint && npm run build`, then `git diff --stat dev...feat/22-over-budget-alerts` lists only the files named in T1 to T6 plus this feature's docs (nothing under `backend/`).
- **Done when**: all three commands pass; the diff check shows no API, backend or other-screen change; the result is noted for the final PR description.
- **Slug**: `alerts-integration`
- **Issue**: #29
- **Branch**: `feat/29-alerts-integration` (only if fixes are needed)
- **PR target**: `feat/22-over-budget-alerts` (only if fixes are needed)
- **PR title**: `T7: Integration and full suite (#29)` (only if fixes are needed)

## Risks

- **Wording not confirmed (concern 1).** R4 and R8 wording is the spec's proposal; a long strip wraps (T5 scenario 7). T1, T2, T3 and T5 hard-code the wording in tests. **T1 and T2 should wait for the product owner's confirmation** (and Issue 1, the category names); a later wording change touches T1, T2, T3 and T5. Owner: product owner.
- **Monthly budget as an item (concern 2).** The plan follows the spec and includes it. `design/DESIGN.md` still describes categories only; updating it is outside this plan. Owner: product owner.
- **"View budget" lands on the current month (concern 3).** Accepted by the spec; the plan does not pass the month (R14). Owner: product owner.
- **Extra lookups per save (concern 4).** The before lookup runs before the write, so the form can stay in its saving state up to 2 seconds longer, and the toast can come up to 2 seconds after the dialog closes. A catch-up expense landing between the two lookups can be blamed on the save; accepted by the spec. Owner: product owner.
- **Existing Dashboard test.** `DashboardPage.test.tsx` uses `getByText('Over budget')` for the status badge in a month that is over budget; a strip that renders "Over budget" as its own element would make it find two. T5 renders the strip line as one text and keeps that file unchanged.
- **Fake timers in App tests.** The 2-second cases in T2 and T6 use fake timers with Testing Library's async queries, which can hang if timers are not advanced. T2 and T6 keep timer control inside the timeout cases only.
- **Acceptance tests red between waves.** After Wave 0, `npm test` fails on the integration branch until Wave 2 is merged. Task Verify commands run only their own files; `npm run build` must stay green, so T1 and T2 import only existing modules.
- **Wave 0 has two lanes.** The skill says Wave 0 "runs alone"; the plan reads that as running before every other wave. Putting T1 and T2 in one task would exceed 300 lines. If the user wants a single Wave 0 task, the acceptance tests need to be cut down. Owner: user.
- **No Playwright.** `frontend/package.json` has no Playwright, so no end-to-end test is planned; the strip and toast flows are covered by jsdom tests and the T5 and T6 UI checks. Whether to add Playwright is a decision for the user. Owner: user.
- **Git workflow differs from `CLAUDE.md`.** `CLAUDE.md` says to work on `dayNN/<topic>` branches and that the remote is GitLab, while this plan uses `feat/…` branches and GitHub PRs in `trihuynh-agilityio/claude-training` as the workflow and the user require. Owner: user, to confirm before Wave 0 branches are pushed.

## Checks

### AC coverage

| Requirement | Tasks |
|---|---|
| R1 | T1, T5, T7 |
| R2 | T1, T3, T5, T7 |
| R3 | T1, T3, T7 |
| R4 | T1, T3, T5, T7 |
| R5 | T1, T3, T7 |
| R6 | T1, T5, T7 |
| R7 | T1, T5, T7 |
| R8 | T2, T6, T7 |
| R9 | T2, T3, T6, T7 |
| R10 | T2, T3, T6, T7 |
| R11 | T2, T6, T7 |
| R12 | T2, T4, T6, T7 |
| R13 | T2, T6, T7 |
| R14 | T2, T7 |

No requirement is uncovered.

### Parallel safety

- Wave 0: A (T1) `frontend/src/components/DashboardPage.alerts.test.tsx`; B (T2) `frontend/src/App.alerts.test.tsx`. No overlap.
- Wave 1: A (T3) `frontend/src/lib/budgets.ts`, `frontend/src/lib/budgets.test.ts`; B (T4) `frontend/src/lib/timeout.ts`, `frontend/src/lib/timeout.test.ts`. No overlap.
- Wave 2: A (T5) `frontend/src/components/BudgetAlertStrip.tsx`, `frontend/src/components/BudgetAlertStrip.test.tsx`, `frontend/src/components/DashboardPage.tsx`, `frontend/src/index.css`; B (T6) `frontend/src/App.tsx`, `frontend/src/App.test.tsx`. No overlap. UI checks for T5 and T6 run one at a time after both lanes are built.
- Wave 3: solo (T7), no files expected.

### Size

| Task | Estimate | Under 300 lines and 10 files |
|---|---|---|
| T1 | ~200 lines, 1 file | yes |
| T2 | ~240 lines, 1 file | yes |
| T3 | ~170 lines, 2 files | yes |
| T4 | ~65 lines, 2 files | yes |
| T5 | ~165 lines, 4 files | yes |
| T6 | ~140 lines, 2 files | yes |
| T7 | ~0 lines, 0 files | yes |

### Test plan

| Requirement | Acceptance test file | Task that writes it | Tasks that make it pass |
|---|---|---|---|
| R1 | `frontend/src/components/DashboardPage.alerts.test.tsx` | T1 | T3, T5 |
| R2 | `frontend/src/components/DashboardPage.alerts.test.tsx` | T1 | T3, T5 |
| R3 | `frontend/src/components/DashboardPage.alerts.test.tsx` | T1 | T3, T5 |
| R4 | `frontend/src/components/DashboardPage.alerts.test.tsx` | T1 | T3, T5 |
| R5 | `frontend/src/components/DashboardPage.alerts.test.tsx` | T1 | T3, T5 |
| R6 | `frontend/src/components/DashboardPage.alerts.test.tsx` | T1 | T5 |
| R7 | `frontend/src/components/DashboardPage.alerts.test.tsx` | T1 | T5 |
| R8 | `frontend/src/App.alerts.test.tsx` | T2 | T3, T6 |
| R9 | `frontend/src/App.alerts.test.tsx` | T2 | T3, T6 |
| R10 | `frontend/src/App.alerts.test.tsx` | T2 | T3, T6 |
| R11 | `frontend/src/App.alerts.test.tsx` | T2 | passes today; T6 must keep it passing |
| R12 | `frontend/src/App.alerts.test.tsx` | T2 | T4, T6 |
| R13 | `frontend/src/App.alerts.test.tsx` | T2 | T6 |
| R14 | `frontend/src/App.alerts.test.tsx` (plus existing `BudgetPage.test.tsx`) | T2 | T6, checked in T7 |
