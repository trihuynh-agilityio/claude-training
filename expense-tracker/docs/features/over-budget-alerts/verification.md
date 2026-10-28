# Verification: Over-budget alerts

- Date: 2026-10-28
- Integration branch: `feat/22-over-budget-alerts` at `2d1fd14a04190daf5cf6328f29353819153d161b`
- `dev` at `55177c3909ec55eadfad5ff2287afbe43087da7d`
- Merged with dev: no. `dev` is already contained in the integration branch, so the tested tree is the integration branch as it is.
- Final PR: #38 (`feat/22-over-budget-alerts` into `dev`). Task PRs #32 to #37 are merged. T7 had no PR, and these checks cover it.

## Checks

| Step | Exit | Seconds | Summary |
|---|---|---|---|
| install-frontend | 0 | 1 | `npm ci`: 111 packages, 0 vulnerabilities |
| install-backend | 0 | 0 | `uv sync` |
| build | 0 | 3 | `tsc -b` and `vite build` passed |
| lint | 0 | 1 | oxlint: no problems |
| unit-frontend | 0 | 3 | 259 of 259 tests in 25 files passed |
| unit-backend | 0 | 2 | 116 pytest tests passed |
| acceptance | 0 | 2 | `DashboardPage.alerts.test.tsx` and `App.alerts.test.tsx`: 39 of 39 tests passed |

## Feature E2E

Lane A ran in a headless Playwright browser on a fresh database. The October 2026 budget was monthly 1.000.000, Food & Dining 200.000 and Bills & Utilities 300.000. Overall: **PASS**. There were no console errors or warnings and no failed requests, apart from the deliberate hang in Flow 2 step 8.

Note: the worktree's `vite.config.ts` ignores `API_TARGET` because `dev` does not have that change yet. Vite therefore ran with an external config that proxies `/api` to 8081. No source was edited. The dialog actions were driven by DOM scripts, and the toasts were observed with a MutationObserver.

| Flow | Requirements | Result | Observed |
|---|---|---|---|
| 1.1 | R1, R2 | PASS | Food at 100.000: no strip |
| 1.2 | R1, R3, R4 | PASS | "Near limit: Food & Dining." in #8f4a00 on #fdf0dc, 12px radius, no close button |
| 1.3 | R3, R4, R7 | PASS | "Over budget: Bills & Utilities. Near limit: Food & Dining." in danger colours |
| 1.4 | R6 | PASS | "View budget" opens the Budget screen |
| 1.5 | R2, R7 | PASS | September has no strip; October's strip comes back |
| 1.6 | R7 | PASS | after the deletes, the strip is gone |
| 1.7 | R4 | PASS | at 375px the text wraps to 2 lines and nothing overflows |
| 2.1 | R10 | PASS | "Expense added" (near limit only) |
| 2.2 | R8, R9 | PASS | "Expense added. Over budget: Bills & Utilities." |
| 2.3 | R10 | PASS | "Expense added" (already over) |
| 2.4 | R8, R9, R5 | PASS | "Expense added. Over budget: Food & Dining, Monthly budget."; the strip reads "Over budget: Food & Dining, Bills & Utilities, Monthly budget." |
| 2.5 | R10 | PASS | the edit down gives "Changes saved" |
| 2.6 | R9 | PASS | the edit to 2026-09-15 (no budget there) gives "Changes saved" |
| 2.7 | R11 | PASS | delete gives "Expense deleted" |
| 2.8 | R12, R13 | PASS | with `/api/summary` hung, the dialog closed after 21 ms and "Expense added" appeared once at +2011 ms, with no error |

## Acceptance criteria

| AC | Tasks | Proving test(s) | Result | Evidence |
|---|---|---|---|---|
| R1 | T1, T5, T7 | `DashboardPage.alerts.test.tsx` "R1 when it shows" (2 pass) | VERIFIED | acceptance.json; E2E 1.1, 1.2 |
| R2 | T1, T3, T5, T7 | "R2 which items count" (4 pass) | VERIFIED | acceptance.json; E2E 1.1, 1.5 |
| R3 | T1, T3, T7 | "R3 boundaries on a 1.000.000 budget" (8 pass) | VERIFIED | acceptance.json; E2E 1.2, 1.3 |
| R4 | T1, T3, T5, T7 | "R4 text" (3 pass) | VERIFIED | acceptance.json; E2E 1.2, 1.3, 1.7 |
| R5 | T1, T3, T7 | "R5 order" (1 pass) | VERIFIED | acceptance.json; E2E 2.4 |
| R6 | T1, T5, T7 | "R6 View budget" (1 pass) | VERIFIED | acceptance.json; E2E 1.4 |
| R7 | T1, T5, T7 | "R7 follows the data" (3 pass) | VERIFIED | acceptance.json; E2E 1.3, 1.5, 1.6 |
| R8 | T2, T6, T7 | `App.alerts.test.tsx` "R8 and R9" (5 pass) | VERIFIED | acceptance.json; E2E 2.2, 2.4 |
| R9 | T2, T3, T6, T7 | "R8 and R9" (5 pass) | VERIFIED | acceptance.json; E2E 2.2, 2.4, 2.6 (see finding 1) |
| R10 | T2, T3, T6, T7 | "R10" (3 pass) | VERIFIED | acceptance.json; E2E 2.1, 2.3, 2.5 |
| R11 | T2, T6, T7 | "R11" (2 pass) | VERIFIED | acceptance.json; E2E 2.7 (catch-up is covered by the test only) |
| R12 | T2, T4, T6, T7 | "R12" (4 pass) | VERIFIED | acceptance.json; E2E 2.8 |
| R13 | T2, T6, T7 | "R13" (1 pass) | VERIFIED | acceptance.json; E2E 2.8 and every toast step |
| R14 | T2, T7 | "R14" (2 pass) plus the diff check | VERIFIED | The diff touches 12 files, all under `frontend/src/`. Nothing changed under `backend/`, `src/api/`, `BudgetPage` or `Toast`. |

14 of 14 are VERIFIED; none is UNVERIFIED.

## Whole-feature review

Reviewed `git diff 55177c3...2d1fd14`: 12 files, +1197 and -11. There is no debug code, no focused or skipped test, and no file outside the plan's Files lists.

1. **minor**, `frontend/src/App.tsx:105`: the "before" lookup is started before the write and awaited after it. If the server builds that summary after committing the write, the save's alert is missed (R9). It never causes a false alert. The product owner accepted this during T6, and it is documented in a code comment and pinned by order tests. `spec.md` (Design, concern 4) still says the read finishes before the write. Fix: the product owner updates the spec, or a later change awaits the lookup with a short cap.
2. **minor**, `frontend/src/components/BudgetAlertStrip.tsx:20`: the strip has no `AlertIcon`, although the spec's Design says it reuses `.alert` "and `AlertIcon`". Fix: render `<AlertIcon />` first, as `FilterCard` does.
3. **minor**, `frontend/src/components/BudgetAlertStrip.tsx:22`: "View budget" uses the shared blue `.link-btn` on the danger and amber backgrounds. Fix: `.alert-strip .link-btn { color: inherit; text-decoration: underline; }`, or follow the design canvas.

No blocker or major findings.

## Verdict

**PASS**. Every check is green, all 14 ACs are VERIFIED, and there is no blocker or major finding.
