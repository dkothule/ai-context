#!/usr/bin/env bash
set -euo pipefail

manifest_string_value() {
  local file_path="$1"
  local key="$2"
  if [[ ! -f "$file_path" ]]; then
    return
  fi
  sed -nE "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\"([^\"]*)\"[,]?[[:space:]]*$/\1/p" "$file_path" | head -n 1
}

manifest_number_value() {
  local file_path="$1"
  local key="$2"
  if [[ ! -f "$file_path" ]]; then
    return
  fi
  sed -nE "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*([0-9]+)[,]?[[:space:]]*$/\1/p" "$file_path" | head -n 1
}

first_manifest_string_value() {
  local file_path="$1"
  shift
  local key
  local value=""
  for key in "$@"; do
    value="$(manifest_string_value "$file_path" "$key")"
    if [[ -n "$value" ]]; then
      printf '%s\n' "$value"
      return
    fi
  done
}

first_manifest_number_value() {
  local file_path="$1"
  shift
  local key
  local value=""
  for key in "$@"; do
    value="$(manifest_number_value "$file_path" "$key")"
    if [[ -n "$value" ]]; then
      printf '%s\n' "$value"
      return
    fi
  done
}

detect_manifest_path() {
  local context_dir="$1"
  if [[ -f "$context_dir/manifest.json" ]]; then
    printf '%s\n' "$context_dir/manifest.json"
    return 0
  fi
  if [[ -f "$context_dir/template.manifest.json" ]]; then
    printf '%s\n' "$context_dir/template.manifest.json"
    return 0
  fi
  return 0
}

usage() {
  cat <<'EOF'
Usage:
  ./scripts/uninstall-ai-context.sh --dry-run /path/to/target-project
  ./scripts/uninstall-ai-context.sh /path/to/target-project

What it does:
  - Backs up current AI Context-managed files before removal:
    .ai-context/, .ai-context-setup/, .cursor/rules/main.mdc, .agent/rules/rules.md,
    .github/copilot-instructions.md, .claude/hooks/, AGENTS.md, CLAUDE.md
  - Removes those AI Context-managed files from the target project
  - Prunes empty parent directories such as .cursor/, .agent/, .github/, and .claude/
  - Leaves unrelated files in .cursor/, .agent/, .github/, and .claude/ untouched
  - Warns if .claude/settings.json still references AI Context hooks (manual cleanup)

Notes:
  - Removed files are backed up to .ai-context-backups/uninstall-<timestamp>/
  - The installed version is read from .ai-context/manifest.json when available
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

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Error: target project directory does not exist: $TARGET_DIR" >&2
  exit 1
fi

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
TARGET_CONTEXT_DIR="$TARGET_DIR/.ai-context"
EXISTING_MANIFEST_PATH="$(detect_manifest_path "$TARGET_CONTEXT_DIR")"
INSTALLED_VERSION="$(first_manifest_string_value "$EXISTING_MANIFEST_PATH" "version" "template_version")"
INSTALLED_SCHEMA_VERSION="$(first_manifest_number_value "$EXISTING_MANIFEST_PATH" "schema_version" "context_schema_version")"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$TARGET_DIR/.ai-context-backups/uninstall-$TIMESTAMP"
BACKUP_COUNT=0
REMOVE_COUNT=0
PRUNE_COUNT=0

MANAGED_PATHS=(
  ".ai-context"
  ".ai-context-setup"
  ".cursor/rules/main.mdc"
  ".agent/rules/rules.md"
  ".github/copilot-instructions.md"
  ".claude/hooks"
  "AGENTS.md"
  "CLAUDE.md"
)

PRUNE_CANDIDATES=(
  ".cursor/rules"
  ".cursor"
  ".agent/rules"
  ".agent"
  ".github"
  ".claude"
)

HAS_MANAGED_PATHS=0
for rel_path in "${MANAGED_PATHS[@]}"; do
  if [[ -e "$TARGET_DIR/$rel_path" ]]; then
    HAS_MANAGED_PATHS=1
    break
  fi
done

if [[ "$HAS_MANAGED_PATHS" -eq 0 ]]; then
  echo "Error: no AI Context-managed files found in: $TARGET_DIR" >&2
  exit 1
fi

backup_and_remove_path() {
  local rel_path="$1"
  local path="$TARGET_DIR/$rel_path"
  if [[ ! -e "$path" ]]; then
    return
  fi

  local backup_path="$BACKUP_DIR/$rel_path"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Would back up and remove: $rel_path -> .ai-context-backups/uninstall-$TIMESTAMP/$rel_path"
  else
    mkdir -p "$(dirname "$backup_path")"
    mv "$path" "$backup_path"
    echo "Backed up and removed: $rel_path"
  fi

  BACKUP_COUNT=$((BACKUP_COUNT + 1))
  REMOVE_COUNT=$((REMOVE_COUNT + 1))
}

prune_empty_directory() {
  local rel_dir="$1"
  local dir="$TARGET_DIR/$rel_dir"
  if [[ ! -d "$dir" ]]; then
    return
  fi

  if find "$dir" -mindepth 1 -print -quit | grep -q .; then
    return
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Would remove empty directory: $rel_dir"
  else
    rmdir "$dir"
    echo "Removed empty directory: $rel_dir"
  fi

  PRUNE_COUNT=$((PRUNE_COUNT + 1))
}

for rel_path in "${MANAGED_PATHS[@]}"; do
  backup_and_remove_path "$rel_path"
done

# If .claude/settings.json exists and contains our hook reference, note it for the user.
# We don't auto-edit settings.json to avoid breaking user config — just remove the hooks dir.
CLAUDE_SETTINGS="$TARGET_DIR/.claude/settings.json"
if [[ -f "$CLAUDE_SETTINGS" ]] && grep -qF 'session-log-check.sh' "$CLAUDE_SETTINGS" 2>/dev/null; then
  echo "Note: .claude/settings.json references AI Context hooks. Remove the Stop hook entry manually."
fi

for rel_dir in "${PRUNE_CANDIDATES[@]}"; do
  prune_empty_directory "$rel_dir"
done

echo
if [[ -n "$INSTALLED_VERSION" ]]; then
  echo "Installed AI Context version: $INSTALLED_VERSION"
else
  echo "Installed AI Context version: unknown"
fi
if [[ -n "$INSTALLED_SCHEMA_VERSION" ]]; then
  echo "Installed schema version: $INSTALLED_SCHEMA_VERSION"
fi
echo "Removed managed items: $REMOVE_COUNT"
echo "Pruned empty directories: $PRUNE_COUNT"
if [[ "$BACKUP_COUNT" -gt 0 ]]; then
  echo "Backup created at:"
  echo "  $BACKUP_DIR"
fi
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run completed for:"
else
  echo "AI Context removed successfully from:"
fi
echo "  $TARGET_DIR"
