#!/usr/bin/env bash
# Commits verification.md (docs only) to the integration branch and pushes that one feat/* branch.
#   publish-verification.sh <feature-name> <integration-branch> <verification-md-file>
# Uses a second, clean worktree on the integration branch itself, so the merged-with-dev test tree
# is never committed or pushed. Plain push, never forced. Prints the commit hash.

set -euo pipefail

feature="${1:-}"; branch="${2:-}"; src="${3:-}"
[[ "$feature" =~ ^[a-z0-9][a-z0-9-]*$ && -f "$src" ]] || { echo "usage: publish-verification.sh <feature-name> <integration-branch> <verification-md-file>" >&2; exit 2; }
[[ "$branch" == feat/* ]] || { echo "publish-verification: branch must be feat/*, got '$branch'" >&2; exit 2; }

top="$(git rev-parse --path-format=absolute --git-common-dir)/.."
top="$(cd "$top" && pwd)"
wt="$top/.claude/worktrees/verify-$feature-report"

git -C "$top" fetch -q github "$branch:$branch" 2>/dev/null || {
  git -C "$top" merge-base --is-ancestor "github/$branch" "$branch" ||
    { echo "publish-verification: local $branch is behind or diverged from github/$branch" >&2; exit 1; }
}
[[ -d "$wt" ]] && git -C "$top" worktree remove --force "$wt"
git -C "$top" worktree add -q "$wt" "$branch"
trap 'git -C "$top" worktree remove --force "$wt" 2>/dev/null || true' EXIT

dest="$wt/expense-tracker/docs/features/$feature/verification.md"
[[ -d "$(dirname "$dest")" ]] || { echo "publish-verification: no docs/features/$feature on $branch" >&2; exit 1; }
cp "$src" "$dest"
git -C "$wt" add "expense-tracker/docs/features/$feature/verification.md"
if ! git -C "$wt" diff --cached --quiet; then
  git -C "$wt" commit -q -m "Add verification report for $feature" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
fi
(cd "$wt" && git push -q github "$branch")
git -C "$wt" rev-parse HEAD
