#!/usr/bin/env bash
# AI Context — Cursor sessionEnd hook
# Reminds the agent to create a session log for today before ending.
# Always exits 0 — advisory only.
# Expects CWD = project root (Cursor sets this automatically).

set -euo pipefail

# Resolve the repo root so .ai-context/ paths work even if CWD is a subdir.
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

SESSIONS_DIR=".ai-context/sessions"
TODAY="$(date +%Y-%m-%d)"

if [[ ! -d "$SESSIONS_DIR" ]]; then
  exit 0
fi

found="$(find "$SESSIONS_DIR" -maxdepth 1 -name "${TODAY}-*.md" ! -name "_template.md" ! -name "*-precompact-autosave.md" -print -quit 2>/dev/null || true)"

if [[ -z "$found" ]]; then
  echo "REMINDER: No session log found for $TODAY. Create one at $SESSIONS_DIR/${TODAY}-<topic>.md using the template at $SESSIONS_DIR/_template.md before ending the session."
  exit 0
fi
