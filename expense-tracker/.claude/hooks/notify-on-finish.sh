#!/usr/bin/env bash
# Stop hook: show a macOS notification when Claude finishes responding.
# Never blocks; silently does nothing off macOS.

command -v osascript >/dev/null 2>&1 || exit 0

osascript -e 'display notification "Claude finished responding" with title "expense-tracker" sound name "Glass"' >/dev/null 2>&1

exit 0
