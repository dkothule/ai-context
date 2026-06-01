#!/usr/bin/env bash
# AI Context — Codex Stop hook
# Reminds the agent to create a session log for today before ending.
#
# Codex docs: Stop hooks REQUIRE JSON on stdout — plain text is invalid.
# Output format: {"continue": true, "systemMessage": "..."} surfaces an
# advisory message and lets the turn end normally. Empty stdout (when a log
# already exists) is also valid and treated as silent success.
#
# Defensive cd: Codex may start in a subdirectory. Resolve the repo root via
# git so `.ai-context/sessions/` is found regardless of invocation cwd.

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

SESSIONS_DIR=".ai-context/sessions"
TODAY="$(date +%Y-%m-%d)"

if [[ ! -d "$SESSIONS_DIR" ]]; then
  exit 0
fi

found="$(find "$SESSIONS_DIR" -maxdepth 1 -name "${TODAY}-*.md" ! -name "_template.md" ! -name "*-precompact-autosave.md" -print -quit 2>/dev/null || true)"

if [[ -n "$found" ]]; then
  exit 0
fi

msg="REMINDER: No session log found for ${TODAY}. Create one at ${SESSIONS_DIR}/${TODAY}-<topic>.md using the template at ${SESSIONS_DIR}/_template.md before ending the session."

# JSON-escape (backslash and double-quote) — paths and dates here don't
# normally contain special chars but escaping keeps output safe.
esc="${msg//\\/\\\\}"
esc="${esc//\"/\\\"}"

printf '{"continue":true,"systemMessage":"%s"}\n' "$esc"
exit 0
