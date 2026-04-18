#!/usr/bin/env bash
# AI Context — PreCompact hook
# Fires before auto or manual context compaction.
#
# Manual trigger: blocks compaction if no session log has been edited recently
#   (default 30 min, override via AI_CONTEXT_PRECOMPACT_STALENESS_MINUTES).
#   Multiple logs per day are fine — the hook checks freshness, not filename.
#
# Auto trigger: writes a best-effort autosave of the transcript to
#   .ai-context/sessions/YYYY-MM-DD-HHMM-precompact-autosave.md so the working
#   context isn't lost. Compaction then proceeds (exit 0).
#
# Expects CWD = project root (Claude Code sets this automatically).

set -euo pipefail

SESSIONS_DIR=".ai-context/sessions"
STALENESS_MIN="${AI_CONTEXT_PRECOMPACT_STALENESS_MINUTES:-30}"

# Read stdin JSON. We only need `trigger` and `transcript_path`.
input="$(cat || true)"

extract_field() {
  # $1 = field name. Extracts `"field": "value"` at the top level.
  printf '%s' "$input" | sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
}

trigger="$(extract_field trigger)"
transcript_path="$(extract_field transcript_path)"

# Sessions dir may not exist yet (brand-new install) — in that case just allow.
if [[ ! -d "$SESSIONS_DIR" ]]; then
  exit 0
fi

if [[ "$trigger" == "manual" ]]; then
  # Freshness check: is there any non-archive, non-autosave, non-template log
  # modified within the staleness window?
  recent="$(find "$SESSIONS_DIR" -maxdepth 1 -type f -name "*.md" \
    ! -name "_template.md" \
    ! -name "*-precompact-autosave.md" \
    -mmin "-${STALENESS_MIN}" 2>/dev/null | head -1 || true)"

  if [[ -z "$recent" ]]; then
    reason="No recent session log detected (within ${STALENESS_MIN} min). Write a new log for the current topic at ${SESSIONS_DIR}/$(date +%Y-%m-%d)-<topic>.md (multiple logs per day are fine — one per topic), OR if the current topic is already logged, refresh its frontmatter and save. Then run /compact again."
    # JSON-escape the reason
    esc_reason="${reason//\\/\\\\}"
    esc_reason="${esc_reason//\"/\\\"}"
    printf '{"decision":"block","reason":"%s"}' "$esc_reason"
    exit 0
  fi

  # Fresh log exists — allow compaction.
  exit 0
fi

# Auto trigger — write an autosave.
date_str="$(date +%Y-%m-%d)"
time_str="$(date +%H%M)"
autosave="${SESSIONS_DIR}/${date_str}-${time_str}-precompact-autosave.md"

{
  printf -- '---\n'
  printf 'autosaved: true\n'
  printf 'trigger: auto\n'
  printf 'date: %s\n' "$date_str"
  printf 'time: %s\n' "$(date +%H:%M:%S)"
  printf 'transcript_ref: %s\n' "${transcript_path:-unknown}"
  printf -- '---\n\n'
  printf '# Pre-compact autosave\n\n'
  printf 'Context compaction fired automatically. This file preserves a pointer to\n'
  printf 'the full transcript so information is not lost. The agent should review\n'
  printf 'this file in the next turn, write a curated session log using\n'
  printf '`.ai-context/sessions/_template.md`, then delete this autosave.\n\n'
  printf '## Transcript reference\n\nFull transcript (JSONL): `%s`\n\n' "${transcript_path:-unknown}"
} > "$autosave"

if command -v jq >/dev/null 2>&1 && [[ -n "${transcript_path:-}" && -f "$transcript_path" ]]; then
  printf '## Recent turns\n\n' >> "$autosave"
  # Best-effort: dump the last 30 user/assistant messages. Tolerant of schema drift.
  tail -n 60 "$transcript_path" 2>/dev/null \
    | jq -r 'select(.type == "user" or .type == "assistant") | "### " + (.type | ascii_upcase) + "\n" + (if (.message.content | type) == "array" then (.message.content | map(.text // "") | join("\n")) else (.message.content // "") end) + "\n"' 2>/dev/null \
    >> "$autosave" || true
fi

exit 0
