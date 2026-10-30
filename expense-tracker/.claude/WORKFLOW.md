# Feature workflow

An automated feature workflow for Claude Code: an idea goes through intent, spec, plan, GitHub issues, parallel implementation with review and UI checks, task PRs, and a whole-feature verification. A human approves the intent, the spec and the plan, and merges every PR. Nothing in it merges, approves or force-pushes.

Everything that differs between projects lives in **`.claude/workflow.json`**. The skills, agents, hooks and scripts read it; none of them names a repository, branch, command or port.

## Phases

| Phase | Skill | Result | Human step |
|---|---|---|---|
| 1 Plan | `plan-feature` | `<docs_dir>/<feature>/intent.md`, a feature issue, the intent committed to the integration branch | approve the intent |
| 2 Design | `design-feature` (spec-reviewer loop) | `spec.md`, committed | approve the spec |
| 2b Plan | `write-plan` | `plan.md`: waves of at most two tasks, lanes A/B, size limits, AC coverage | — |
| 3a Tasks | `create-task-issues` | one sub-issue per task, numbers written back into the plan, plan committed | approve the plan |
| 3b Build | `build-feature` | per task: implementer, `check-task.sh`, `review-task` loop, `ui-verifier`, `create-task-pr`; a watch that starts the next wave after a merge and fixes PR feedback; the final PR to the base branch | merge each wave, then the final PR |
| 4 Verify | `verify-feature` | checks, E2E, AC table and review on a throwaway merge with the base; report on the feature issue; `plan-fix.md` on FAIL | approve the fix plan |

The `Stop` hook `next-phase.sh` moves from one phase to the next through `.claude/workflow/state.json` (git-ignored, with `hook.log`). `review-task` and `create-task-pr` are user-run skills that the build lanes follow step by step.

## Parts

- **Skills** (`.claude/skills/`): the phases above, plus `write-intent`, `write-spec`, `project-context`.
- **Agents** (`.claude/agents/`): `github-ops` (every GitHub call, Haiku), `implementer`, `code-reviewer`, `spec-reviewer`, `ui-verifier` (lanes A and B), `e2e-verifier` (lane A).
- **Scripts** (`.claude/scripts/`, all read `lib/config.sh`): `build-position.sh` (where the build stands), `check-task.sh` (size, files and format of one task), `check-review.sh` and `check-pr-ready.sh` (gates), `code-head.sh`, `commit-feature-doc.sh`, `dev-servers.sh` (a lane's servers), `publish-evidence.sh` (screenshots to the `<integration branch>-evidence` branch), `verify-worktree.sh`, `verify-checks.sh`.
- **Hooks** (`.claude/hooks/`): `format-on-edit.sh` (the `format` rules, also in task worktrees), `block-forbidden-command.sh` (generic guards plus `blocked_commands`), `block-push-outside-feat.sh` (pushes only to `branches.prefix`), `next-phase.sh`, `notify-on-finish.sh` (macOS only).
- **MCP** (`.mcp.json`): the headless, isolated Playwright servers `playwright-a` and `playwright-b`, one per lane.

Task ids (`T1`, `T2`) are keys inside the plan, the review reports (`<docs_dir>/<feature>/reviews/`), the evidence folders (`<docs_dir>/<feature>/evidence/`) and the state file. Issue, PR and commit titles come from `naming` and never carry them.

## Installing in another project

1. **Requirements**: `git`, `jq`, `gh` signed in to the GitHub repository, `curl`, `lsof`, Node (`npx` for Playwright MCP), bash 3.2 or newer. Issues and PRs live on GitHub; the code remote may be elsewhere.
2. **Copy** `.claude/skills/` (the workflow skills listed above), `.claude/agents/`, `.claude/hooks/`, `.claude/scripts/`, `.claude/WORKFLOW.md`, `.claude/workflow.json`, `.claude/settings.json` and `.mcp.json` into the project folder (the repository root, or a folder inside it).
3. **Edit `.claude/workflow.json`** for the project (reference below).
4. **Edit `.claude/settings.json`**: permissions cannot read the config, so adapt the project-specific entries: the `gh api repos/<owner>/<repo>/issues/*` allow rule, the `git push ... github feat/*` and `git fetch github*` rules (remote name and branch prefix), the build and test commands (`npm ...`, `uv ...`), and the deny rules for the base and protected branches.
5. **Add to `.gitignore`**: `.claude/workflow/`, `<docs_dir>/*/reviews/`, `<docs_dir>/*/evidence/`.
6. **Project content** stays the project's own: `CLAUDE.md` (stack, rules, how to run one test), and optionally a `pr-description` skill for PR bodies (without it the workflow writes a short summary). `review-checklist` and `release-checklist` are project skills, not part of the workflow.
7. **Check**: from a task-free checkout, `bash .claude/scripts/build-position.sh <a plan> <empty file>` should parse a plan, and starting Claude from the project folder should load the hooks.

## `workflow.json` reference

| Key | Meaning |
|---|---|
| `github.repo` | `owner/name` of the GitHub repository for issues and PRs |
| `github.remote` | the git remote that points at it (pushes, fetches) |
| `github.feedback_authors` | PR feedback the build acts on comes only from these logins |
| `github.review_trigger` | comment posted on each new task PR to start a review bot; `""` for none |
| `branches.base` | the branch features start from and the final PR targets |
| `branches.protected` | never pushed to or merged on (hook and skills) |
| `branches.prefix` | the only branches the workflow may push; every `naming` branch must start with it |
| `docs_dir` | where `<feature>/intent.md`, `spec.md`, `plan.md`, reviews and evidence live, relative to the project |
| `task_limits` | `max_lines` and `max_files` of one task (the limit is "under") |
| `naming` | patterns for titles and branches; placeholders `{feature_name}`, `{feature_slug}`, `{feature_issue}`, `{task_title}`, `{task_slug}`, `{task_issue}`, `{round}`. Changing `feature_issue_title` orphans existing feature issues, because `find-issue` matches it exactly |
| `commands.install`, `build`, `lint`, `format_check`, `test` | lists of `{dir, run}`, run in that order by `verify-checks.sh` and the integration check; `install` also prepares a new worktree |
| `commands.acceptance` | `{dir, run}` with `{output}` (a JSON report path) and `{files}` (the plan's acceptance test files, relative to `dir`) |
| `format` | rules `{dir, match, exclude, write, check}`: globs relative to `dir`; `write` and `check` get absolute file paths appended and run in `dir` of the main checkout |
| `lanes` | `A` and `B`, each a map of named ports (`frontend_port`, ...) used as placeholders |
| `dev_servers` | `{name, dir, run, env, ready}` per server; placeholders are the lane's ports and `{state_dir}` (a fresh temp folder per lane) |
| `app_url` | the app URL of a lane (placeholders as above), printed by `dev-servers.sh` as `APP_URL=` |
| `dev_url` | the normal dev URL that plans may mention; the UI verifiers replace it with the lane's `app_url` |
| `blocked_commands` | project rules for the Bash hook: `{pattern, message}`, extended regex on the whole command |
