#!/usr/bin/env bash
# PostToolUse hook: format the file Claude just wrote or edited.
# Ruff for backend Python, Prettier for frontend files. Never blocks the edit.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

file="$(jq -r '.tool_input.file_path // empty')"
[[ -n "$file" && -f "$file" ]] || exit 0

case "$file" in
  "$ROOT"/backend/.venv/*) ;;
  "$ROOT"/backend/*.py)
    uv run --quiet --directory "$ROOT/backend" ruff format "$file" >&2 \
      || echo "format-on-edit: ruff failed on $file" >&2
    ;;
  "$ROOT"/frontend/node_modules/* | "$ROOT"/frontend/dist/*) ;;
  "$ROOT"/frontend/*.ts | "$ROOT"/frontend/*.tsx | "$ROOT"/frontend/*.js | "$ROOT"/frontend/*.jsx | \
  "$ROOT"/frontend/*.css | "$ROOT"/frontend/*.json | "$ROOT"/frontend/*.html | "$ROOT"/frontend/*.md)
    prettier="$ROOT/frontend/node_modules/.bin/prettier"
    [[ -x "$prettier" ]] || exit 0
    "$prettier" --write --log-level warn "$file" >&2 \
      || echo "format-on-edit: prettier failed on $file" >&2
    ;;
esac

exit 0
