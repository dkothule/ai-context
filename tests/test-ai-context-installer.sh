#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_ROOT="$(mktemp -d /tmp/ai-context-tests.XXXXXX)"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_file_exists() {
  local path="$1"
  [[ -f "$path" ]] || fail "expected file to exist: $path"
}

assert_file_missing() {
  local path="$1"
  [[ ! -e "$path" ]] || fail "expected path to be absent: $path"
}

assert_contains() {
  local needle="$1"
  local haystack="$2"
  [[ "$haystack" == *"$needle"* ]] || fail "expected output to contain: $needle"
}

assert_file_contains() {
  local path="$1"
  local needle="$2"
  grep -qF "$needle" "$path" || fail "expected $path to contain: $needle"
}

run_fresh_install_test() {
  local target="$TMP_ROOT/fresh"
  local log="$TMP_ROOT/fresh.log"

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >"$log"

  assert_file_exists "$target/.ai-context/manifest.json"
  assert_file_missing "$target/.ai-context/template.manifest.json"
  assert_file_contains "$target/.ai-context/manifest.json" '"version": "0.5.0"'
  assert_file_contains "$target/.ai-context/manifest.json" '"schema_version": 4'
  assert_file_contains "$target/.ai-context/manifest.json" '"apply_mode": "fresh-install"'
  assert_file_contains "$target/.ai-context/manifest.json" '"previous_version": null'
  assert_file_contains "$log" 'AI Context applied successfully to:'
  assert_file_exists "$target/.claude/hooks/session-log-check.sh"
  assert_file_exists "$target/.claude/settings.json"
  assert_file_contains "$target/.claude/settings.json" 'session-log-check.sh'
}

run_legacy_upgrade_test() {
  local target="$TMP_ROOT/legacy-upgrade"
  local log="$TMP_ROOT/legacy-upgrade.log"

  mkdir -p "$target/.ai-context/standards" "$target/.ai-context/runbooks" "$target/.ai-context/templates/empty"
  cat > "$target/.ai-context/project.overview.md" <<'EOF'
# Existing Overview
EOF
  cat > "$target/.ai-context/glossary.md" <<'EOF'
custom glossary
EOF
  cat > "$target/.ai-context/runbooks/oncall.md" <<'EOF'
custom runbook
EOF
  cat > "$target/.ai-context/standards/project.rules.md" <<'EOF'
# Project Rules (Authoritative)

## 1) Source Of Truth
legacy rules
EOF
  cat > "$target/.ai-context/standards/team.custom.md" <<'EOF'
team custom standard
EOF

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >"$log"

  assert_file_exists "$target/.ai-context/manifest.json"
  assert_file_missing "$target/.ai-context/template.manifest.json"
  assert_file_contains "$target/.ai-context/manifest.json" '"apply_mode": "legacy-upgrade"'
  assert_file_exists "$target/.ai-context/standards/project.rules.legacy.md"
  assert_file_contains "$target/.ai-context/glossary.md" 'custom glossary'
  assert_file_contains "$target/.ai-context/runbooks/oncall.md" 'custom runbook'
  assert_file_contains "$target/.ai-context/standards/team.custom.md" 'team custom standard'
  [[ -d "$target/.ai-context/templates/empty" ]] || fail "expected empty custom directory to be restored"
  assert_file_contains "$log" 'Restored project-owned path: .ai-context/glossary.md'
  assert_file_contains "$log" 'Restored project-owned path: .ai-context/runbooks/oncall.md'
  assert_file_contains "$log" 'Restored project-owned path: .ai-context/standards/team.custom.md'
  assert_file_contains "$log" 'Restored project-owned directory: .ai-context/templates/empty'
}

run_old_manifest_upgrade_test() {
  local target="$TMP_ROOT/old-manifest-upgrade"
  local log="$TMP_ROOT/old-manifest-upgrade.log"

  mkdir -p "$target/.ai-context"
  cat > "$target/.ai-context/template.manifest.json" <<'EOF'
{
  "template_name": "ai-context",
  "template_version": "0.2.0",
  "context_schema_version": 2,
  "managed_by": "scripts/ai-context.sh",
  "installed_at": "2026-03-09T00:00:00Z",
  "apply_mode": "upgrade",
  "previous_template_version": null,
  "previous_context_schema_version": null
}
EOF
  cat > "$target/.ai-context/project.tasks.md" <<'EOF'
custom tasks
EOF

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >"$log"

  assert_file_exists "$target/.ai-context/manifest.json"
  assert_file_missing "$target/.ai-context/template.manifest.json"
  assert_file_contains "$target/.ai-context/manifest.json" '"apply_mode": "upgrade"'
  assert_file_contains "$target/.ai-context/manifest.json" '"previous_version": "0.2.0"'
  assert_file_contains "$target/.ai-context/manifest.json" '"previous_schema_version": 2'
  assert_file_contains "$target/.ai-context/project.tasks.md" 'custom tasks'
}

