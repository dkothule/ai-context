# AI Context Directory

This directory is the single source of truth for project context, shared across all supported AI coding agents.

## Purpose
Maintain consistent project understanding across multiple AI coding assistants. All project governance lives in `.ai-context/`; agent adapter files (CLAUDE.md, AGENTS.md, etc.) stay thin and point here.

## Structure
- `manifest.json` — Installer-managed AI Context version + schema metadata
- `project.overview.md` — **START HERE** — project summary, mission, objectives, tech stack
- `project.changelog.md` — Version history and user-visible changes
- `project.structure.md` — Directory layout and key entry points
- `project.tasks.md` — Active and pending work
- `project.backlog.md` — Prioritized backlog (lightweight; not a replacement for issue trackers)
- `project.decisions.md` — Architecture Decision Records (ADRs)
- `plans/` — Design documents for non-trivial work (written before starting)
- `sessions/` — Session logs (mandatory after each coding session; optionally gitignored via `ai-context init --gitignore`)
  - `_archive/` — compacted rollups of older sessions (do NOT read at session start)
- `standards/` — Coding standards and workflows
  - `project.rules.base.md` — AI Context-owned shared rules
  - `project.rules.md` — Project-owned overrides
  - `project.workflow.base.md` — AI Context-owned workflow baseline
  - `project.workflow.md` — Project-owned overrides
  - `project.<lang>.md` / `project.testing.md` — optional, created by `ai-context init` based on repo analysis
  - `README.md` — explains ownership model + optional topic files

## Session Start — Tiered Reading

Agents use a tiered approach to minimize context usage:

**Always read** (essential orientation):
1. `project.overview.md`
2. `project.changelog.md`
3. Latest file in `sessions/` (excluding `_archive/`)

**Then read based on task:**
- Writing/modifying code → `standards/project.rules.base.md`, `standards/project.rules.md`
- Planning non-trivial work → `project.tasks.md`, `plans/`
- Understanding codebase layout → `project.structure.md`
- Continuing prior work → additional files in `sessions/`
- Language/testing specifics → relevant files in `standards/`

## Agent Instructions

All operational behavior lives in:
- `standards/project.rules.base.md`
- `standards/project.rules.md`
- `standards/project.workflow.base.md`
- `standards/project.workflow.md`

Use these files as the single authority for instruction priority, clarification policy, high-risk confirmations, session workflow, response contracts, and mandatory context updates.

## Supported AI Agents

- **Claude Code** — `CLAUDE.md` (root, imports `@AGENTS.md`)
- **Codex / OpenAI agents** — `AGENTS.md` (root, canonical thin wrapper)
- **Cursor** — `.cursor/rules/main.mdc`
- **Google Antigravity / Workspace agents** — `.agent/rules/rules.md`

All adapters are intentionally thin and route to `.ai-context/` — on-demand loading avoids context-window bloat.
