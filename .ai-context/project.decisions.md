***
last_updated: 2026-02-16 19:04:11
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
Keep all agent entry files thin (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/main.mdc`, `.agent/rules/rules.md`) and move shared policy authority to `.ai-context/standards/project.rules.md`. Standardize session logs to one naming and timestamp schema via `.ai-context/sessions/_template.md`.

**Consequences**:
- ✅ Lower risk of cross-agent instruction drift
- ✅ Easier maintenance of production-facing team standards
- ✅ Consistent handoff behavior across Codex, Claude Code, Cursor, Copilot, and workspace agents
- ⚠️ Requires discipline to keep `.ai-context/` authoritative and current

***

## Decision 4: Add GitHub Copilot Adapter

**Date**: 2026-02-16

**Context**:
Template users need the same centralized context model when using GitHub Copilot so behavior does not drift from other supported agents.

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
Enhance `.ai-context/standards/project.rules.md` with:
- high-risk action confirmation requirements,
- clarification/autonomy policy,
- task-specific response contracts (implementation, code review, incident/debug),
- and keep `.ai-context/README.md` as a lightweight pointer to avoid duplicated workflow text.

**Consequences**:
- ✅ Safer behavior for production-impacting work
- ✅ More predictable agent outputs across tools
- ✅ Lower instruction drift by reducing duplication in `.ai-context/README.md`
- ⚠️ Slight increase in policy strictness, which may require occasional user confirmations
