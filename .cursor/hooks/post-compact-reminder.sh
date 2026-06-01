#!/usr/bin/env bash
# AI Context — Cursor sessionStart hook
# Fires when a Cursor session starts. If a precompact-autosave exists from a
# prior compaction, emits a JSON response with `additional_context` so Cursor
# injects the autosave reminder into the agent's session context.
# Schema per https://cursor.com/docs/hooks (sessionStart output):
#   { "additional_context": "string", "env": {...}, "continue": bool, "user_message": "..." }
# Note: snake_case `additional_context` — different from Claude's camelCase.
# Always exits 0. Expects CWD = project root (Cursor sets this automatically).

set -euo pipefail

# Resolve the repo root so .ai-context/ paths work even if CWD is a subdir.
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

SESSIONS_DIR=".ai-context/sessions"
[[ -d "$SESSIONS_DIR" ]] || exit 0

autosave="$(find "$SESSIONS_DIR" -maxdepth 1 -type f -name "*-precompact-autosave.md" 2>/dev/null | head -1 || true)"
[[ -n "$autosave" ]] || exit 0

# JSON-escape backslashes and double-quotes in the autosave path.
escaped_autosave="${autosave//\\/\\\\}"
escaped_autosave="${escaped_autosave//\"/\\\"}"
escaped_sessions="${SESSIONS_DIR//\\/\\\\}"
escaped_sessions="${escaped_sessions//\"/\\\"}"

message="REMINDER: An autosave from the previous compaction exists at ${escaped_autosave}. Review it, write a proper session log using ${escaped_sessions}/_template.md, preserve source_autosave and local_transcript_ref if present, then delete the autosave."

printf '{"additional_context": "%s"}\n' "$message"
exit 0
