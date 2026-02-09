#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/apply-ai-context-template.sh /path/to/target-project

What it does:
  - Copies template context files into the target project:
    .ai-context/, .cursor/, .agent/, AGENTS.md, CLAUDE.MD
  - Detects existing agent instruction files in target root (case-insensitive):
    AGENTS.md, CODEX.md, CLAUDE.md
  - Moves existing instruction files into a timestamped backup folder before install
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

TARGET_INPUT="$1"
mkdir -p "$TARGET_INPUT"
TARGET_DIR="$(cd "$TARGET_INPUT" && pwd)"

if [[ "$TARGET_DIR" == "$TEMPLATE_ROOT" ]]; then
  echo "Error: target project cannot be this template repository."
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$TARGET_DIR/.ai-context-backups/$TIMESTAMP"
BACKUP_COUNT=0

backup_file() {
  local file_path="$1"
  if [[ -f "$file_path" ]]; then
    mkdir -p "$BACKUP_DIR"
    mv "$file_path" "$BACKUP_DIR/"
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
    echo "Backed up: $file_path"
  fi
}

echo "Scanning for existing root instruction files..."
while IFS= read -r -d '' existing_file; do
  backup_file "$existing_file"
done < <(
  find "$TARGET_DIR" -maxdepth 1 -type f \
    \( -iname "agents.md" -o -iname "codex.md" -o -iname "claude.md" \) -print0
)

copy_dir() {
  local rel_path="$1"
  local src="$TEMPLATE_ROOT/$rel_path"
  local dst="$TARGET_DIR/$rel_path"
  if [[ -d "$src" ]]; then
    mkdir -p "$dst"
    cp -R "$src"/. "$dst"/
    echo "Updated directory: $rel_path"
  fi
}

copy_file() {
  local rel_path="$1"
  local src="$TEMPLATE_ROOT/$rel_path"
  local dst="$TARGET_DIR/$rel_path"
  if [[ -f "$src" ]]; then
    cp "$src" "$dst"
    echo "Installed file: $rel_path"
  fi
}

copy_dir ".ai-context"
copy_dir ".cursor"
copy_dir ".agent"
copy_file "AGENTS.md"
copy_file "CLAUDE.MD"

echo
if [[ "$BACKUP_COUNT" -gt 0 ]]; then
  echo "Existing instruction files were backed up to:"
  echo "  $BACKUP_DIR"
else
  echo "No existing AGENTS/CODEX/CLAUDE instruction files found in target root."
fi
echo "Template applied successfully to:"
echo "  $TARGET_DIR"
