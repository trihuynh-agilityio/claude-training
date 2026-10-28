# T5 UI check (lane A, frontend 5181, backend 8081, fresh temp DB)

- Scenario 1 PASS: with 100.000 Food (50%), no strip between the KPI grid and "Spending by category".
- Scenario 2 PASS: 180.000 Food (90%) gives strip "Near limit: Food & Dining." plus "View budget"; class `alert alert-strip is-near`; computed color rgb(143,74,0) (#8f4a00) on background rgb(253,240,220) (#fdf0dc); border-radius 12px; no close button (only "View budget"); no role or aria-live; sits between `.kpi-grid` and `.dashboard-panels`.
- Scenario 3 PASS: plus 350.000 Bills (117%) gives "Over budget: Bills & Utilities. Near limit: Food & Dining."; class `is-over`; color rgb(161,27,18) on rgb(252,232,230), border rgb(161,27,18), radius 12px. (The "View budget" button text is rgb(36,69,200) on that pink; noted only.)
- Scenario 4 PASS: "View budget" opens the Budget screen (h1 "Budget").
- Scenario 5 PASS: Previous month (September) shows the empty state, no strip; Next month brings back the scenario-3 strip. (Next month is disabled on the current month, as designed.)
- Scenario 6 PASS: deleting the Bills expense leaves "Near limit: Food & Dining."; deleting the 80.000 Food expense removes the strip.
- Scenario 7 PASS: at 375px the strip is 343px wide, its text takes 2 lines (42px), no horizontal overflow (scrollWidth equals clientWidth, document width 375). The setup for this repeat (80.000 Food, 350.000 Bills) was posted through POST /api/expenses, then the page was reloaded.

Notes:
- No GIF or video: Playwright's ffmpeg is not installed. Numbered screenshots stand in for scenarios 2 to 6 (02, 03, 04, 05a, 05b, 06).
- Environment issue: the worktree's `frontend/vite.config.ts` proxies /api to :8000 and ignores `API_TARGET`, so the frontend started by dev-servers.sh gave 502s. I ran Vite from a config outside the worktree (proxy to 8081) on port 5181. Source untouched.
- Console after the restart: no errors or warnings. See console.log.

Date: 2026-10-28
Branch: feat/27-dashboard-alert-strip
Local-only evidence files: 01-no-strip.png, 02-near-limit.png, 03-over-budget.png, 04-budget-screen.png, 05a-previous-month.png, 05b-next-month-strip-back.png, 06-strip-gone.png, 07-narrow-375.png, console.log

Overall: PASS
Commit: a22562ac8aba98d1bfb723587ccca628da6257cb
