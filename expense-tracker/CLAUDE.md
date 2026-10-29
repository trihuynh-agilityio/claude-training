# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Personal Expense Tracker: a React + TypeScript + Vite frontend (`frontend/`) and a FastAPI backend (`backend/`). It lives in one exercise folder of a training repo. Every other top-level folder is unrelated, so keep changes inside `expense-tracker/`.

`README.md` lists seven phases: expenses, categories, filtering, monthly summaries, budgets, CSV export, recurring expenses. Build them in order and keep each phase small. Phases 1 (expense CRUD), 2 (the 8 fixed categories, no category management screen), 3 (filtering, client-side) 4 (monthly summaries: Dashboard) and 5 (monthly budgets) are done; the Dashboard alert strip and the over-budget toast are not built. Phase 6 (CSV export of the filtered Transactions list, frontend only; intent, spec and plan in `intent/2026-10-23-csv-export/`) is done. Phase 7 (recurring expenses: monthly rules, a Recurring screen, catch-up through `POST /api/recurring/generate` on app load) is done (intent, spec and plan in `intent/2026-10-23-recurring-expenses/`): rules live in `app/recurring.py` and `expenses.recurring_id` links the expenses they add. Storage is SQLite via the standard-library `sqlite3` module.

## UI design

Build the frontend to `design/DESIGN.md`. It covers the tokens, components, screens, validation copy, VND formatting and which UI belongs to which phase. The visual source is the design canvas at https://claude.ai/artifact/SdumiU3oAt8stbaR3ASLEa. If the two disagree, ask before picking one.

## Format on edit

`.claude/settings.json` registers a `PostToolUse` hook (`.claude/hooks/format-on-edit.sh`) that runs Ruff on edited backend `.py` files and Prettier on edited frontend files. It loads when Claude is started from `expense-tracker/`, and never blocks an edit if a formatter fails.

## Blocked commands

`.claude/settings.json` registers a `PreToolUse` hook (`.claude/hooks/block-forbidden-command.sh`) on `Bash`. It exits 2, blocking the call, for: pip / manual venv activation / ESLint (use uv and oxlint), force pushes and pushes or merges on `main`, `rm -rf` on `/`, `~`, `.` or `..`, `git reset --hard`, `git clean -f`, and deleting `backend/data/expenses.db`. If a block is wrong, change the rules in the script rather than working around it.

## Notify on finish

`.claude/settings.json` also registers a `Stop` hook (`.claude/hooks/notify-on-finish.sh`) that shows a macOS notification when Claude finishes responding. It does nothing where `osascript` is unavailable and never blocks.

## Feature workflow

