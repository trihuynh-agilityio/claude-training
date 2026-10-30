#!/usr/bin/env bash
# PreToolUse hook (Bash): a second layer behind the deny rules in settings.json.
# Blocks `git push` when any destination ref is dev or main; every other branch may be pushed. Exit 2 blocks the call.

input="$(cat)"
command="$(jq -r '.tool_input.command // empty' <<<"$input")"
cwd="$(jq -r '.cwd // empty' <<<"$input")"
[[ -n "$command" ]] || exit 0

block() {
  echo "Blocked: $1" >&2
  exit 2
}

# Only look at real `git push` invocations (start of the command or after ; & |), not text that mentions them.
push_re='(^|[;&|])[[:space:]]*git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push([[:space:]]|$)'
grep -Eq -- "$push_re" <<<"$command" || exit 0

# Take the text after `push` up to the next command separator.
args="$(grep -Eo -- 'git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push.*' <<<"$command" | head -1 | sed -E 's/^git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push//; s/[;&|].*$//')"

current_branch() {
  if [[ -n "$cwd" && -d "$cwd" ]]; then git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null
  else git rev-parse --abbrev-ref HEAD 2>/dev/null; fi
}

positional=()
for tok in $args; do
  case "$tok" in
    --all | --mirror) block "git push $tok can push dev or main; push one branch by name." ;;
    -*) ;;
    *) positional+=("$tok") ;;
  esac
done

# First positional is the remote; the rest are refspecs.
refspecs=("${positional[@]:1}")
if ((${#refspecs[@]} == 0)); then
  refspecs=("$(current_branch)")
fi

for spec in "${refspecs[@]}"; do
  dest="${spec#+}"
  dest="${dest##*:}"
  dest="${dest#refs/heads/}"
  [[ "$dest" == "HEAD" ]] && dest="$(current_branch)"
  [[ -n "$dest" ]] || block "git push target is unknown; push one branch by name."
  [[ "$dest" == dev || "$dest" == main ]] && block "never push dev or main (got '$dest'); push a feature branch and open a PR."
done

exit 0
