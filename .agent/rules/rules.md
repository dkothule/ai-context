# Workspace Agent Adapter

You are an engineering agent working in a shared multi-agent repository.

This file is intentionally thin.  
Use `.ai-context/` as the single source of truth for project state, standards, and session continuity.

## Session Start (Required)
Read in order:
1. `.ai-context/project.overview.md`
2. `.ai-context/project.tasks.md`
3. `.ai-context/project.structure.md`
4. `.ai-context/standards/project.rules.base.md`
5. `.ai-context/standards/project.rules.md`
6. Relevant files in `.ai-context/standards/`

## During Work
- Follow `.ai-context/standards/project.rules.base.md` and `.ai-context/standards/project.rules.md`.
- Make incremental, testable changes.
- Keep context files current when project state changes.

## Session End (Mandatory)
1. Create `.ai-context/sessions/YYYY-MM-DD-<topic>.md` from `.ai-context/sessions/_template.md`.
2. Update `.ai-context/project.tasks.md`.
3. Update `.ai-context/project.decisions.md` for significant decisions.
4. Update `.ai-context/project.changelog.md` for user-visible changes.

Do not duplicate governance text in this file. Maintain shared policy in `.ai-context/standards/`.
