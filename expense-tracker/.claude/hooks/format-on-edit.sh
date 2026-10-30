#!/usr/bin/env bash
# PostToolUse hook: format the file Claude just wrote or edited.
# Ruff for backend Python, Prettier for frontend files. Never blocks the edit.
# Works in this checkout and in task worktrees (<repo root>/.claude/worktrees/<name>/expense-tracker/,
# or the same under this project's .claude/worktrees/), where the implementer edits.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOP="$(dirname "$ROOT")"

file="$(jq -r '.tool_input.file_path // empty')"
[[ -n "$file" && -f "$file" ]] || exit 0

# The expense-tracker/ folder the file belongs to.
case "$file" in
  "$ROOT"/.claude/worktrees/*/expense-tracker/* | "$TOP"/.claude/worktrees/*/expense-tracker/*)
    base="${file%%/.claude/worktrees/*}"
    rest="${file#"$base"/.claude/worktrees/}"
    proj="$base/.claude/worktrees/${rest%%/*}/expense-tracker"
    ;;
  "$ROOT"/.claude/*) exit 0 ;;
  "$ROOT"/*) proj="$ROOT" ;;
  *) exit 0 ;;
esac

case "${file#"$proj"/}" in
  backend/.venv/*) ;;
  backend/*.py)
    # Ruff reads the pyproject.toml nearest the file, so the main checkout's ruff is fine for a worktree.
    uv run --quiet --directory "$ROOT/backend" ruff format "$file" >&2 \
      || echo "format-on-edit: ruff failed on $file" >&2
    ;;
  frontend/node_modules/* | frontend/dist/*) ;;
  frontend/*.ts | frontend/*.tsx | frontend/*.js | frontend/*.jsx | \
  frontend/*.css | frontend/*.json | frontend/*.html | frontend/*.md)
    prettier="$proj/frontend/node_modules/.bin/prettier"
    [[ -x "$prettier" ]] || prettier="$ROOT/frontend/node_modules/.bin/prettier"
    [[ -x "$prettier" ]] || exit 0
    # From the project's frontend/, so its .prettierrc.json and .prettierignore apply.
    (cd "$proj/frontend" && "$prettier" --write --log-level warn "$file" >&2) \
      || echo "format-on-edit: prettier failed on $file" >&2
    ;;
esac

exit 0
