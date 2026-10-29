---
name: create-task-issues
description: Phase 3 (Build) step, started by the Stop hook right after write-plan (or run by hand when the plan exists). Turns each task of an approved plan into a GitHub sub-issue of the feature issue and writes the numbers back into the plan. Run with the feature folder name.
model: sonnet
allowed-tools: Read Edit Write Glob Agent AskUserQuestion
---

# Create the task issues

One sub-issue per task of `docs/features/<feature-name>/plan.md`, linked to the feature issue, then the numbers written back into the plan. It builds nothing: no push and no implementation; its only commit is the approved plan on the integration branch (step 4).

Argument: `<feature-name>`, the folder under `docs/features/`.

## 1. Check the plan

Read `docs/features/<feature-name>/plan.md`.

- If line 2 is `Status: approved.`, carry on.
- If it is `Status: draft.`, ask with `AskUserQuestion`: approve the plan, or change something. On changes, stop and let the user edit. On approval, set line 2 to `Status: approved.` with `Edit`.
- Never edit `intent.md` or `spec.md`.

## 2. Find the feature issue

Call the `github-ops` agent with `find-issue docs/features/<feature-name>/intent.md`. Keep its number and its current labels. If it reports `not found`, stop and tell the user: the feature issue is missing, so Phase 1 is not finished. Do not create one.

## 3. Create the sub-issues

For each task `## T<n>: <title>` in plan order, call `github-ops` with `create-sub-issue`:

- parent: the feature issue number,
- title: `T<n>: <title>` (the heading text without the `[ ]`),
- body: a short body with the task's Goal, the requirements it covers, its wave and lane, and the path `docs/features/<feature-name>/plan.md`,
- labels: `task`.

Do not ask questions here. A task whose sub-issue already exists is returned as `already existed`; keep its number and create nothing. If one call fails, keep going with the others and report the failures at the end.

## 4. Write the numbers into the plan

For each task that now has a number, `Edit` plan.md:

- `Issue: pending` becomes `Issue: #<n>`.
- `Branch:` becomes `feat/<n>-<slug>` using the task's `Slug`. Keep any trailing note such as `(only if fixes are needed)`.
- `PR title:` has `<sub-issue>` replaced by `<n>`.

This is the only edit allowed on an approved plan. Change nothing else in it.

Then commit the approved plan, numbers included, to the feature's integration branch: `.claude/scripts/commit-feature-doc.sh <feature-name> <feature issue number> plan.md`. It never pushes and leaves the current checkout untouched. If it fails, tell the user and carry on.

## 5. Update the feature issue

Tell the user which phase label the feature issue has now (from step 2). Then call `github-ops`:

1. `comment` on the feature issue with the task list: number, title, wave and lane for each task.
2. `swap-label` on the feature issue: its current phase label (`phase:design-done`, or `phase:plan-done` if that is the one present) to `phase:tasks-ready`.

## 6. Hand off

Write `.claude/workflow/state.json` (create the folder with `mkdir -p` if needed; use `Write`) with exactly this content, so the `Stop` hook starts `build-feature` (the plan was approved in step 1, so no further command is needed):

```json
{"feature": "<feature-name>", "phase": "tasks", "status": "done", "handed_off": false}
```

Report a table: task, issue number, branch name, and any failures. Do not push or start implementation yourself: the `Stop` hook starts `build-feature`.
