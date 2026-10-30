#!/usr/bin/env bash
# Mechanical checks of verify-feature, run in order and one at a time (shared DB and ports are never
# used in parallel). Every step runs even if an earlier one failed.
#   verify-checks.sh <project-dir-in-worktree> <log-dir> <acceptance-test-file>...
# <project-dir-in-worktree> is the expense-tracker/ folder inside the verify worktree; acceptance
# files are paths relative to frontend/. Full logs go to <log-dir>; <log-dir>/checks.tsv has one row
# per step: <step> <exit-code> <seconds> <log-file>. <log-dir>/acceptance.json is the Vitest JSON report
# of the acceptance files (test names carry the R ids). Exit 0 if every step passed, else 1.

proj="${1:-}"; logs="${2:-}"; shift 2 2>/dev/null
[[ -d "$proj/frontend" && -n "$logs" && $# -ge 1 ]] || {
  echo "usage: verify-checks.sh <project-dir-in-worktree> <log-dir> <acceptance-test-file>..." >&2; exit 2; }
mkdir -p "$logs"
logs="$(cd "$logs" && pwd)"   # absolute: the steps run in other folders (vitest's --outputFile included)
tsv="$logs/checks.tsv"; : >"$tsv"
failed=0

run() {  # run <step> <dir> <command...>
  local step="$1" dir="$2"; shift 2
  local log="$logs/$step.log" start=$SECONDS code
  (cd "$dir" && "$@") >"$log" 2>&1; code=$?
  printf '%s\t%s\t%s\t%s\n' "$step" "$code" "$((SECONDS - start))" "$log" >>"$tsv"
  ((code == 0)) || failed=1
  echo "$step exit=$code"
}

fe="$proj/frontend"; be="$proj/backend"
run install-frontend "$fe" npm ci --prefer-offline
run install-backend "$be" uv sync
run build "$fe" npm run build          # tsc -b (type check, test files included), then vite build
run lint "$fe" npm run lint
run unit-frontend "$fe" npm test
run unit-backend "$be" uv run pytest
run acceptance "$fe" npm test -- --reporter=json --outputFile="$logs/acceptance.json" "$@"

exit "$failed"
