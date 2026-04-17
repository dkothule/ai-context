# Claude Code Adapter (CLAUDE.md)

This file is intentionally thin.  
The shared source of truth is `.ai-context/`.

## Read First (Every Session)

Always read (essential orientation):
1. `.ai-context/project.overview.md`
2. `.ai-context/project.changelog.md`
3. Latest file in `.ai-context/sessions/`

Then read based on task:
- **Writing/modifying code** → `standards/project.rules.base.md`, `standards/project.rules.md`
- **Planning or scoping work** → `project.tasks.md`
- **Understanding codebase layout** → `project.structure.md`
- **Continuing prior work** → additional files in `sessions/`
- **Language/testing specifics** → relevant files in `standards/`

## Execution Contract
1. Follow `.ai-context/standards/project.rules.base.md` and `.ai-context/standards/project.rules.md`.
2. Make incremental, testable changes.
3. Keep `.ai-context/` updated when project state changes.

## End-Of-Session (Mandatory)
Any repo-aware task (including review/proofreading/investigation) is a session unless it is pure chat with no repository access.

1. Create a session log at `.ai-context/sessions/YYYY-MM-DD-<topic>.md`
   using `.ai-context/sessions/_template.md`.
2. Update `.ai-context/project.tasks.md`.
3. Update `.ai-context/project.decisions.md` for significant decisions.
4. Update `.ai-context/project.changelog.md` for user-visible changes.

## Notes
- If this file conflicts with higher-priority system/developer/user instructions, follow higher-priority instructions.
- Do not duplicate shared standards here; update `.ai-context/standards/` instead.
