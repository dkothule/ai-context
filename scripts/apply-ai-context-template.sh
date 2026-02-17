#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/apply-ai-context-template.sh --dry-run /path/to/target-project
  ./scripts/apply-ai-context-template.sh /path/to/target-project

What it does:
  - Copies template context files into the target project:
    .ai-context/, .cursor/, .agent/, .github/, AGENTS.md, CLAUDE.md
  - For .ai-context/sessions/, installs only _template.md (no historical session logs)
  - Backs up existing managed directories before overwrite:
    .ai-context/, .cursor/, .agent/, .github/
  - Detects existing agent instruction files in target root (case-insensitive):
    AGENTS.md, CODEX.md, CLAUDE.md
  - Moves existing instruction files into a timestamped backup folder before install
EOF
}

DRY_RUN=0
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -n|--dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ ${#POSITIONAL_ARGS[@]} -ne 1 ]]; then
  usage
  exit 1
fi

TARGET_INPUT="${POSITIONAL_ARGS[0]}"
if [[ "$TARGET_INPUT" = /* ]]; then
  TARGET_DIR="$TARGET_INPUT"
else
  TARGET_DIR="$PWD/$TARGET_INPUT"
fi
TARGET_DIR="${TARGET_DIR%/}"

if [[ "$DRY_RUN" -eq 0 ]]; then
  mkdir -p "$TARGET_DIR"
  TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
fi

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
    local rel_path="${file_path#$TARGET_DIR/}"
    local backup_path="$BACKUP_DIR/$rel_path"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would back up and remove: $file_path -> $backup_path"
    else
      mkdir -p "$(dirname "$backup_path")"
      mv "$file_path" "$backup_path"
      echo "Backed up and removed: $file_path"
    fi
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
  fi
}

backup_path_snapshot() {
  local path="$1"
  if [[ -e "$path" ]]; then
    local rel_path="${path#$TARGET_DIR/}"
    local backup_path="$BACKUP_DIR/$rel_path"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would snapshot existing path: $path -> $backup_path"
    else
      mkdir -p "$(dirname "$backup_path")"
      cp -R "$path" "$backup_path"
      echo "Backed up existing path: $path"
    fi
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
  fi
}

echo "Scanning for existing root instruction files..."
if [[ -d "$TARGET_DIR" ]]; then
  while IFS= read -r -d '' existing_file; do
    backup_file "$existing_file"
  done < <(
    find "$TARGET_DIR" -maxdepth 1 -type f \
      \( -iname "agents.md" -o -iname "codex.md" -o -iname "claude.md" \) -print0
  )
else
  echo "Target directory does not exist yet: $TARGET_DIR"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Would create directory: $TARGET_DIR"
  fi
fi

echo "Backing up existing managed directories..."
backup_path_snapshot "$TARGET_DIR/.ai-context"
backup_path_snapshot "$TARGET_DIR/.cursor"
backup_path_snapshot "$TARGET_DIR/.agent"
backup_path_snapshot "$TARGET_DIR/.github"

copy_dir() {
  local rel_path="$1"
  local src="$TEMPLATE_ROOT/$rel_path"
  local dst="$TARGET_DIR/$rel_path"
  if [[ -d "$src" ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would update directory: $rel_path"
    else
      mkdir -p "$dst"
      cp -R "$src"/. "$dst"/
      echo "Updated directory: $rel_path"
    fi
  fi
}

copy_file() {
  local rel_path="$1"
  local src="$TEMPLATE_ROOT/$rel_path"
  local dst="$TARGET_DIR/$rel_path"
  if [[ -f "$src" ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would install file: $rel_path"
    else
      cp "$src" "$dst"
      echo "Installed file: $rel_path"
    fi
  fi
}

copy_ai_context() {
  local src="$TEMPLATE_ROOT/.ai-context"
  local dst="$TARGET_DIR/.ai-context"
  if [[ -d "$src" ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would update directory: .ai-context (sessions history excluded; _template.md installed)"
    else
      mkdir -p "$dst"
      # Copy all context files except sessions/ history.
      tar -C "$src" --exclude="./sessions" -cf - . | tar -C "$dst" -xf -
      mkdir -p "$dst/sessions"
      if [[ -f "$src/sessions/_template.md" ]]; then
        cp "$src/sessions/_template.md" "$dst/sessions/_template.md"
      fi
      echo "Updated directory: .ai-context (sessions history excluded; _template.md installed)"
    fi
  fi
}

copy_ai_context
copy_dir ".cursor"
copy_dir ".agent"
copy_dir ".github"
copy_file "AGENTS.md"
copy_file "CLAUDE.md"

echo
if [[ "$BACKUP_COUNT" -gt 0 ]]; then
  echo "Existing managed files/directories were backed up to:"
  echo "  $BACKUP_DIR"
else
  echo "No existing managed files/directories found to back up."
fi
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run completed for:"
else
  echo "Template applied successfully to:"
fi
echo "  $TARGET_DIR"
