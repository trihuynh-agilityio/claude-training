#!/usr/bin/env bash
# Creates or removes the throwaway worktree that verify-feature tests in. Nothing here is ever pushed.
#   verify-worktree.sh create <feature-name> <integration-branch>
#   verify-worktree.sh remove <feature-name>
# create: fetches `dev` and the integration branch from the github remote (fast-forward only), puts a
#   local branch verify/<feature-name> at the integration tip in <repo root>/.claude/worktrees/verify-<feature-name>,
#   and, if dev is not already contained in it, merges github/dev into THAT branch only, so the tree is
#   what would land in dev. A conflict aborts the merge and exits 3 (the worktree is removed).
#   Prints KEY=value lines: WORKTREE, INTEGRATION_HEAD, DEV_HEAD, MERGED (yes|no).
# remove: removes the worktree and the local verify/<feature-name> branch (and the report worktree
#   left by publish-verification.sh, if any).
# This is the only place a merge is allowed; it refuses any path outside .claude/worktrees/verify-*.

set -euo pipefail

action="${1:-}"; feature="${2:-}"; branch="${3:-}"
[[ "$action" == create || "$action" == remove ]] && [[ "$feature" =~ ^[a-z0-9][a-z0-9-]*$ ]] || {
  echo "usage: verify-worktree.sh create <feature-name> <integration-branch> | remove <feature-name>" >&2; exit 2; }

top="$(git rev-parse --path-format=absolute --git-common-dir)/.."
top="$(cd "$top" && pwd)"
wt="$top/.claude/worktrees/verify-$feature"
tmp_branch="verify/$feature"
[[ "$wt" == "$top/.claude/worktrees/verify-"* ]] || { echo "verify-worktree: bad path $wt" >&2; exit 2; }

remove() {
  local p
  for p in "$wt" "$wt-report"; do
    [[ -d "$p" ]] && git -C "$top" worktree remove --force "$p"
  done
  git -C "$top" worktree prune
  git -C "$top" show-ref --verify --quiet "refs/heads/$tmp_branch" && git -C "$top" branch -D "$tmp_branch" >/dev/null
  return 0
}

if [[ "$action" == remove ]]; then
  remove
  echo "removed verify worktrees for $feature"
  exit 0
fi

[[ "$branch" == feat/* ]] || { echo "verify-worktree: integration branch must be feat/*, got '$branch'" >&2; exit 2; }
dev_ref=github/dev
remove   # idempotent: start from nothing

git -C "$top" fetch -q github dev
git -C "$top" fetch -q github "$branch:$branch" 2>/dev/null || {
  # Refused when the local branch is ahead or diverged; only fine if it is not behind the remote.
  git -C "$top" merge-base --is-ancestor "github/$branch" "$branch" 2>/dev/null ||
    { echo "verify-worktree: local $branch cannot be fast-forwarded to github/$branch" >&2; exit 1; }
}

git -C "$top" worktree add -q -b "$tmp_branch" "$wt" "$branch"
integration_head="$(git -C "$wt" rev-parse HEAD)"
dev_head="$(git -C "$top" rev-parse "$dev_ref")"
merged=no
if ! git -C "$wt" merge-base --is-ancestor "$dev_head" HEAD; then
  if git -C "$wt" merge --no-edit -q "$dev_head" >/dev/null 2>&1; then
    merged=yes
  else
    git -C "$wt" merge --abort 2>/dev/null || true
    echo "CONFLICT merging $dev_ref ($dev_head) into $branch; not resolved here" >&2
    remove
    exit 3
  fi
fi

echo "WORKTREE=$wt"
echo "INTEGRATION_HEAD=$integration_head"
echo "DEV_HEAD=$dev_head"
echo "MERGED=$merged"
