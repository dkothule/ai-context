#!/usr/bin/env bash
# AI Context — Codex PostCompact / SessionStart hook
# Fires after Codex compaction or when a Codex session starts. If a
# precompact-autosave exists, inject a context reminder so the session curates
# it into a proper session log.
#
# Codex docs: context-injecting hooks accept either plain text or structured
# JSON with hookSpecificOutput. We use JSON and set hookEventName from stdin
# when Codex provides it.
#
# Defensive cd: Codex may start in a subdirectory. Resolve the repo root via
# git so `.ai-context/sessions/` is found regardless of invocation cwd.
#
set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

SESSIONS_DIR=".ai-context/sessions"
[[ -d "$SESSIONS_DIR" ]] || exit 0

input="$(cat || true)"

extract_field() {
  # $1 = field name. Extracts `"field": "value"` at the top level.
  printf '%s' "$input" | sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
}

event_name="$(extract_field hook_event_name)"
if [[ -z "$event_name" ]]; then
  event_name="$(extract_field hookEventName)"
fi
if [[ -z "$event_name" ]]; then
  event_name="SessionStart"
fi

autosave="$(find "$SESSIONS_DIR" -maxdepth 1 -type f -name "*-precompact-autosave.md" 2>/dev/null | head -1 || true)"
[[ -n "$autosave" ]] || exit 0

# JSON-escape (backslash, double-quote) for embedding in JSON strings.
esc_path="${autosave//\\/\\\\}"
esc_path="${esc_path//\"/\\\"}"
esc_event="${event_name//\\/\\\\}"
esc_event="${esc_event//\"/\\\"}"

context="An autosave from a previous compaction exists at ${esc_path}. Review it, write a proper session log using ${SESSIONS_DIR}/_template.md, preserve source_autosave and local_transcript_ref if present, then delete the autosave."
esc_context="${context//\\/\\\\}"
esc_context="${esc_context//\"/\\\"}"

printf '{"hookSpecificOutput":{"hookEventName":"%s","additionalContext":"%s"}}\n' "$esc_event" "$esc_context"
exit 0
