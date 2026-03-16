#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_ROOT="$(mktemp -d /tmp/ai-context-uninstall-tests.XXXXXX)"

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

assert_dir_exists() {
  local path="$1"
  [[ -d "$path" ]] || fail "expected directory to exist: $path"
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

run_uninstall_test() {
  local target="$TMP_ROOT/uninstall"
  local uninstall_output

  mkdir -p "$target/.github/workflows" "$target/.cursor" "$target/.agent"
  cat > "$target/.github/workflows/ci.yml" <<'EOF'
name: CI
EOF
  cat > "$target/.cursor/settings.json" <<'EOF'
{}
EOF
  cat > "$target/.agent/custom.txt" <<'EOF'
custom agent note
EOF

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >/dev/null
  uninstall_output="$("$REPO_ROOT/scripts/uninstall-ai-context.sh" "$target")"

  assert_file_missing "$target/.ai-context"
  assert_file_missing "$target/AGENTS.md"
  assert_file_missing "$target/CLAUDE.md"
  assert_file_missing "$target/.cursor/rules/main.mdc"
  assert_file_missing "$target/.agent/rules/rules.md"
  assert_file_missing "$target/.github/copilot-instructions.md"
  assert_file_contains "$target/.github/workflows/ci.yml" 'name: CI'
  assert_file_contains "$target/.cursor/settings.json" '{}'
  assert_file_contains "$target/.agent/custom.txt" 'custom agent note'
  assert_dir_exists "$target/.ai-context-backups"
  assert_contains 'Installed AI Context version: 0.4.1' "$uninstall_output"
  assert_contains 'Removed managed items: 8' "$uninstall_output"
  assert_contains 'AI Context removed successfully from:' "$uninstall_output"
}

run_empty_parent_cleanup_test() {
  local target="$TMP_ROOT/cleanup"

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >/dev/null
  "$REPO_ROOT/scripts/uninstall-ai-context.sh" "$target" >/dev/null

  assert_file_missing "$target/.cursor"
  assert_file_missing "$target/.agent"
  assert_file_missing "$target/.github"
  # .claude/ is NOT fully removed because .claude/settings.json is user-owned
  assert_file_missing "$target/.claude/hooks"
  assert_file_exists "$target/.claude/settings.json"
}

run_dry_run_test() {
  local target="$TMP_ROOT/dry-run"
  local dry_run_output

  "$REPO_ROOT/scripts/ai-context.sh" "$target" >/dev/null
  dry_run_output="$("$REPO_ROOT/scripts/uninstall-ai-context.sh" --dry-run "$target")"

  assert_file_exists "$target/.ai-context/manifest.json"
  assert_file_exists "$target/AGENTS.md"
  assert_contains 'Dry run completed for:' "$dry_run_output"
  assert_contains 'Would back up and remove: .ai-context -> .ai-context-backups/uninstall-' "$dry_run_output"
}

bash -n "$REPO_ROOT/scripts/ai-context.sh"
bash -n "$REPO_ROOT/scripts/uninstall-ai-context.sh"

run_uninstall_test
run_empty_parent_cleanup_test
run_dry_run_test

printf 'PASS: AI Context uninstall validation\n'
