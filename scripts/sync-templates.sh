#!/usr/bin/env bash
# sync-templates.sh
# Copies canonical template files from the repo root into packages/cli/src/templates/.
# Run this before `npm publish` from packages/cli/.
# Usage: ./scripts/sync-templates.sh [--dry-run]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$REPO_ROOT/packages/cli/src/templates"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

copy_dir() {
  local src="$1" dst_name="$2"
  local dst="$DEST/$dst_name"
  if $DRY_RUN; then
    echo "  [dry-run] cp -R $src -> $dst"
  else
    rm -rf "$dst"
    cp -R "$src" "$dst"
    echo "  Synced $src -> $dst"
  fi
}

copy_file() {
  local src="$1" dst_name="$2"
  local dst="$DEST/$dst_name"
  if $DRY_RUN; then
    echo "  [dry-run] cp $src -> $dst"
  else
    cp "$src" "$dst"
    echo "  Synced $src -> $dst"
  fi
}

echo "Syncing templates from repo root to packages/cli/src/templates/ ..."

$DRY_RUN || mkdir -p "$DEST"

# .ai-context/ → templates/ai-context/  (exclude session logs, keep _template.md)
if $DRY_RUN; then
  echo "  [dry-run] sync .ai-context -> templates/ai-context (excluding sessions/*.md except _template.md)"
else
  rm -rf "$DEST/ai-context"
  cp -R "$REPO_ROOT/.ai-context" "$DEST/ai-context"
  # Remove historical session logs but keep _template.md
  find "$DEST/ai-context/sessions" -name "*.md" ! -name "_template.md" -delete 2>/dev/null || true
  # Remove historical plan files but keep _template.md
  find "$DEST/ai-context/plans" -name "*.md" ! -name "_template.md" -delete 2>/dev/null || true
  echo "  Synced .ai-context -> templates/ai-context"
fi

# .ai-context-setup/ is NOT bundled in the npm package (setup prompts are in src/setup-prompts/)
copy_dir "$REPO_ROOT/.cursor"           "cursor"
copy_dir "$REPO_ROOT/.agent"            "agent"
copy_dir "$REPO_ROOT/.github"           "github"
copy_dir "$REPO_ROOT/.claude"           "claude"
# Remove user-local settings that should not be bundled
$DRY_RUN || rm -f "$DEST/claude/settings.local.json"
copy_file "$REPO_ROOT/AGENTS.md"        "AGENTS.md"
copy_file "$REPO_ROOT/CLAUDE.md"        "CLAUDE.md"

echo "Done."
