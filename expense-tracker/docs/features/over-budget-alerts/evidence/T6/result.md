# T6 UI check (re-run on new code commit ff98fb8)

Setup: lane B, fresh temp DB, budget 2026-10 set via PUT /api/budgets/2026-10 (monthly 1.000.000, food 200.000, bills 300.000). The dev-servers.sh frontend was replaced by Vite on 5182 with the external config /private/tmp/claude-501/laneB/vite.b.config.ts (proxy /api to 8082), because the worktree vite.config.ts ignores API_TARGET. No GIF (ffmpeg missing): numbered screenshots instead. A MutationObserver in the page logged toast text and dialog open state with timestamps.

1. PASS - Food 180.000: toast "Expense added" only.
2. PASS - Bills 350.000: toast "Expense added. Over budget: Bills & Utilities."
3. PASS - Bills 10.000: toast "Expense added" only.
4. PASS - Food 500.000: toast "Expense added. Over budget: Food & Dining, Monthly budget."
5. PASS - Edit 500.000 to 5.000: toast "Changes saved" only.
6. PASS - Edit to 500.000 and date 2026-09-15: toast "Changes saved" only.
7. PASS - Delete 10.000 Bills: toast "Expense deleted" only.
8. PASS - With /api/summary never settling: dialog closed 20 ms after submit (46894 -> 46914 ms), toast "Expense added" (no error) appeared 2011 ms after submit (-> 48905 ms). Override removed by reload (08c-after.png). Screenshots 08a (dialog closed, no toast yet) and 08b (toast).

Console: 0 errors, 0 warnings. Network: no failed requests (see console.log).

Date: 2026-10-28 14:01
Branch: feat/28-save-toast-check
Local-only evidence files: 01-food-90.png 02-bills-over.png 03-bills-already-over.png 04-food-and-monthly-over.png 05-edit-down.png 06-edit-prev-month.png 07-delete.png 08a-hung-summary-dialog-closed.png 08b-hung-summary-toast.png 08c-after.png console.log

Overall: PASS
Commit: ff98fb87a9984d8c45865edb02ca671f50b1e9b3