run_reapply_test() {
  local target="$TMP_ROOT/reapply"
  local log="$TMP_ROOT/reapply.log"

  mkdir -p "$target/.ai-context"
  cat > "$target/.ai-context/manifest.json" <<'EOF'
{
  "name": "ai-context",
  "version": "0.5.0",
  "schema_version": 4,
  "managed_by": "scripts/ai-context.sh",
  "installed_at": "2026-03-09T00:00:00Z",
  "apply_mode": "fresh-install",
  "previous_version": null,
  "previous_schema_version": null
}
EOF
  cat > "$target/.ai-context/project.decisions.md" <<'EOF'
custom decisions
EOF

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >"$log"

  assert_file_contains "$target/.ai-context/manifest.json" '"apply_mode": "reapply"'
  assert_file_contains "$target/.ai-context/manifest.json" '"previous_version": "0.5.0"'
  assert_file_contains "$target/.ai-context/manifest.json" '"previous_schema_version": 4'
  assert_file_contains "$target/.ai-context/project.decisions.md" 'custom decisions'
}

run_hooks_merge_test() {
  local target="$TMP_ROOT/hooks-merge"
  local log="$TMP_ROOT/hooks-merge.log"

  # Pre-create a .claude/settings.json with existing permissions
  mkdir -p "$target/.claude"
  cat > "$target/.claude/settings.json" <<'EOF'
{
  "permissions": {
    "allow": ["Bash(ls:*)"],
    "deny": []
  }
}
EOF

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >"$log"

  # Hooks script must be installed
  assert_file_exists "$target/.claude/hooks/session-log-check.sh"
  # Existing permissions must survive
  assert_file_contains "$target/.claude/settings.json" '"permissions"'
  assert_file_contains "$target/.claude/settings.json" 'Bash(ls:*)'
  # Our hook must be merged in
  assert_file_contains "$target/.claude/settings.json" 'session-log-check.sh'
  assert_file_contains "$log" 'Merged AI Context hooks into .claude/settings.json'
}

run_hooks_existing_hooks_key_test() {
  local target="$TMP_ROOT/hooks-existing-hooks-key"
  local log="$TMP_ROOT/hooks-existing-hooks-key.log"

  # Pre-create a .claude/settings.json with an existing top-level "hooks" key
  # but NOT containing the AI Context hook — the merge must be skipped to avoid
  # producing invalid JSON with duplicate "hooks" keys.
  mkdir -p "$target/.claude/hooks"
  cat > "$target/.claude/settings.json" <<'EOF'
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash .claude/hooks/other-hook.sh", "timeout": 5000 }] }
    ]
  }
}
EOF

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >"$log"

  # Hooks script must still be installed
  assert_file_exists "$target/.claude/hooks/session-log-check.sh"
  # Existing hook must be preserved (no duplicate-key corruption)
  assert_file_contains "$target/.claude/settings.json" 'other-hook.sh'
  # Our hook must NOT have been injected (would produce invalid JSON)
  if grep -qF 'session-log-check.sh' "$target/.claude/settings.json" 2>/dev/null; then
    echo "FAIL: session-log-check.sh was written into settings.json with existing hooks key (would produce invalid JSON)"
    exit 1
  fi
  assert_file_contains "$log" 'existing "hooks" key detected.'
}

run_hooks_skip_test() {
  local target="$TMP_ROOT/hooks-skip"
  local log="$TMP_ROOT/hooks-skip.log"

  # Pre-create with our hook already present
  mkdir -p "$target/.claude/hooks"
  cat > "$target/.claude/settings.json" <<'EOF'
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash .claude/hooks/session-log-check.sh", "timeout": 5000 }] }
    ]
  }
}
EOF

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >"$log"

  assert_file_contains "$log" 'Skipped .claude/settings.json merge (AI Context hooks already present)'
}

run_version_and_dry_run_test() {
  local version_output
  local dry_run_target="$TMP_ROOT/dry-run"
  local dry_run_output

  version_output="$("$REPO_ROOT/scripts/ai-context.sh" --version)"
  dry_run_output="$("$REPO_ROOT/scripts/ai-context.sh" --dry-run "$dry_run_target")"

  assert_contains 'version=0.5.0' "$version_output"
  assert_contains 'schema_version=4' "$version_output"
  assert_contains 'Dry run completed for:' "$dry_run_output"
  assert_file_missing "$dry_run_target/.ai-context"
}

bash -n "$REPO_ROOT/scripts/ai-context.sh"

run_fresh_install_test
run_legacy_upgrade_test
run_old_manifest_upgrade_test
run_reapply_test
run_hooks_merge_test
run_hooks_existing_hooks_key_test
run_hooks_skip_test
run_version_and_dry_run_test

printf 'PASS: AI Context installer validation\n'
