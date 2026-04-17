***
last_updated: 2026-03-17 00:00:00
***

# Active Tasks

Current work in progress. Update this file at the end of each coding session.

## In Progress

### Task: npm CLI v1.0.0 — Validate and publish
- **Started**: 2026-03-17
- **Status**: In progress — implementation complete, pending validation and npm publish
- **Description**: Build and publish `ai-context` npm CLI (`packages/cli/`)
- **Progress**:
  - [x] Branch `feat/npm-cli-v1` created
  - [x] `.ai-context/plans/` directory added with `_template.md`
  - [x] `packages/cli/` scaffolded (TypeScript, Vitest, commander)
  - [x] All core modules implemented (ownership, manifest, applyMode, backup, restore, claudeHooks, gitignore, copyTemplates, agentCLI)
  - [x] 55 tests passing (35 unit + 20 integration)
  - [x] All commands implemented: `init`, `apply`, `setup`, `uninstall`, `status`, `version`
  - [x] CI workflow added (ubuntu + macos + windows × node 18/20/22)
  - [x] Bash scripts removed (replaced by TypeScript CLI)
  - [x] README updated; `.ai-context-setup/` removed from install path
  - [ ] Validate `npx . init` end-to-end in a real project
  - [ ] Verify `ai-context name availability on npmjs.com
  - [ ] Merge `feat/npm-cli-v1` to main
  - [ ] Publish to npm

## Blocked
(No blocked tasks currently)

## Completed Today
- 2026-03-17 Implemented TypeScript npm CLI v1.0.0 (`packages/cli/`): `init`, `apply`, `setup`, `uninstall`, `status`, `version` commands; 55 tests passing; CI workflow; bash scripts frozen; README updated; `.ai-context/plans/` directory introduced
- 2026-03-16 Implemented tiered session-start reading across all 5 adapters; bumped to v0.5.0; pushed to `feat/tiered-session-start` for validation testing across agents.
- 2026-03-15 Moved post-apply runbooks from `scripts/APPLY-PROMPTS.md` to `.ai-context-setup/SETUP-PROMPTS.md`; installer and uninstaller updated to treat `.ai-context-setup/` as a managed path so it lands in the target project on every install/upgrade.
- 2026-03-15 Fixed Claude Code Stop hook (`exit 2` → `exit 0`) to prevent infinite loop caused by hook firing on every turn rather than only at true session end.
- 2026-03-15 Added `.claude/hooks/session-log-check.sh` and `.claude/settings.json` Stop hook (advisory reminder); installer merges hooks into existing settings without overwriting user config.
- 2026-03-15 Replaced `rg` with `grep -qF` in test scripts for portability; bumped version to `0.4.0` / schema `4`.
- 2026-03-09 Added `scripts/uninstall-ai-context.sh`, documented installed-version lookup in the README, and added uninstall validation coverage.
- 2026-03-09 Tightened the first-time apply runbook to key off `apply_mode=fresh-install`, allow repository-backed placeholder replacement, and replace shipped AI Context defaults that do not match the target repo.
- 2026-03-09 Updated the first-time apply runbook so agents analyze the repository and replace default `.ai-context` template text with project-specific context where evidence exists.
- 2026-03-09 Validated ownership-based restore behavior for arbitrary project-owned `.ai-context/**` files and empty directories with `bash tests/test-ai-context-installer.sh`.
- 2026-03-09 Updated installer and upgrade runbook to restore project-owned `.ai-context/**` paths by ownership instead of a fixed filename list, including empty custom directories.
- 2026-03-09 Ran `bash tests/test-ai-context-installer.sh` twice during final hardening plus targeted dry-run checks for old-manifest upgrade output.
- 2026-03-09 Renamed installer metadata to `.ai-context/manifest.json`, migrated manifest keys away from `template_*`, and added automatic legacy-manifest migration/removal.
- 2026-03-09 Added `tests/test-ai-context-installer.sh` for repeatable installer release validation.
- 2026-03-09 Updated docs and repo self-references for the `ai-context` slug and new manifest naming.
- 2026-03-09 Verified `scripts/ai-context.sh` with `bash -n`, `--version`, and `--dry-run`.
- 2026-03-09 Rebranded user-facing docs to `AI Context` and renamed the installer to `scripts/ai-context.sh` before first release.
- 2026-03-09 Validated installer flows for `fresh-install`, `legacy-upgrade`, and versioned `upgrade` in `/tmp` smoke tests.
- 2026-03-09 Added version-aware installer output for fresh installs, legacy upgrades, upgrades, and re-applies.
- 2026-03-09 Rewrote `scripts/APPLY-PROMPTS.md` into compare-first runbooks with explicit ownership rules for installer-managed vs project-owned files.
- 2026-03-07 Reviewed the AGENTS.md paper and compared its findings to the `.ai-context` template architecture.
- 2026-03-07 Verified that Codex, Claude, Cursor, and Copilot adapters all route through the same shared `.ai-context` startup files.
- 2026-03-02 Reviewed alignment between OpenAI "Harnessing engineering agents" post and `.ai-context` template standards.
- 2026-02-27 Split standards into AI Context-owned base files + project-owned local override files (`project.rules/workflow`).
- 2026-02-27 Updated installer to restore project-owned `.ai-context` content after apply and preserve legacy monolithic standards as `.legacy.md` to avoid base/local duplication.
- 2026-02-27 Updated `scripts/APPLY-PROMPTS.md` with upgrade migration guidance for base/local standards.
- 2026-02-21 Added scripts/APPLY-PROMPTS.md (prompts for new, existing, upgrade scenarios)
- 2025-11-20 Created AI context system

## Next Session
1. Test tiered session-start format across real sessions with Claude Code, Codex, and Cursor
2. Validate agents follow tiered reading (not loading everything upfront)
3. Merge `feat/tiered-session-start` to main once validated

***
**Session Notes**:
- Initial setup completed with multi-agent AI context system
