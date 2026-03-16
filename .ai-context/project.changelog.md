***
last_updated: 2026-03-15 00:00:00
***

# Project Changelog

User-facing changes and significant updates. Follow semantic versioning principles.

## Format
Use ISO 8601 timestamps: YYYY-MM-DD HH:MM:SS

***

## [Unreleased]

### Added
(No additions yet)

### Changed
(No changes yet)

### Fixed
(No fixes yet)

### Removed
(No removals yet)

***

## [0.4.1] - 2026-03-16

### Fixed
- Handle trailing whitespace after `}` in settings.json merge to avoid invalid JSON
- Make `find` non-fatal in advisory Stop hook to prevent crashes under `set -euo pipefail`
- Remove line-anchor from hooks grep to catch minified settings.json
- Fix dry-run backup path to show actual `-XXXXXX` suffix pattern
- Correct "enforces/enforcement" wording to "reminds/advisory" across all docs (hook is advisory-only)
- Fix changelog placeholder text to match section names
- Fix ambiguous "this file" reference in `.ai-context/README.md`

***

## [0.4.0] - 2026-03-15

### Added
- `.claude/hooks/session-log-check.sh` as a Claude Code Stop hook that reminds Claude to create a session log before ending a session (advisory — exits 0 to avoid infinite loop since Stop fires on every turn)
- `.claude/settings.json` with Stop hook configuration referencing the session log check script
- Installer logic to merge AI Context hooks into an existing `.claude/settings.json` without overwriting user settings (backs up, then appends hooks block)
- Installer idempotency: skips merge when AI Context hooks are already present in target settings
- Uninstaller removes `.claude/hooks/` and warns user to manually clean up Stop hook entries from `.claude/settings.json`
- Test coverage for hooks merge (`run_hooks_merge_test`) and idempotent skip (`run_hooks_skip_test`)

### Changed
- Bumped version to `0.4.0` and schema version to `4`
- Moved post-apply runbooks from `scripts/APPLY-PROMPTS.md` to `.ai-context-setup/SETUP-PROMPTS.md` so the file is installed into the target project and available without the source repo
- Updated documentation (README, project.structure.md) to reflect `.claude/hooks/`, `.ai-context-setup/`, and Stop hook (advisory reminder)

### Fixed
- Replaced `rg` (ripgrep) with `grep -qF` in test scripts for portability across systems without ripgrep installed

### Removed
(No removals yet)

***

## [0.3.0] - 2026-03-09

### Added
- `tests/test-ai-context-installer.sh` as a repeatable release-validation suite for fresh install, legacy upgrade, old-manifest upgrade, reapply, and dry-run coverage
- `scripts/uninstall-ai-context.sh` as a safe removal utility for AI Context-managed files with backup support
- `tests/test-ai-context-uninstaller.sh` as repeatable validation for uninstall and dry-run flows

### Changed
- Rebranded user-facing documentation from "AI Agent Context Template" to "AI Context"
- Updated repository self-references to the `ai-context` slug
- Renamed the installer command to `scripts/ai-context.sh` before first release
- Renamed installer metadata from `.ai-context/template.manifest.json` to `.ai-context/manifest.json`
- Renamed manifest fields from `template_*` / `context_schema_version` to `version` / `schema_version` / `previous_version` / `previous_schema_version`
- Updated installer logic to migrate legacy manifest formats automatically and remove stale legacy manifest files after apply
- Reworked the first-time apply runbook so agents bootstrap `.ai-context/project.*` from repository evidence instead of treating new installs as verification-only
- Tightened the first-time apply runbook so it is used only for `fresh-install`, permits repository-backed placeholder replacement, and tells agents to replace shipped AI Context defaults that do not describe the target repo
- Documented how to check the installed AI Context version from a target project's `.ai-context/manifest.json`

### Fixed
- Prevented stale legacy manifest files from lingering after upgrades
- Added release-grade installer validation coverage instead of relying only on ad hoc smoke tests
- Restored arbitrary project-owned custom files and empty directories under `.ai-context/**` during upgrades instead of preserving only a fixed filename list
- Aligned the upgrade runbook with the installer so unknown custom `.ai-context/**` paths are treated as project-owned by default

### Removed
- `.ai-context/template.manifest.json` from the current AI Context source tree
- `scripts/apply-ai-context-template.sh` from the current AI Context source tree

***

## [0.2.0] - 2026-03-09

### Added
- `.github/copilot-instructions.md` as a thin adapter for GitHub Copilot support
- `.ai-context/standards/project.rules.base.md` and `.ai-context/standards/project.workflow.base.md` as AI Context-owned baseline standards
- `scripts/APPLY-PROMPTS.md` as post-apply runbooks for first-time apply and upgrade/reapply flows (moved to `.ai-context-setup/SETUP-PROMPTS.md` in `0.4.0`)
- `.ai-context/template.manifest.json` as installer-managed AI Context version and schema metadata (later renamed to `.ai-context/manifest.json` in `0.3.0`)

### Changed
- Refactored agent adapter files to stay thin and load shared `.ai-context` standards
- Converted `.ai-context/standards/project.rules.md` and `.ai-context/standards/project.workflow.md` into project-owned local override files
- Updated installer to restore project-owned `.ai-context` content after apply, detect fresh install vs legacy upgrade vs upgrade/reapply, and write manifest metadata
- Updated README and `.ai-context` docs to document AI Context-owned vs project-owned files and versioned upgrade behavior

### Fixed
- Prevented active rules duplication during upgrades by preserving legacy monolithic standards as `.legacy.md` files for guided migration
- Tightened post-apply prompts so agents compare-and-repair `.ai-context/**` without overwriting installer-managed metadata

### Removed
(No removals yet)

***

## [0.1.0] - 2025-11-20

### Added
- Initial project setup
- AI context directory structure
- Multi-agent configuration files (Cursor, Claude Code, Codex)
- Project standards and workflow documentation
