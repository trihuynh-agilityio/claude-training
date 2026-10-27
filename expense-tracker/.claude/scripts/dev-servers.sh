#!/usr/bin/env bash
# Start or stop the dev servers (backend + frontend) of one UI-check lane, from a task worktree.
#   dev-servers.sh start <A|B> <worktree-path>
#   dev-servers.sh stop  <A|B>
# Lane A: frontend 5181, backend 8081. Lane B: frontend 5182, backend 8082.
# Each lane gets its own temp database and state folder, so two lanes never collide.
# Ports are the fixed lane ports in CLAUDE.md; they are not the 5173/8000 dev ports.

action="${1:-}"
lane="${2:-}"
wt="${3:-}"

case "$lane" in
  A) fe=5181; be=8081 ;;
  B) fe=5182; be=8082 ;;
  *) echo "usage: dev-servers.sh start <A|B> <worktree-path> | stop <A|B>" >&2; exit 2 ;;
esac

state="${TMPDIR:-/tmp}/ui-lane-$lane"

listeners() { lsof -ti ":$1" -sTCP:LISTEN 2>/dev/null; }

stop() {
  local f p pids
  for f in "$state/backend.pid" "$state/frontend.pid"; do
    [[ -f "$f" ]] && kill "$(cat "$f")" 2>/dev/null
  done
  for p in "$be" "$fe"; do
    pids="$(listeners "$p")"
    [[ -n "$pids" ]] && kill $pids 2>/dev/null
  done
  sleep 1
  for p in "$be" "$fe"; do
    pids="$(listeners "$p")"
    [[ -n "$pids" ]] && kill -9 $pids 2>/dev/null
  done
  echo "lane $lane stopped (ports $fe and $be)"
}

start() {
  [[ -d "$wt/expense-tracker/frontend" ]] || { echo "worktree '$wt' has no expense-tracker/frontend" >&2; exit 2; }
  local p
  for p in "$be" "$fe"; do
    [[ -n "$(listeners "$p")" ]] && { echo "port $p is already in use; stop it first" >&2; exit 1; }
  done
  rm -rf "$state"
  mkdir -p "$state"

  # exec + redirects: the servers must not keep this script's stdout open, or callers wait for them.
  (cd "$wt/expense-tracker/backend" \
    && EXPENSE_DB_PATH="$state/ui-check.db" exec nohup uv run fastapi dev app/main.py --port "$be" >"$state/backend.log" 2>&1 </dev/null) &
  echo $! >"$state/backend.pid"
  (cd "$wt/expense-tracker/frontend" \
    && API_TARGET="http://localhost:$be" exec nohup npm run dev -- --port "$fe" --strictPort >"$state/frontend.log" 2>&1 </dev/null) &
  echo $! >"$state/frontend.pid"

  local i
  for i in $(seq 1 60); do
    if curl -sf "http://localhost:$be/api/health" >/dev/null && curl -sf "http://localhost:$fe/" >/dev/null; then
      echo "lane $lane ready: http://localhost:$fe/ (api on $be, database $state/ui-check.db)"
      return 0
    fi
    sleep 1
  done
  echo "lane $lane was not ready after 60 s; see $state/backend.log and $state/frontend.log" >&2
  stop
  exit 1
}

case "$action" in
  start) start ;;
  stop) stop ;;
  *) echo "usage: dev-servers.sh start <A|B> <worktree-path> | stop <A|B>" >&2; exit 2 ;;
esac
