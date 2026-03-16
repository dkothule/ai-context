***
last_updated: 2026-03-09 17:46:09
***

# Architecture Decision Records (ADRs)

Key architectural and technical decisions made during the project.

## Format
Each decision should include:
- **Date**: When the decision was made
- **Context**: What prompted the decision
- **Decision**: What was decided
- **Consequences**: Expected outcomes and trade-offs

***

## Decision 1: Multi-Agent AI Context System

**Date**: 2025-11-20

**Context**:
Working with multiple AI coding assistants (Cursor, Claude Code, Codex) and need consistent context across all agents to optimize credit usage across platforms.

**Decision**:
Implement a centralized `.ai-context/` directory containing all project context, with thin agent-specific configuration files (CLAUDE.md, AGENTS.md, .cursor/rules/main.mdc) that reference the central context.

**Consequences**:
- ✅ Consistent context across all AI agents
- ✅ Single source of truth for project information
- ✅ Version-controlled context that evolves with the project
- ✅ Seamless agent switching without context loss
- ⚠️ Requires discipline to keep context files updated
- ⚠️ Initial setup overhead

***

## Decision 2: Google Antigravity Support

**Date**: 2025-12-03

**Context**:
User inquired about Google Antigravity compatibility with the multi-agent context system. Research revealed Antigravity uses `.agent/rules/rules.md` format (not `.antigravity/` as initially suggested in some sources). The current system already supports Cursor (`.cursor/rules/*.mdc`), Claude Code (`CLAUDE.md`), and Codex (`AGENTS.md`).

**Decision**:
Add Google Antigravity support by creating `.agent/rules/rules.md` configuration file that references the centralized `.ai-context/` system. Use Antigravity's preferred "persona-first" structure with clear role definition, critical constraints, and workflow triggers. Maintain existing agent configurations without changes.

**Consequences**:
- ✅ Four-agent portability (Cursor, Claude Code, Codex, Antigravity)
- ✅ Antigravity's agent-first approach aligns well with governance-focused rules
- ✅ No disruption to existing configurations
- ✅ Complete multi-agent ecosystem coverage
- ⚠️ Slight increase in maintenance (one more config file to keep in sync)
- ⚠️ Antigravity format requires more structured, persona-based content

***

## Decision 3: Thin Agent Adapters With Centralized Governance

**Date**: 2026-02-17

**Context**:
Agent-specific instruction files had begun to duplicate operational standards. This created drift risks (session template mismatches, filename convention mismatches) and weakened the promise that `.ai-context/` is the single source of truth.

