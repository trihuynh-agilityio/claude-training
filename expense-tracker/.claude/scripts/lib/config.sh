# Shared helpers for the workflow scripts and hooks. Source it; it reads .claude/workflow.json.
#   source "<project>/.claude/scripts/lib/config.sh"
# Sets:
#   WF_PROJECT  the project folder of this checkout (the folder that holds .claude/)
#   WF_CONFIG   its workflow.json
#   WF_TOP      the main repository root (also right when called from a worktree)
#   WF_PREFIX   the project's path inside the repository, with a trailing slash, or "" at the root
# Needs jq. Every value that differs between projects comes from workflow.json, never from here.

WF_PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
WF_CONFIG="$WF_PROJECT/.claude/workflow.json"

command -v jq >/dev/null 2>&1 || { echo "workflow: jq is required" >&2; return 2 2>/dev/null || exit 2; }
[[ -f "$WF_CONFIG" ]] || { echo "workflow: $WF_CONFIG not found (see .claude/WORKFLOW.md)" >&2; return 2 2>/dev/null || exit 2; }

WF_TOP="$(cd "$(git -C "$WF_PROJECT" rev-parse --path-format=absolute --git-common-dir)/.." && pwd)"
WF_PREFIX="${WF_PROJECT#"$WF_TOP"}"
WF_PREFIX="${WF_PREFIX#/}"
[[ -n "$WF_PREFIX" ]] && WF_PREFIX="$WF_PREFIX/"

# cfg <jq filter>: one raw value (arrays and objects come out as JSON).
cfg() { jq -r "$1 // empty" "$WF_CONFIG"; }

# wf_fill <template> [key=value ...]: replaces each {key} in the template.
wf_fill() {
  local s="$1" kv
  shift
  for kv in "$@"; do s="${s//\{${kv%%=*}\}/${kv#*=}}"; done
  printf '%s' "$s"
}

# wf_project_in <worktree root>: the project folder inside a worktree of this repository.
wf_project_in() { local p="$1/${WF_PREFIX%/}"; printf '%s' "${p%/}"; }

# wf_worktree_path <branch>: where the workflow keeps that branch's worktree.
wf_worktree_path() { printf '%s/.claude/worktrees/%s' "$WF_TOP" "${1//\//-}"; }

# wf_lane_vars <lane>: key=value lines for the lane's ports, for wf_fill.
wf_lane_vars() {
  jq -r --arg l "$1" '.lanes[$l] // empty | to_entries[] | "\(.key)=\(.value)"' "$WF_CONFIG"
}

# wf_commands <key>: one line per command of commands.<key>, "<dir><TAB><run>".
wf_commands() {
  jq -r --arg k "$1" '.commands[$k] // [] | (if type == "array" then . else [.] end)[] | "\(.dir // ".")\t\(.run)"' "$WF_CONFIG"
}

# wf_format_rule <path inside the project>: the index of the format rule that covers the file, or nothing.
wf_format_rule() {
  local rel="$1" i n dir sub pat hit
  n="$(jq '.format // [] | length' "$WF_CONFIG")"
  for ((i = 0; i < n; i++)); do
    dir="$(jq -r ".format[$i].dir // \".\"" "$WF_CONFIG")"
    if [[ "$dir" == "." ]]; then sub="$rel"; else
      [[ "$rel" == "$dir"/* ]] || continue
      sub="${rel#"$dir"/}"
    fi
    hit=0
    while IFS= read -r pat; do [[ -n "$pat" && "$sub" == $pat ]] && hit=1; done < <(jq -r ".format[$i].match[]?" "$WF_CONFIG")
    ((hit)) || continue
    while IFS= read -r pat; do [[ -n "$pat" && "$sub" == $pat ]] && hit=0; done < <(jq -r ".format[$i].exclude[]?" "$WF_CONFIG")
    ((hit)) && { echo "$i"; return 0; }
  done
  return 1
}
