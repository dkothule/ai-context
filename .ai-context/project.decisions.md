***
last_updated: 2025-12-03 14:45:00
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
Implement a centralized `.ai-context/` directory containing all project context, with thin agent-specific configuration files (claude.md, codex.md, .cursor/rules/main.mdc) that reference the central context.

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
User inquired about Google Antigravity compatibility with the multi-agent context system. Research revealed Antigravity uses `.agent/rules/rules.md` format (not `.antigravity/` as initially suggested in some sources). The current system already supports Cursor (`.cursor/rules/*.mdc`), Claude Code (`claude.md`), and Codex (`codex.md`).

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

## Decision 3: [Next Decision]

**Date**: [To be filled]

**Context**: [To be filled]

**Decision**: [To be filled]

**Consequences**: [To be filled]
