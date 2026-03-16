#!/usr/bin/env bash
# AI Context — Stop hook
# Reminds Claude to create a session log for today before ending.
# Always exits 0 — advisory only. The Stop event fires on every turn, so exit 2
# (force-continue) would cause an infinite loop if no log exists yet.
# Expects CWD = project root (Claude Code sets this automatically).

set -euo pipefail

SESSIONS_DIR=".ai-context/sessions"
TODAY="$(date +%Y-%m-%d)"

if [[ ! -d "$SESSIONS_DIR" ]]; then
  exit 0
fi

found="$(find "$SESSIONS_DIR" -maxdepth 1 -name "${TODAY}-*.md" ! -name "_template.md" -print -quit 2>/dev/null || true)"

if [[ -z "$found" ]]; then
  echo "REMINDER: No session log found for $TODAY. Create one at $SESSIONS_DIR/${TODAY}-<topic>.md using the template at $SESSIONS_DIR/_template.md before ending the session."
  exit 0
fi
