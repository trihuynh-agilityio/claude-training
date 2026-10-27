#!/usr/bin/env bash
# Prints CODE_HEAD: the latest commit that changes any file outside the review reports
# (docs/features/*/reviews/**) and the UI-check evidence (docs/features/*/evidence/**).
# Those two are committed with a task, so HEAD moves without the code changing; every gate
# compares against CODE_HEAD instead of HEAD.
#   code-head.sh [base]    run inside a task worktree; with a base, only commits in base..HEAD count

base="${1:-}"
range="HEAD"
[[ -n "$base" ]] && range="$base..HEAD"

head="$(git log -1 --format=%H "$range" -- ':(top)' \
  ':(top,exclude,glob)**/docs/features/*/reviews/**' \
  ':(top,exclude,glob)**/docs/features/*/evidence/**')"

[[ -n "$head" ]] || { echo "code-head: no code commit found in $range" >&2; exit 1; }
echo "$head"
