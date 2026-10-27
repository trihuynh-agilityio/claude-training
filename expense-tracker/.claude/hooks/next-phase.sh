#!/usr/bin/env bash
# Stop hook: when Phase 1 (Plan) finished and was not handed off yet, block the stop once
# and tell Claude to run Phase 2 (design-feature). State: .claude/workflow/state.json.
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

feature="$(jq -r 'select(.phase == "plan" and .status == "done" and .handed_off == false) | .feature' "$STATE" 2>/dev/null)"
[[ -n "$feature" ]] || { log "allow:not-ready"; exit 0; }

# Mark the hand-off before blocking so a second Stop can never repeat it.
tmp="$(mktemp)"
if jq -c '.handed_off = true' "$STATE" >"$tmp" 2>/dev/null; then
  mv "$tmp" "$STATE"
else
  rm -f "$tmp"
  log "allow:state-write-failed"
  exit 0
fi

log "block:handoff-to-design"
jq -n --arg r "Phase 1 (Plan) is done for \"$feature\". Start Phase 2 now: invoke the design-feature skill with the argument \"$feature\"." \
  '{decision: "block", reason: $r}'
exit 0
