#!/usr/bin/env bash
# Commits approved feature docs (intent.md, spec.md, plan.md) to the feature's integration branch,
# without touching the current checkout. Nothing here is ever pushed: build-feature pushes the branch.
#   commit-feature-doc.sh <feature-name> <feature-issue-number> <doc>...
# <doc> is a file name inside docs/features/<feature-name>/ (intent.md, spec.md, plan.md).
# The branch is feat/<issue>-<feature-name>; it is created from local `dev` (never `main`) if missing.
# The docs are copied from this checkout into a temporary worktree at
# <repo root>/.claude/worktrees/feat-<issue>-<feature-name>, committed there, and the worktree is removed.
# Prints BRANCH=, COMMIT= (or COMMIT=none when the branch already had identical files).

set -euo pipefail

feature="${1:-}"; issue="${2:-}"; shift 2 2>/dev/null || true
[[ "$feature" =~ ^[a-z0-9][a-z0-9-]*$ && "$issue" =~ ^[0-9]+$ && $# -gt 0 ]] || {
  echo "usage: commit-feature-doc.sh <feature-name> <feature-issue-number> <doc>..." >&2; exit 2; }

project="$(cd "$(dirname "$0")/../.." && pwd)"
top="$(cd "$(git -C "$project" rev-parse --path-format=absolute --git-common-dir)/.." && pwd)"
rel="${project#"$top"/}"
branch="feat/$issue-$feature"
wt="$top/.claude/worktrees/feat-$issue-$feature"
docs="docs/features/$feature"

for doc in "$@"; do
  [[ "$doc" =~ ^[a-z-]+\.md$ && -f "$project/$docs/$doc" ]] || { echo "commit-feature-doc: no $docs/$doc" >&2; exit 2; }
done
[[ -e "$wt" ]] && { echo "commit-feature-doc: $wt already exists" >&2; exit 2; }

git -C "$top" show-ref --verify --quiet "refs/heads/$branch" || git -C "$top" branch "$branch" dev
git -C "$top" worktree add --quiet "$wt" "$branch"
trap 'git -C "$top" worktree remove --force "$wt"' EXIT

mkdir -p "$wt/$rel/$docs"
paths=()
for doc in "$@"; do
  cp "$project/$docs/$doc" "$wt/$rel/$docs/$doc"
  paths+=("$rel/$docs/$doc")
done
git -C "$wt" add -- "${paths[@]}"

echo "BRANCH=$branch"
if git -C "$wt" diff --cached --quiet; then
  echo "COMMIT=none"
  exit 0
fi
names="$(printf '%s, ' "${@%.md}")"
git -C "$wt" commit --quiet -m "Add the ${feature//-/ } ${names%, }" -m "Approved in the feature workflow." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
echo "COMMIT=$(git -C "$wt" rev-parse --short HEAD)"
