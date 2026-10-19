---
name: pr-description
description: Use when writing or updating a pull request or GitLab merge request description for the Personal Expense Tracker, or when asked to summarize a branch for review.
model: sonnet
allowed-tools: Bash(git log *) Bash(git diff *) Bash(git status *) Read Grep Glob
---

# PR description

The remote is GitLab (`gitlab.asoft-python.com`), so a "PR" here is a merge request. Its target is always `dev`, never `main`.

## 1. Gather the facts

```bash
git log --oneline dev..HEAD
git diff --stat dev...HEAD -- expense-tracker/
```

Read the full diff before writing. Describe only what the branch changes, and only changes inside `expense-tracker/`.

## 2. Title

The main commit subject: imperative, sentence case, no trailing period, under ~70 characters (e.g. `Add fixed expense categories`). A branch that finishes a README phase may use `Phase N: <name>`.

## 3. Body

Fill in this template. Drop a section only if it would be empty.

```markdown
## Summary
1–3 sentences: what changes for the user and why. Name the README phase.

## Changes
- Backend: routes, `schemas.py` validation, `db.py` / `init_db()` migrations
- Frontend: screens, components, `src/lib` helpers
- Docs: `CLAUDE.md`, `README.md`, `design/DESIGN.md`

## Testing
- [ ] `uv run pytest` (backend)
- [ ] `npm run lint && npm test && npm run build` (frontend)
- [ ] Browser check: <screens and flows clicked through>

## Notes for reviewers
Anything to look at closely: kept-in-sync pairs (`CategoryId` ↔ `categories.ts`, `ExpenseIn` ↔ `validation.ts` ↔ DESIGN.md copy), migrations, deferred work, screenshots for UI changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- Tick a Testing box only for a check you ran on this branch and saw pass. Leave the rest unticked and say why.
- Write for a reviewer who hasn't seen the code: plain sentences, no file-by-file narration.
- Before release, the `release-checklist` skill runs the full checks.

## 4. Open or update the MR

If `glab` is logged in to `gitlab.asoft-python.com`, use `glab mr create --target-branch dev` or `glab mr update`. Otherwise, use push options:

```bash
git push -u origin <branch> -o merge_request.create -o merge_request.target=dev \
  -o "merge_request.title=<title>" -o "merge_request.description=<body>"
```

Push options can't carry multiple lines well. Afterwards, paste the full body in GitLab or tell the user to. Never merge the MR yourself.
