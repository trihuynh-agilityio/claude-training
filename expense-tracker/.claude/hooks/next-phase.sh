#!/usr/bin/env bash
# Stop hook: when a phase finished and was not handed off yet, block the stop once and tell
# Claude to run the next skill. State: one file per feature, .claude/workflow/<feature>/state.json
# (the older single .claude/workflow/state.json is still read). The table:
#   plan       / done / handed_off=false -> design-feature       (Phase 1 -> Phase 2)
#   design     / done / handed_off=false -> write-plan           (Phase 2 -> Phase 3)
#   write-plan / done / handed_off=false -> create-task-issues   (asks the user to approve the plan)
#   tasks      / done / handed_off=false -> build-feature        (runs after the plan approval, no user command)
#   build      / done / handed_off=false -> verify-feature       (build-feature sets this only after every task PR is merged and the final PR is open)
# Anything else (build in progress, waiting_review, blocked, verify, done) never advances.
# With several features ready, the one whose state changed first goes now, the next at the next stop.
# Appends one line per run to .claude/workflow/hook.log. Any problem allows the stop.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="$ROOT/.claude/workflow"
LOG="$DIR/hook.log"

input="$(cat)"
mkdir -p "$DIR" 2>/dev/null

log() { printf '%s decision=%s %s\n' "$(date '+%F %T')" "$1" "${2:-}" >>"$LOG" 2>/dev/null; }

command -v jq >/dev/null 2>&1 || { log "allow:no-jq"; exit 0; }
[[ "$(jq -r '.stop_hook_active // false' <<<"$input" 2>/dev/null)" == "true" ]] && { log "allow:stop-hook-active"; exit 0; }

# The ready state files, oldest change first.
ready=""
while IFS= read -r f; do
  [[ "$(jq -r 'select(.status == "done" and .handed_off == false) | .phase' "$f" 2>/dev/null)" =~ ^(plan|design|write-plan|tasks|build)$ ]] \
    && { ready="$f"; break; }
done < <(ls -tr "$DIR"/*/state.json "$DIR"/state.json 2>/dev/null)
[[ -n "$ready" ]] || { log "allow:not-ready"; exit 0; }

state="$(tr -d '\n' <"$ready")"
feature="$(jq -r '.feature // empty' "$ready")"
case "$(jq -r '.phase' "$ready")" in
  plan) next="design-feature"; from="Phase 1 (Plan)"; to="Phase 2 (Design)" ;;
  design) next="write-plan"; from="Phase 2 (Design)"; to="the plan" ;;
  write-plan) next="create-task-issues"; from="The plan"; to="the task issues" ;;
  tasks) next="build-feature"; from="Creating the task issues"; to="the build" ;;
  build) next="verify-feature"; from="Phase 3 (Build)"; to="Phase 4 (Verify)" ;;
esac
[[ -n "$feature" ]] || { log "allow:no-feature" "state=$state"; exit 0; }

# Mark the hand-off before blocking so a second Stop can never repeat it.
tmp="$(mktemp)"
if jq -c '.handed_off = true' "$ready" >"$tmp" 2>/dev/null; then
  mv "$tmp" "$ready"
else
  rm -f "$tmp"
  log "allow:state-write-failed" "state=$state"
  exit 0
fi

log "block:handoff-to-$next" "state=$state"
jq -n --arg r "$from is done for \"$feature\". Start $to now: invoke the $next skill with the argument \"$feature\"." \
  '{decision: "block", reason: $r}'
exit 0
