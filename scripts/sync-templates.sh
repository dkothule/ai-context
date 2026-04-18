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

# .ai-context/ → templates/ai-context/
#
# Only tool-owned files are synced from root. Project-owned template files
# (project.*.md, standards/project.{rules,workflow}.md) are HAND-MAINTAINED
# as generic placeholders in the template tree and preserved here.
#
# Tool-owned (synced from root):
#   - manifest.json (normalized)
#   - README.md
#   - standards/project.rules.base.md
#   - standards/project.workflow.base.md
#   - standards/README.md
#   - sessions/_template.md
#   - sessions/_archive/README.md
#   - plans/_template.md
#
# Project-owned (kept generic in template, NOT copied from root):
#   - project.overview.md, project.tasks.md, project.decisions.md,
#     project.backlog.md, project.changelog.md, project.structure.md
#   - standards/project.rules.md, standards/project.workflow.md
#
TOOL_OWNED_PATHS=(
  "README.md"
  "manifest.json"
  "project.overview.md.template"
  "standards/project.rules.base.md"
  "standards/project.workflow.base.md"
  "standards/README.md"
  "sessions/_template.md"
  "sessions/_archive/README.md"
  "plans/_template.md"
  "logs/README.md"
)

if $DRY_RUN; then
  echo "  [dry-run] sync tool-owned .ai-context files -> templates/ai-context"
  for rel in "${TOOL_OWNED_PATHS[@]}"; do
    echo "    [dry-run] cp $REPO_ROOT/.ai-context/$rel -> $DEST/ai-context/$rel"
  done
else
  mkdir -p "$DEST/ai-context" "$DEST/ai-context/standards" "$DEST/ai-context/sessions/_archive" "$DEST/ai-context/plans" "$DEST/ai-context/logs"
  for rel in "${TOOL_OWNED_PATHS[@]}"; do
    src="$REPO_ROOT/.ai-context/$rel"
    dst="$DEST/ai-context/$rel"
    if [[ -f "$src" ]]; then
      mkdir -p "$(dirname "$dst")"
      cp "$src" "$dst"
    else
      echo "  WARN: tool-owned path missing at source: $rel"
    fi
  done
  # Keep .gitkeep stubs so git tracks the dirs in the packaged tarball
  : > "$DEST/ai-context/sessions/_archive/.gitkeep" 2>/dev/null || true
  # Normalize template manifest:
  # - version  ← derived from packages/cli/package.json (single source of truth)
  # - managed_by ← derived from package.json name field (also single source)
  # - all install-specific fields nulled
  node -e "
    const fs = require('fs');
    const path = '$DEST/ai-context/manifest.json';
    const pkgPath = '$REPO_ROOT/packages/cli/package.json';
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const m = JSON.parse(fs.readFileSync(path, 'utf8'));
    m.version = pkg.version;
    m.managed_by = 'npm:' + pkg.name;
    m.installed_at = null;
    m.apply_mode = 'source-tree';
    m.agents_installed = null;
    m.previous_version = null;
    m.previous_schema_version = null;
    fs.writeFileSync(path, JSON.stringify(m, null, 2) + '\n');
    console.log('    Template manifest: version=' + m.version + ', managed_by=' + m.managed_by);
  "
  echo "  Synced tool-owned .ai-context files -> templates/ai-context (project-owned files preserved)"
fi

# .ai-context-setup/ is NOT bundled in the npm package (setup prompts are in src/setup-prompts/)
copy_dir "$REPO_ROOT/.cursor"           "cursor"
copy_dir "$REPO_ROOT/.agent"            "agent"
# .github/ is NOT synced — workflows/ is this repo's CI (not a target-project template),
# and copilot-instructions.md was removed in v1.1.0 (see backlog: future command to
# generate a self-contained copilot-instructions.md from .ai-context standards).
$DRY_RUN || rm -rf "$DEST/github"
copy_dir "$REPO_ROOT/.claude"           "claude"
# Remove user-local settings that should not be bundled
$DRY_RUN || rm -f "$DEST/claude/settings.local.json"
copy_file "$REPO_ROOT/AGENTS.md"        "AGENTS.md"
copy_file "$REPO_ROOT/CLAUDE.md"        "CLAUDE.md"

echo "Done."
