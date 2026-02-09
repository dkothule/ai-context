# AI Context Directory

This directory contains all AI agent context files for Cursor, Claude Code, Codex, and Google Antigravity.

## Purpose
Maintain consistent project understanding across multiple AI coding assistants.

## Structure
- `project.overview.md` - **START HERE** - Project summary, status, objectives
- `project.structure.md` - Directory structure and organization
- `project.tasks.md` - Active and pending tasks
- `project.backlog.md` - Prioritized feature backlog
- `project.decisions.md` - Key architectural decisions (ADRs)
- `project.changelog.md` - Version history and recent changes
- `standards/` - Coding standards and workflows
  - `project.rules.md` - Agent rules and session management
  - `project.workflow.md` - Git workflow and branching strategy
  - `project.python.md` - Python coding standards
  - `project.testing.md` - Testing requirements
- `sessions/` - Session notes from AI agent work (MANDATORY after each session)

## Agent Instructions

### Start of Session (READ FIRST)
1. **Read** `project.overview.md` - Understand current project state and objectives
2. **Check** `project.tasks.md` - See what's currently being worked on
3. **Check** `sessions/` - Review recent session logs for context
4. **Review** `project.structure.md` - Understand codebase layout
5. **Consult** relevant files in `standards/` - Follow project conventions

### During Session
- Follow standards in `standards/`
- Make incremental, testable changes
- Update relevant context files as you progress

### ⚠️ End of Session (MANDATORY)
**Before ending ANY work session, you MUST:**

1. **Create session log** in `sessions/YYYY-MM-DD-<topic>.md`
   - See template in `standards/project.rules.md`
   - Include: summary, work completed, files modified, decisions, next steps
2. **Update** `project.tasks.md` with progress
3. **Update** `project.changelog.md` if user-facing changes
4. **Log decisions** in `project.decisions.md` for significant choices

**Session logs are critical for multi-agent continuity. DO NOT SKIP.**

## Multi-Agent Coordination

This context is shared between Cursor, Claude Code, Codex, and Google Antigravity. Keep files updated for seamless handoffs between agents and sessions.

## Supported AI Agents

This context system works with the following AI coding assistants:

- **Cursor** - Configuration: `.cursor/rules/main.mdc`
- **Claude Code** - Configuration: `CLAUDE.MD` (root)
- **Codex** - Configuration: `AGENTS.md` (root)
- **Google Antigravity** - Configuration: `.agent/rules/rules.md`

All agents read from the shared `.ai-context/` directory.
