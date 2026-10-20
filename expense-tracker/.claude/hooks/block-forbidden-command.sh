#!/usr/bin/env bash
# PreToolUse hook (Bash): block commands that break project rules or are destructive.
# Exit 2 blocks the call and sends the message on stderr back to Claude.

command="$(jq -r '.tool_input.command // empty')"
[[ -n "$command" ]] || exit 0

block() {
  echo "Blocked: $1" >&2
  exit 2
}

matches() { grep -Eq -- "$1" <<<"$command"; }

# Project rules (see CLAUDE.md)
matches '(^|[;&|[:space:]])(pip3?|python3? -m pip)[[:space:]]+(install|uninstall)' \
  && block "use 'uv add' / 'uv run', never pip."
matches '(source|\.)[[:space:]]+[^;&|]*\.venv/bin/activate' \
  && block "use 'uv run', do not activate the venv manually."
matches '(npx|npm exec)[[:space:]]+(--[a-z-]+[[:space:]]+)*eslint' \
  && block "this project lints with oxlint ('npm run lint'), not ESLint."

# Git: never push/merge into main, never force-push
matches 'git[[:space:]]+push([[:space:]]+[^;&|]*)?[[:space:]](--force|--force-with-lease|-f)([[:space:]]|$)' \
  && block "force push is not allowed."
matches 'git[[:space:]]+push([[:space:]]+[^;&|]*)?[[:space:]:](HEAD:)?(refs/heads/)?main([[:space:]]|$)' \
  && block "never push to main; use dayNN/<topic> branches and merge into dev."
if matches 'git[[:space:]]+(push|merge)([[:space:]]|$)'; then
  [[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" == "main" ]] \
    && block "currently on main; never merge or push on main."
fi

# Destructive operations
matches 'rm[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*("?(/|~|\.|\.\.|\$HOME|\$\{HOME\})/?"?)([[:space:]]|$)' \
  && block "rm -rf on /, ~, \$HOME, . or .. is not allowed."
matches 'git[[:space:]]+reset[[:space:]]+[^;&|]*--hard' \
  && block "git reset --hard discards work; ask the user first."
matches 'git[[:space:]]+clean[[:space:]]+[^;&|]*-[a-zA-Z]*f' \
  && block "git clean -f deletes untracked files; ask the user first."
matches '(rm|mv|truncate|>)[^;&|]*expenses\.db' \
  && block "do not delete or overwrite the SQLite database (backend/data/expenses.db)."

exit 0