Phase 1 (Plan) is the `plan-feature` skill (`.claude/skills/plan-feature/`): `grill-me` on the idea, `write-intent` into `docs/features/<feature-name>/intent.md`, user approval, then a GitHub Issue that points to the intent, created by the `github-ops` subagent (`.claude/agents/github-ops.md`, Haiku). Phase 2 is `design-feature`. After `write-plan` has produced `plan.md`, `create-task-issues <feature-name>` (started by the Stop hook, or run by hand) creates one GitHub sub-issue per task and writes the numbers back into the plan. The `implementer` subagent (`.claude/agents/implementer.md`) builds one task in its own worktree and commits locally; `.claude/scripts/check-task.sh` is its size and file guard. `settings.json` denies merges, force pushes and pushes to `dev` or `main`, and `.claude/hooks/block-push-outside-feat.sh` blocks any `git push` whose target is not `feat/*`. UI checks run in the `ui-verifier` subagent (`.claude/agents/ui-verifier.md`) with the headless, isolated Playwright MCP servers `playwright-a` and `playwright-b` from `.mcp.json`. Each lane has fixed ports, set by `.claude/scripts/dev-servers.sh` (frontend `npm run dev -- --port N --strictPort` with `API_TARGET` pointing at the lane's backend, backend `uv run fastapi dev app/main.py --port N`): **lane A** frontend 5181 and backend 8081, **lane B** frontend 5182 and backend 8082. Evidence goes in `docs/features/<feature>/evidence/<task-id>/` and is git-ignored; nothing in it is committed to the task branch, `result.md` included. `.claude/scripts/publish-evidence.sh` pushes the screenshots to the never-merged orphan branch `<integration branch>-evidence` and prints Markdown images; the PR description carries the `result.md` content and those images, so UI changes can be reviewed from the PR. Each task is then reviewed locally by `review-task <feature> <task-id>` (user-run): the `code-reviewer` subagent reviews the task's commits, the implementer fixes blocker and major findings in new commits (3 rounds at most), and the report stays local and git-ignored at `docs/features/<feature>/reviews/<task-id>.md` (never committed; its summary goes into the PR body). `.claude/scripts/check-review.sh` is the gate (verdict PASS on `CODE_HEAD`, the latest commit outside `reviews/` and `evidence/`, from `.claude/scripts/code-head.sh`). `create-task-pr <feature> <task-id>` (user-run) is the last step per task: `.claude/scripts/check-pr-ready.sh` gates it (clean tree, guard, review PASS, UI result PASS on `CODE_HEAD`, base on GitHub), then it pushes only the task branch and opens the PR through `github-ops create-pr`, with a body from the `pr-description` skill plus a Workflow details section. It never merges or approves. `build-feature <feature>` (Opus; the Stop hook starts it right after `create-task-issues`, or run it by hand to resume) runs the whole build: `build-position.sh` computes the position from `plan.md` and the PR states from `github-ops get-pr-state`, one Sonnet lane subagent per task (two lanes in parallel) runs implement, review, UI check and PR, then it waits for the user to merge each wave (a 10-minute `CronCreate` watch that, once the wave is merged, starts the next wave by itself, and that fixes new review comments on an open task PR through `github-ops get-pr-feedback`, the implementer, a review round, a push and a marked reply, at most 2 rounds per PR; rerunning also works) and finally opens the one PR from the integration branch to `dev`. Each task sub-issue carries one status label (`status:in-progress`, `status:in-review`, `status:done` or `status:blocked`) that `build-feature` and `create-task-pr` swap as the task moves; a task that reaches `status:done` also has its sub-issue closed through `github-ops close-issue`, which refuses the feature issue (that one stays open). State is in `.claude/workflow/state.json`. It never merges. Later phases are not automated yet.

## Next phase hook

`.claude/settings.json` also registers a `Stop` hook (`.claude/hooks/next-phase.sh`). It reads `.claude/workflow/state.json`; when a phase is `done` with `handed_off: false` it marks it handed off and blocks the stop once, telling Claude to run the next skill: `plan` starts `design-feature`, `design` starts `write-plan`, `write-plan` starts `create-task-issues` (which asks you to approve the plan before it creates any issue), and `tasks` starts `build-feature`. So approving the plan is the last command you give: it then creates the issues and runs the build. `build` with `done` and `handed_off: false` starts `verify-feature`; `build-feature` writes that only after every task PR is merged and the final PR is open. A build in progress, `waiting_review`, `blocked`, `verify` and `done` never advance. Each run appends a line to `.claude/workflow/hook.log`. Both files are git-ignored. `settings.json` also allows the `gh issue` and `gh label` commands that `github-ops` runs.

## Verify phase

`verify-feature <feature>` (Opus; started by the `Stop` hook when `build-feature` finishes, or run by hand; add `--dry-run` to print the steps without writing) is Phase 4. It needs every task PR merged and the final PR to `dev` open, then checks the WHOLE feature in a throwaway worktree (`.claude/scripts/verify-worktree.sh`: local branch `verify/<feature>`, `github/dev` merged into it locally only if `dev` moved, never pushed, always removed at the end). `.claude/scripts/verify-checks.sh` runs install, build, lint, the frontend and backend suites and the plan's acceptance tests in order; the `e2e-verifier` subagent (Sonnet, lane A) runs the main flows; the skill builds the AC table (spec requirements R1.., each VERIFIED only by a passing check), reviews `dev...<integration branch>`, and writes `verification.md` with a PASS or FAIL verdict under `docs/features/<feature>/evidence/verify/` in the main checkout (git-ignored, with the other evidence). The report is never committed or pushed: `github-ops` posts its full text as a comment on the feature issue, and `append-pr-section` adds a `## Verification` section with a link to that comment to the final PR. On FAIL it proposes fix tasks (`F<n>` issue titles, plan headings `## T<n>:` under a new `## Wave`), asks you, and after approval adds them to `plan.md`; you then run `build-feature` and `verify-feature` again (2 fix rounds at most). State is `phase: verify` in `.claude/workflow/state.json`, always `handed_off: true`.

## Git workflow

- Work on `dayNN/<topic>` branches cut from `dev` (e.g. `day06/expense-tracker-scaffold`).
- Merge feature branches into `dev` only, with a merge commit titled `Merge branch '<branch>' into 'dev'`. Never merge or open MRs into `main`.
- The remote is GitLab (`gitlab.asoft-python.com`), not GitHub.

## Backend (`backend/`)

```bash
uv sync
uv run fastapi dev app/main.py              # http://localhost:8000, docs at /docs
uv run pytest                               # all tests
uv run pytest tests/test_health.py::test_health_returns_ok   # single test
uv run ruff format .                        # format (dev dependency)
```

- Managed with **uv** (`pyproject.toml` + committed `uv.lock`). Always use `uv run …` and `uv add` / `uv add --dev`, never pip or a manually activated venv.
- Non-packaged uv app (no build system). The FastAPI instance is `app.main:app`. `pyproject.toml` sets `pythonpath = ["."]` so tests can `from app.main import app`.
- Tests use `httpx2` rather than `httpx`, because Starlette's `TestClient` warns about plain `httpx`.
- All routes live under the `/api` prefix. The frontend depends on this prefix for proxying. Routes: `GET /api/health` the `/api/expenses` CRUD routes in `app/expenses.py` (list, create, get, replace with `PUT`, delete) and `GET /api/summary?month=YYYY-MM&today=YYYY-MM-DD` in `app/summary.py` (SQL aggregation per month and category; compares with the month before up to the same day; carries the `budget` in force). `today` is the caller's date and defaults to the server's, so tests pass it explicitly instead of relying on the real clock. Recurring rules live in `app/recurring.py`: `GET/POST /api/recurring`, `PUT/PATCH/DELETE /api/recurring/{id}` (`PATCH` pauses or resumes; resuming marks everything due up to `today` as handled, so missed months are skipped) and `POST /api/recurring/generate?today=` (adds every due, unhandled occurrence up to `today` inside one `BEGIN IMMEDIATE` transaction and returns `{added}`; it is idempotent through `last_generated`, so a deleted expense is not recreated). The pure `occurrences()` function holds the day-clamping maths and is mirrored by `frontend/src/lib/recurring.ts`; `RecurringIn` must stay in sync with `validateRecurring`. The 24-month start-date limit is checked in the routes against the caller's `today`, and the start date is locked once `last_generated` is set. Deleting a rule sets `recurring_id` to NULL on its expenses. `Expense` (the response model) deliberately skips the no-future-date rule of `ExpenseIn`, because a browser ahead of the server clock can make a rule add an expense dated 'tomorrow'. Budgets live in `app/budgets.py`: `GET /api/budgets?month=` returns the budget in force (a month with none of its own inherits the latest earlier one, `is_own` says which) and `PUT /api/budgets/{month}` replaces a month's budget. Only the current and next month can be saved, and there is deliberately no delete route. `BudgetIn` in `app/schemas.py` holds the amount rules and must stay in sync with `validateBudget` in `frontend/src/lib/validation.ts`.
- `app/db.py` owns SQLite: `init_db()` runs in the app lifespan and `get_connection()` is the per-request dependency. The file is `backend/data/expenses.db` (git-ignored); `EXPENSE_DB_PATH` overrides it, and `tests/conftest.py` points it at a temp file per test. Use the `client` fixture, which enters `TestClient` as a context manager so the lifespan creates the table.
- `category_id` is validated against the `CategoryId` literal in `app/schemas.py`, which must match `frontend/src/lib/categories.ts`; `init_db()` adds the column to databases created before categories existed. Validation lives in `app/schemas.py` (`ExpenseIn`) and must stay in sync with `frontend/src/lib/validation.ts` and the messages in `design/DESIGN.md`.

## Frontend (`frontend/`)

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # oxlint (config: .oxlintrc.json), not ESLint
npm test           # vitest run (helpers in src/lib)
npm run build      # tsc -b type-check, then vite build
npm run format     # prettier --write (config: .prettierrc.json)
```

- Scaffolded from the `create-vite` `react-ts` template (React 19, Vite 8, TypeScript ~6.0). No router or UI library.
- Layout: `src/api/` (typed fetch client, `ApiError`), `src/lib/` (pure helpers with `*.test.ts` Vitest tests), `src/components/` (screens and dialogs), `src/types.ts`. `App.tsx` owns the expense list state, the CRUD calls and a `view` state (Dashboard, Transactions, Budget or Recurring, no router); `DashboardPage` and `BudgetPage` fetch their own summary (which carries the budget) and refetch when `version` bumps after a change. Budget status, remaining and safe-per-day maths live in `src/lib/budgets.ts`. CSV export builds the file text and name in `src/lib/csv.ts` (from the filtered `visible` list in `TransactionsPage`) and saves it through `src/lib/download.ts`; it is frontend only. On mount `App` calls `generateRecurring(today)` before loading the list (a failure shows a toast and loading continues); `RecurringPage` owns the rules and calls `onChanged` after saving or deleting one, and `ConfirmDeleteDialog` takes optional title, description and label for rule deletes.
- Dialogs use native `<dialog>` with `showModal()` through `components/useModalDialog.ts`. Delete always goes through `ConfirmDeleteDialog`.
- Vitest covers `src/lib` and `src/api` in the default environment. Component tests (`*.test.tsx`) use jsdom and Testing Library: start the file with `// @vitest-environment jsdom`, import `../test/setup`, and mock `../api/*` modules. Check visual changes in the browser as well.
- `vite.config.ts` proxies `/api` to `http://localhost:8000`. The frontend calls relative `/api/...` URLs, and the backend has **no CORS setup**. Run both dev servers together. The Transactions screen shows an error state if the backend isn't running.
