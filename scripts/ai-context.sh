#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST_REL_PATH=".ai-context/manifest.json"
LEGACY_MANIFEST_REL_PATH=".ai-context/template.manifest.json"
SOURCE_MANIFEST_PATH="$REPO_ROOT/$MANIFEST_REL_PATH"

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

json_string_or_null() {
  local value="${1:-}"
  if [[ -n "$value" ]]; then
    printf '"%s"' "$value"
  else
    printf 'null'
  fi
}

json_number_or_null() {
  local value="${1:-}"
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
  else
    printf 'null'
  fi
}

CURRENT_VERSION="$(first_manifest_string_value "$SOURCE_MANIFEST_PATH" "version")"
CURRENT_SCHEMA_VERSION="$(first_manifest_number_value "$SOURCE_MANIFEST_PATH" "schema_version")"

if [[ -z "$CURRENT_VERSION" || -z "$CURRENT_SCHEMA_VERSION" ]]; then
  echo "Error: could not read AI Context version metadata from $SOURCE_MANIFEST_PATH" >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Usage:
  ./scripts/ai-context.sh --version
  ./scripts/ai-context.sh --dry-run /path/to/target-project
  ./scripts/ai-context.sh /path/to/target-project

What it does:
  - Copies AI Context files into the target project:
    .ai-context/, .ai-context-setup/, .cursor/, .agent/, .github/, AGENTS.md, CLAUDE.md
  - Installs Claude Code hooks (.claude/hooks/) and merges hook config
    into .claude/settings.json (backs up existing settings before merge;
    skips merge if AI Context hooks are already present)
  - Writes installer metadata to .ai-context/manifest.json
  - Removes legacy .ai-context/template.manifest.json if present
  - For .ai-context/sessions/, installs only _template.md (no historical session logs)
  - Backs up existing managed directories before overwrite:
    .ai-context/, .cursor/, .agent/, .github/
  - Restores project-owned .ai-context paths from backup after apply:
    any .ai-context/** file except AI Context-owned files such as README,
    manifest, base standards, project.overview template, and sessions/_template
  - Detects existing agent instruction files in target root (case-insensitive):
    AGENTS.md, CODEX.md, CLAUDE.md
  - Moves existing instruction files into a timestamped backup folder before install
EOF
}

DRY_RUN=0
VERSION_ONLY=0
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
    --version)
      VERSION_ONLY=1
      shift
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ "$VERSION_ONLY" -eq 1 ]]; then
  echo "version=$CURRENT_VERSION"
  echo "schema_version=$CURRENT_SCHEMA_VERSION"
  exit 0
fi

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

if [[ "$TARGET_DIR" == "$REPO_ROOT" ]]; then
  echo "Error: target project cannot be this AI Context repository."
  exit 1
fi

TARGET_CONTEXT_DIR="$TARGET_DIR/.ai-context"
TARGET_MANIFEST_PATH="$TARGET_CONTEXT_DIR/manifest.json"
TARGET_LEGACY_MANIFEST_PATH="$TARGET_CONTEXT_DIR/template.manifest.json"
EXISTING_MANIFEST_PATH="$(detect_manifest_path "$TARGET_CONTEXT_DIR")"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_BASE_DIR="$TARGET_DIR/.ai-context-backups"
BACKUP_DIR="$BACKUP_BASE_DIR/$TIMESTAMP-$$"
if [[ -d "$BACKUP_DIR" ]]; then
  echo "Error: backup directory already exists: $BACKUP_DIR"
  echo "Please retry the operation."
  exit 1
fi
BACKUP_COUNT=0
RESTORE_COUNT=0
HAS_EXISTING_AI_CONTEXT=0
PREVIOUS_VERSION=""
PREVIOUS_SCHEMA_VERSION=""
APPLY_MODE="fresh-install"

if [[ -d "$TARGET_CONTEXT_DIR" ]]; then
  HAS_EXISTING_AI_CONTEXT=1
fi

if [[ -n "$EXISTING_MANIFEST_PATH" ]]; then
  PREVIOUS_VERSION="$(first_manifest_string_value "$EXISTING_MANIFEST_PATH" "version" "template_version")"
  PREVIOUS_SCHEMA_VERSION="$(first_manifest_number_value "$EXISTING_MANIFEST_PATH" "schema_version" "context_schema_version")"
fi

if [[ "$HAS_EXISTING_AI_CONTEXT" -eq 1 ]]; then
  if [[ -n "$PREVIOUS_VERSION" ]]; then
    if [[ "$PREVIOUS_VERSION" == "$CURRENT_VERSION" ]] \
      && [[ "$PREVIOUS_SCHEMA_VERSION" == "$CURRENT_SCHEMA_VERSION" ]]; then
      APPLY_MODE="reapply"
    else
      APPLY_MODE="upgrade"
    fi
  else
    APPLY_MODE="legacy-upgrade"
  fi
fi

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
      BACKUP_COUNT=$((BACKUP_COUNT + 1))
    fi
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
      BACKUP_COUNT=$((BACKUP_COUNT + 1))
    fi
  fi
}

is_ai_context_owned_path() {
  local rel_path="$1"
  case "$rel_path" in
    README.md|manifest.json|template.manifest.json|project.overview.md.template|sessions/_template.md|standards/project.rules.base.md|standards/project.workflow.base.md)
      return 0
      ;;
  esac
  return 1
}

restore_project_owned_context_from_backup() {
  local context_src="$BACKUP_DIR/.ai-context"
  if [[ ! -d "$context_src" ]]; then
    return
  fi

  while IFS= read -r -d '' src_dir; do
    local rel_dir="${src_dir#$context_src/}"
    if [[ "$rel_dir" == "$src_dir" ]]; then
      continue
    fi

    local dst_dir="$TARGET_CONTEXT_DIR/$rel_dir"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would restore project-owned directory: .ai-context/$rel_dir"
    else
      mkdir -p "$dst_dir"
      echo "Restored project-owned directory: .ai-context/$rel_dir"
    fi
    RESTORE_COUNT=$((RESTORE_COUNT + 1))
  done < <(find "$context_src" -mindepth 1 -type d -empty -print0)

  while IFS= read -r -d '' src_file; do
    local rel_path="${src_file#$context_src/}"
    if is_ai_context_owned_path "$rel_path"; then
      continue
    fi
    local dst_rel_path="$rel_path"

    if [[ "$rel_path" == "standards/project.rules.md" ]] \
      && grep -q "^# Project Rules (Authoritative)$" "$src_file" \
      && grep -q "^## 1) Source Of Truth$" "$src_file"; then
      dst_rel_path="standards/project.rules.legacy.md"
    fi
    if [[ "$rel_path" == "standards/project.workflow.md" ]] \
      && grep -q "^# Development Workflow$" "$src_file" \
      && grep -q "^## Git Workflow$" "$src_file" \
      && grep -q "^## Development Cycle$" "$src_file"; then
      dst_rel_path="standards/project.workflow.legacy.md"
    fi

    local dst="$TARGET_CONTEXT_DIR/$dst_rel_path"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      if [[ "$dst_rel_path" != "$rel_path" ]]; then
        echo "Would preserve legacy standards file: .ai-context/$rel_path -> .ai-context/$dst_rel_path"
      else
        echo "Would restore project-owned path: .ai-context/$rel_path"
      fi
    else
      mkdir -p "$(dirname "$dst")"
      cp "$src_file" "$dst"
      if [[ "$dst_rel_path" != "$rel_path" ]]; then
        echo "Preserved legacy standards file: .ai-context/$rel_path -> .ai-context/$dst_rel_path"
      else
        echo "Restored project-owned path: .ai-context/$rel_path"
      fi
    fi
    RESTORE_COUNT=$((RESTORE_COUNT + 1))
  done < <(find "$context_src" -type f -print0)
}

write_manifest() {
  local installed_at
  local installed_at_json
  local apply_mode_json
  local previous_version_json
  local previous_schema_version_json

  installed_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  installed_at_json="$(json_string_or_null "$installed_at")"
  apply_mode_json="$(json_string_or_null "$APPLY_MODE")"
  previous_version_json="$(json_string_or_null "$PREVIOUS_VERSION")"
  previous_schema_version_json="$(json_number_or_null "$PREVIOUS_SCHEMA_VERSION")"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Would write installer manifest: $MANIFEST_REL_PATH"
    return
  fi

  mkdir -p "$(dirname "$TARGET_MANIFEST_PATH")"
  cat > "$TARGET_MANIFEST_PATH" <<EOF
{
  "name": "ai-context",
  "version": "$CURRENT_VERSION",
  "schema_version": $CURRENT_SCHEMA_VERSION,
  "managed_by": "scripts/ai-context.sh",
  "installed_at": $installed_at_json,
  "apply_mode": $apply_mode_json,
  "previous_version": $previous_version_json,
  "previous_schema_version": $previous_schema_version_json
}
EOF
  echo "Wrote installer manifest: $MANIFEST_REL_PATH"
}

remove_legacy_manifest() {
  if [[ -f "$TARGET_LEGACY_MANIFEST_PATH" ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would remove legacy manifest: $LEGACY_MANIFEST_REL_PATH"
    else
      rm -f "$TARGET_LEGACY_MANIFEST_PATH"
      echo "Removed legacy manifest: $LEGACY_MANIFEST_REL_PATH"
    fi
  fi
}

copy_dir() {
  local rel_path="$1"
  local src="$REPO_ROOT/$rel_path"
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
  local src="$REPO_ROOT/$rel_path"
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
  local src="$REPO_ROOT/.ai-context"
  local dst="$TARGET_CONTEXT_DIR"
  if [[ -d "$src" ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would update directory: .ai-context (sessions history excluded; _template.md installed)"
    else
      mkdir -p "$dst"
      tar -C "$src" --exclude="./sessions" -cf - . | tar -C "$dst" -xf -
      mkdir -p "$dst/sessions"
      if [[ -f "$src/sessions/_template.md" ]]; then
        cp "$src/sessions/_template.md" "$dst/sessions/_template.md"
      fi
      echo "Updated directory: .ai-context (sessions history excluded; _template.md installed)"
    fi
  fi
}

install_claude_hooks() {
  local src_hooks_dir="$REPO_ROOT/.claude/hooks"
  local src_settings="$REPO_ROOT/.claude/settings.json"
  local dst_hooks_dir="$TARGET_DIR/.claude/hooks"
  local dst_settings="$TARGET_DIR/.claude/settings.json"

  if [[ ! -d "$src_hooks_dir" ]]; then
    return
  fi

  # Always install the hooks directory (AI Context-owned scripts)
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Would install directory: .claude/hooks"
  else
    mkdir -p "$dst_hooks_dir"
    cp -R "$src_hooks_dir"/. "$dst_hooks_dir"/
    find "$dst_hooks_dir" -maxdepth 1 -type f -name "*.sh" -exec chmod +x {} +
    echo "Installed directory: .claude/hooks"
  fi

  # Merge hooks into existing .claude/settings.json (or create fresh)
  if [[ ! -f "$src_settings" ]]; then
    return
  fi

  if [[ -f "$dst_settings" ]]; then
    # Check if our Stop hook is already present
    if grep -qF 'session-log-check.sh' "$dst_settings" 2>/dev/null; then
      if [[ "$DRY_RUN" -eq 1 ]]; then
        echo "Would skip .claude/settings.json merge (AI Context hooks already present)"
      else
        echo "Skipped .claude/settings.json merge (AI Context hooks already present)"
      fi
      return
    fi

    # If the file already has a top-level "hooks" key (but not our hook), skip to
    # avoid producing invalid JSON with duplicate keys. Instruct manual merge.
    if grep -qE '"hooks"[[:space:]]*:' "$dst_settings" 2>/dev/null; then
      if [[ "$DRY_RUN" -eq 1 ]]; then
        echo "Would skip .claude/settings.json merge (existing \"hooks\" key detected — merge manually)"
      else
        echo "Skipped .claude/settings.json merge: existing \"hooks\" key detected."
        echo "  Add the AI Context Stop hook to .claude/settings.json manually:"
        echo "  See .claude/settings.json in the AI Context source repo for the hook block to add."
      fi
      return
    fi

    # Back up existing settings before merge
    local backup_path="$BACKUP_DIR/.claude/settings.json"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would back up existing .claude/settings.json before merging hooks"
      echo "Would merge AI Context hooks into .claude/settings.json"
    else
      mkdir -p "$(dirname "$backup_path")"
      cp "$dst_settings" "$backup_path"
      echo "Backed up existing .claude/settings.json"
      BACKUP_COUNT=$((BACKUP_COUNT + 1))

      # Merge: read existing file, strip trailing "}", append our hooks block, close.
      # Pure bash — no jq or sed gymnastics. Safe only when no top-level "hooks" key
      # exists (checked above).
      local tmp_merged
      tmp_merged="$(mktemp)"
      local content
      content="$(cat "$dst_settings")"
      # Strip the final closing brace (and any trailing whitespace/newlines)
      content="${content%\}}"
      # If the existing settings file is an empty object (e.g., "{}" with
      # optional surrounding whitespace), do not add a comma before inserting
      # the hooks block, to avoid producing "{," which is invalid JSON.
      if grep -qE '^\s*\{\s*\}\s*$' "$dst_settings"; then
        printf '%s\n' "$content" > "$tmp_merged"
      else
        printf '%s,\n' "$content" > "$tmp_merged"
      fi
      cat >> "$tmp_merged" <<'HOOKEOF'
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/session-log-check.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
HOOKEOF
      mv "$tmp_merged" "$dst_settings"
      echo "Merged AI Context hooks into .claude/settings.json"
    fi
  else
    # No existing settings — install fresh
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Would install file: .claude/settings.json"
    else
      mkdir -p "$(dirname "$dst_settings")"
      cp "$src_settings" "$dst_settings"
      echo "Installed file: .claude/settings.json"
    fi
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
backup_path_snapshot "$TARGET_CONTEXT_DIR"
backup_path_snapshot "$TARGET_DIR/.ai-context-setup"
backup_path_snapshot "$TARGET_DIR/.cursor"
backup_path_snapshot "$TARGET_DIR/.agent"
backup_path_snapshot "$TARGET_DIR/.github"

copy_ai_context
copy_dir ".ai-context-setup"
copy_dir ".cursor"
copy_dir ".agent"
copy_dir ".github"
copy_file "AGENTS.md"
copy_file "CLAUDE.md"
install_claude_hooks

echo "Restoring project-owned .ai-context content from backup (if available)..."
restore_project_owned_context_from_backup
write_manifest
remove_legacy_manifest

echo
echo "AI Context version: $CURRENT_VERSION"
echo "Context schema version: $CURRENT_SCHEMA_VERSION"
echo "Apply mode: $APPLY_MODE"
if [[ -n "$PREVIOUS_VERSION" ]]; then
  echo "Previous AI Context version: $PREVIOUS_VERSION"
elif [[ "$APPLY_MODE" == "legacy-upgrade" ]]; then
  echo "Previous AI Context version: legacy-unversioned"
else
  echo "Previous AI Context version: none"
fi
if [[ "$BACKUP_COUNT" -gt 0 ]]; then
  echo "Existing managed files/directories were backed up to:"
  echo "  $BACKUP_DIR"
else
  echo "No existing managed files/directories found to back up."
fi
if [[ "$RESTORE_COUNT" -gt 0 ]]; then
  echo "Project-owned .ai-context items restored from backup: $RESTORE_COUNT"
else
  echo "No project-owned .ai-context items restored from backup."
fi
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run completed for:"
else
  echo "AI Context applied successfully to:"
fi
echo "  $TARGET_DIR"
echo
echo "Next step: open the target project with your coding agent and use the setup prompts to"
echo "complete the installation or upgrade:"
echo "  $TARGET_DIR/.ai-context-setup/SETUP-PROMPTS.md"
