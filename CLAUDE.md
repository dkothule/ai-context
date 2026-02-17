# Claude Code Adapter (CLAUDE.md)

This file is intentionally thin.  
The shared source of truth is `.ai-context/`.

## Read First (Every Session)
1. `.ai-context/project.overview.md`
2. `.ai-context/project.tasks.md`
3. `.ai-context/project.structure.md`
4. `.ai-context/standards/project.rules.md`
5. Relevant language/testing/workflow standards in `.ai-context/standards/`

## Execution Contract
1. Follow `.ai-context/standards/project.rules.md` as the authoritative workflow.
2. Make incremental, testable changes.
3. Keep `.ai-context/` updated when project state changes.

## End-Of-Session (Mandatory)
1. Create a session log at `.ai-context/sessions/YYYY-MM-DD-<topic>.md`
   using `.ai-context/sessions/_template.md`.
2. Update `.ai-context/project.tasks.md`.
3. Update `.ai-context/project.decisions.md` for significant decisions.
4. Update `.ai-context/project.changelog.md` for user-visible changes.

## Notes
- If this file conflicts with higher-priority system/developer/user instructions, follow higher-priority instructions.
- Do not duplicate shared standards here; update `.ai-context/standards/` instead.
