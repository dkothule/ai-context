#!/usr/bin/env bash
# AI Context — SessionStart(compact) hook
# Fires on the fresh session after compaction. If a precompact-autosave exists,
# injects a reminder via `additionalContext` so the agent reviews and curates it.
#
# Expects CWD = project root (Claude Code sets this automatically).

set -euo pipefail

SESSIONS_DIR=".ai-context/sessions"
[[ -d "$SESSIONS_DIR" ]] || exit 0

autosave="$(find "$SESSIONS_DIR" -maxdepth 1 -type f -name "*-precompact-autosave.md" 2>/dev/null | head -1 || true)"
[[ -n "$autosave" ]] || exit 0

# JSON-escape the path (backslash, double-quote).
esc_path="${autosave//\\/\\\\}"
esc_path="${esc_path//\"/\\\"}"

context="An autosave from the previous compaction exists at ${esc_path}. Review it, write a proper session log using .ai-context/sessions/_template.md, then delete the autosave."

printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}' "$context"
exit 0
