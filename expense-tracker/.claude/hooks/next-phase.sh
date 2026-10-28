#!/usr/bin/env bash
# Stop hook: when a phase finished and was not handed off yet, block the stop once and tell
# Claude to run the next skill. State: .claude/workflow/state.json. The table:
#   plan       / done / handed_off=false -> design-feature       (Phase 1 -> Phase 2)
#   design     / done / handed_off=false -> write-plan           (Phase 2 -> Phase 3)
#   write-plan / done / handed_off=false -> create-task-issues   (asks the user to approve the plan)
# Anything else (tasks, build, waiting_review, blocked, done) never advances: build-feature is user-run.
# Appends one line per run to .claude/workflow/hook.log. Any problem allows the stop.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="$ROOT/.claude/workflow"
STATE="$DIR/state.json"
LOG="$DIR/hook.log"

input="$(cat)"
mkdir -p "$DIR" 2>/dev/null

state=""
[[ -f "$STATE" ]] && state="$(tr -d '\n' <"$STATE")"
log() { printf '%s decision=%s state=%s\n' "$(date '+%F %T')" "$1" "${state:-none}" >>"$LOG" 2>/dev/null; }

command -v jq >/dev/null 2>&1 || { log "allow:no-jq"; exit 0; }
[[ -f "$STATE" ]] || { log "allow:no-state"; exit 0; }
[[ "$(jq -r '.stop_hook_active // false' <<<"$input" 2>/dev/null)" == "true" ]] && { log "allow:stop-hook-active"; exit 0; }

row="$(jq -r 'select(.status == "done" and .handed_off == false) | [.feature, .phase] | @tsv' "$STATE" 2>/dev/null)"
feature="${row%%$'\t'*}"
phase="${row#*$'\t'}"
case "$phase" in
  plan) next="design-feature"; from="Phase 1 (Plan)"; to="Phase 2 (Design)" ;;
  design) next="write-plan"; from="Phase 2 (Design)"; to="the plan" ;;
  write-plan) next="create-task-issues"; from="The plan"; to="the task issues" ;;
  *) next="" ;;
esac
[[ -n "$feature" && -n "$next" ]] || { log "allow:not-ready"; exit 0; }

# Mark the hand-off before blocking so a second Stop can never repeat it.
tmp="$(mktemp)"
if jq -c '.handed_off = true' "$STATE" >"$tmp" 2>/dev/null; then
  mv "$tmp" "$STATE"
else
  rm -f "$tmp"
  log "allow:state-write-failed"
  exit 0
fi

log "block:handoff-to-$next"
jq -n --arg r "$from is done for \"$feature\". Start $to now: invoke the $next skill with the argument \"$feature\"." \
  '{decision: "block", reason: $r}'
exit 0