**Decision**:
Keep all agent entry files thin (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/main.mdc`, `.agent/rules/rules.md`) and move shared policy authority to `.ai-context/standards/`. Standardize session logs to one naming and timestamp schema via `.ai-context/sessions/_template.md`.

**Consequences**:
- ✅ Lower risk of cross-agent instruction drift
- ✅ Easier maintenance of production-facing team standards
- ✅ Consistent handoff behavior across Codex, Claude Code, Cursor, Copilot, and workspace agents
- ⚠️ Requires discipline to keep `.ai-context/` authoritative and current

***

## Decision 4: Add GitHub Copilot Adapter

**Date**: 2026-02-16

**Context**:
Users need the same centralized context model when using GitHub Copilot so behavior does not drift from other supported agents.

**Decision**:
Add `.github/copilot-instructions.md` as a thin adapter that points Copilot to `.ai-context/` and shared standards. Update installer script and docs to include this adapter.

**Consequences**:
- ✅ Copilot receives the same shared context bootstrap as other agents
- ✅ Reduced policy duplication across tools
- ✅ Improved interoperability for teams mixing Copilot with Codex/Claude/Cursor

***

## Decision 5: Harden Shared Prompt Contract For Safety And Consistency

**Date**: 2026-02-16

**Context**:
Even with thin adapters, production teams need stricter operational safeguards in the shared prompt contract: clear confirmation rules for high-risk actions, explicit clarification policy, and consistent response structure by task type.

**Decision**:
Enhance `.ai-context/standards/project.rules.base.md` with:
- high-risk action confirmation requirements,
- clarification/autonomy policy,
- task-specific response contracts (implementation, code review, incident/debug),
- and keep `.ai-context/README.md` as a lightweight pointer to avoid duplicated workflow text.

**Consequences**:
- ✅ Safer behavior for production-impacting work
- ✅ More predictable agent outputs across tools
- ✅ Lower instruction drift by reducing duplication in `.ai-context/README.md`
- ⚠️ Slight increase in policy strictness, which may require occasional user confirmations

***

## Decision 6: Split Standards Into Base (AI Context-Owned) And Local (Project-Owned)

**Date**: 2026-02-17

**Context**:
Projects often customize `project.rules.md` and `project.workflow.md`. Treating these files as AI Context-owned during upgrades can overwrite real project policy or force risky manual merges. We needed a safe upgrade model that preserves customization while still delivering baseline improvements.

**Decision**:
Adopt a base/local split:
- AI Context-owned: `project.rules.base.md`, `project.workflow.base.md`
- Project-owned: `project.rules.md`, `project.workflow.md`

Agents read base first, then local overrides. Upgrade logic preserves project-owned files and restores backup standards customizations while avoiding duplication of AI Context-owned base policy.

**Consequences**:
- ✅ Upgrades can safely ship new baseline governance without clobbering local policy
- ✅ Teams keep custom rules/workflow in stable project-owned files
- ✅ Lower risk of duplicate/contradictory rules over time
- ⚠️ Requires maintainers to keep local files focused on deltas instead of copying base content

***

## Decision 7: Version AI Context Installs With A Manifest And Schema

**Date**: 2026-03-09

**Context**:
AI Context is open source and already used across multiple projects. Before this change, upgrades relied on timestamped backups and human judgment, but there was no explicit machine-readable record of which release a downstream repository had installed or whether an apply run was a first install, a legacy migration, or a versioned upgrade.

**Decision**:
Add `.ai-context/manifest.json` as an AI Context-owned, installer-managed metadata file. Track:
- `version` using semantic versioning for AI Context releases
- `schema_version` for installer-relevant `.ai-context` layout changes
- `apply_mode` plus previous installed version/schema when known

Update the installer to write the manifest on every apply and expose the shipped version via `--version`.

**Consequences**:
- ✅ Downstream repositories can tell which AI Context release/schema is installed
- ✅ Upgrade prompts can reason about current vs previous state without guessing
- ✅ Fresh installs, legacy upgrades, and re-applies become visible in installer output
- ⚠️ Maintainers must bump manifest version/schema intentionally when template structure changes

***

## Decision 8: Brand The System As AI Context And Rename The Installer To `ai-context.sh`

**Date**: 2026-03-09

**Context**:
The project has grown beyond a starter template. It now has a versioned installer, upgrade behavior, ownership rules, and active downstream users. The name "AI Agent Context Template" over-emphasized the starter-kit aspect and under-described the product users actually interact with: a shared `.ai-context/` system.

**Decision**:
Use `AI Context` as the user-facing product name and rename the installer command to `scripts/ai-context.sh` before release.

**Consequences**:
- ✅ Shorter, clearer branding aligned with `.ai-context/`
- ✅ Cleaner installer command for docs and onboarding
- ✅ No pre-release compatibility baggage in the shipped interface
- ⚠️ Repository slug changes must land in GitHub before release URLs are valid

***

## Decision 9: Remove Template-Era Manifest Naming Before Release

**Date**: 2026-03-09

**Context**:
After rebranding to AI Context, the remaining `template.manifest.json` filename and `template_*` manifest keys were legacy holdovers. Keeping them long-term would make the public product feel half-renamed and would complicate future release messaging.

**Decision**:
Standardize on `.ai-context/manifest.json` with the fields:
- `name`
- `version`
- `schema_version`
- `managed_by`
- `installed_at`
- `apply_mode`
- `previous_version`
- `previous_schema_version`

The installer must still detect and migrate older `.ai-context/template.manifest.json` files during upgrades, then remove the legacy file after writing the new manifest.

**Consequences**:
- ✅ Public naming is consistent with AI Context branding
- ✅ Manifest semantics are simpler for maintainers and downstream tooling
- ✅ Existing users still have an upgrade path from older installs
- ⚠️ Release validation must cover both old and new manifest formats

***

## Decision 10: Restore Project-Owned `.ai-context/**` Paths By Ownership, Not Filename List

**Date**: 2026-03-09

**Context**:
The first release-ready installer preserved only a fixed list of known project-owned context files during upgrade. That was too narrow for active downstream users because teams can add arbitrary custom context such as runbooks, glossaries, standards, templates, or other project-specific files under `.ai-context/`. The post-apply runbook had the same weakness.

**Decision**:
Define AI Context ownership as an explicit installer-managed set:
- `README.md`
- `manifest.json`
- `project.overview.md.template`
- `sessions/_template.md`
- `standards/project.rules.base.md`
- `standards/project.workflow.base.md`

Treat every other path under `.ai-context/**` as project-owned by default. During upgrade, restore or merge those project-owned paths from backup, while still preserving legacy monolithic standards as `.legacy.md` files for guided migration.

**Consequences**:
- ✅ Arbitrary custom `.ai-context` files survive installer upgrades without requiring maintainers to predict filenames
- ✅ Installer behavior and post-apply prompts now follow the same ownership model
- ✅ Safer default for open-source downstream users with team-specific context structure
- ⚠️ AI Context-owned path additions must be made intentionally so future releases do not accidentally treat new installer-managed files as project-owned

***

## Decision 11: First-Time Apply Must Bootstrap Context From Repository Evidence

**Date**: 2026-03-09

**Context**:
The original first-time apply prompt focused mostly on verifying that required `.ai-context` files existed. In practice, downstream users need the first post-install run to analyze the repository and replace template defaults with project-specific context, otherwise AI Context remains generic and low-value after installation.

**Decision**:
Treat first-time apply as a repository bootstrap workflow, not just a verification workflow. The runbook must explicitly tell the agent:
- what AI Context is for,
- which repository signals to inspect,
- which project-owned context files to populate from evidence,
- and to leave placeholders only for facts that cannot be supported safely.

**Consequences**:
- ✅ First installs produce useful project-specific context instead of mostly untouched templates
- ✅ Different LLM providers/models get clearer instructions about the role of `.ai-context`
- ✅ Future agents inherit more accurate overview/structure/task context immediately after installation
- ⚠️ Prompts must continue to guard against hallucinated project facts when repository evidence is weak

***

## Decision 12: Fresh-Install Runbook Must Follow Installer Apply Mode

**Date**: 2026-03-09

**Context**:
The first-time apply runbook described itself as the path for repositories without a previous versioned install, which overlaps with `legacy-upgrade`. It also relied on generic "template-only" wording even though fresh installs currently seed some project-owned files with AI Context repository content. That made it possible for an agent to choose the wrong runbook or leave AI Context-specific defaults in a downstream repository.

**Decision**:
Tie the first-time apply runbook to `apply_mode = fresh-install` explicitly. Also instruct the agent to replace placeholders and shipped AI Context default content when repository evidence shows that content does not describe the target repository.

**Consequences**:
- ✅ Fresh installs and legacy upgrades now route to the correct runbooks
- ✅ First-time bootstrap instructions match the installer's real apply-mode model
- ✅ Downstream repositories are less likely to retain AI Context's own overview/task/history text after installation
- ⚠️ Future changes to installer-owned/project-owned defaults must stay aligned with the runbook wording

***

## Decision 13: Uninstall Must Remove Only Managed AI Context Artifacts And Keep A Backup

**Date**: 2026-03-09

**Context**:
Once AI Context is applied, projects receive `.ai-context/` plus multiple adapter files in root and agent-specific directories. A utility uninstall command is useful, but a naive implementation could delete unrelated `.github/`, `.cursor/`, or `.agent/` content that the project owns.

**Decision**:
Add `scripts/uninstall-ai-context.sh` with a conservative removal model:
- back up everything it removes into `.ai-context-backups/uninstall-<timestamp>/`
- remove only AI Context-managed artifacts (`.ai-context/`, `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/main.mdc`, `.agent/rules/rules.md`, `.github/copilot-instructions.md`)
- prune parent directories only when they are empty after removal

**Consequences**:
- ✅ Users get a reversible uninstall path
- ✅ Uninstall avoids clobbering unrelated agent or GitHub configuration
- ✅ README can document install, version-check, and uninstall as a full lifecycle
- ⚠️ Pre-install files are preserved only in backups; uninstall does not attempt automatic restoration

***

## Decision 14: Claude Code Stop Hook — Advisory Only (exit 0)

**Date**: 2026-03-15

**Context**:
Claude Code's Stop hook fires on every assistant turn, not only when the session actually ends. Using `exit 2` (force-continue) to enforce session-log creation would cause an infinite loop: the agent adds the log, the turn ends, Stop fires again, finds no *new* log to write, force-continues, and so on.

**Decision**:
The Stop hook (`.claude/hooks/session-log-check.sh`) always exits 0. When no session log exists for the current date, it prints a reminder to stdout so the agent sees it, but never blocks or force-continues. The installer merges the hook into `.claude/settings.json` non-destructively (backup + append; skip if already present).

**Consequences**:
- ✅ Agents receive a visible reminder to create a session log without risk of looping
- ✅ Hook is safe to run on every turn (no side-effects, no force-continue)
- ✅ Installer preserves existing `.claude/settings.json` content during merge
- ⚠️ Advisory only — an agent can still end a session without logging if it ignores the reminder
- ⚠️ If Claude Code changes Stop hook semantics (e.g. fires only at true session end), the exit code could be revisited
