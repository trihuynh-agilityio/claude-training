# T6 UI check (lane B)
Workaround: worktree vite.config.ts hardcodes proxy to :8000, so Vite ran on 5182 with an external config (/private/tmp/claude-501/laneB/vite.b.config.ts) proxying /api to http://localhost:8082. Backend from dev-servers.sh (fresh temp DB). Budget set via PUT /api/budgets/2026-10 (monthly 1000000, food 200000, bills 300000). Scenario 8 uses numbered screenshots (no ffmpeg, no GIF).

1. PASS: add Food 180.000; toast "Expense added" only.
2. PASS: add Bills 350.000; toast "Expense added. Over budget: Bills & Utilities."
3. PASS: add Bills 10.000; toast "Expense added" only.
4. PASS: add Food 500.000; toast "Expense added. Over budget: Food & Dining, Monthly budget."
5. PASS: edit 500.000 to 5.000; toast "Changes saved" only.
6. PASS: edit back to 500.000, date 2026-09-15; toast "Changes saved" only.
7. PASS: delete 10.000 Bills; toast "Expense deleted" only.
8. PASS: with /api/summary never settling, Health 10.000 added; dialog closed, toast "Expense added" appeared about 1.7s after submit, no error. Reloaded to remove override. Screenshots 08a, 08b, 08c.

Console: no errors or warnings. Network: no failures.

Date: 2026-10-28 11:49
Branch: feat/28-save-toast-check
Local-only evidence: 01-food-90pct.png 02-bills-over.png 03-bills-already-over.png 04-food-month-over.png 05-edit-down.png 06-edit-back-month.png 07-delete.png 08a-form-filled.png 08b-after-submit.png 08c-toast.png console.log

Overall: PASS
Commit: b174726e0d93f09ee078dd1df28b7679fc7ba635
