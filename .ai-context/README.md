# AI Context Directory

This directory contains all AI agent context files for Cursor, Claude Code, Codex, GitHub Copilot, and Google Antigravity.

## Purpose
Maintain consistent project understanding across multiple AI coding assistants.
All project governance should live in `.ai-context/`; agent adapter files should stay thin.

## Structure
- `manifest.json` - Installer-managed AI Context version + schema metadata
- `project.overview.md` - **START HERE** - Project summary, status, objectives
- `project.structure.md` - Directory structure and organization
- `project.tasks.md` - Active and pending tasks
- `project.backlog.md` - Prioritized feature backlog
- `project.decisions.md` - Key architectural decisions (ADRs)
- `project.changelog.md` - Version history and recent changes
- `standards/` - Coding standards and workflows
  - `project.rules.base.md` - AI Context-owned shared rules
  - `project.rules.md` - Project-owned rule overrides
  - `project.workflow.base.md` - AI Context-owned workflow baseline
  - `project.workflow.md` - Project-owned workflow overrides
  - `project.python.md` - Python coding standards
  - `project.testing.md` - Testing requirements
- `sessions/` - Session notes from AI agent work (MANDATORY after each session)

## Agent Instructions

All operational behavior is defined in:
- `standards/project.rules.base.md`
- `standards/project.rules.md`
- `standards/project.workflow.base.md`
- `standards/project.workflow.md`

Use these standards files as the single authority for:
- instruction priority and conflict handling
- clarification policy and high-risk confirmations
- session start workflow and working loop
- response contracts for implementation/review/incident tasks
- AI Context version and schema metadata ownership
- mandatory session logging and context updates

## Multi-Agent Coordination

This context is shared between Cursor, Claude Code, Codex, GitHub Copilot, and Google Antigravity. Keep files updated for seamless handoffs between agents and sessions.

## Supported AI Agents

This context system works with the following AI coding assistants:

- **Cursor** - Configuration: `.cursor/rules/main.mdc`
- **Claude Code** - Configuration: `CLAUDE.md` (root)
- **Codex** - Configuration: `AGENTS.md` (root)
- **GitHub Copilot** - Configuration: `.github/copilot-instructions.md`
- **Google Antigravity** - Configuration: `.agent/rules/rules.md`

All agents read from the shared `.ai-context/` directory.
