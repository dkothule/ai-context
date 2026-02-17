# GitHub Copilot Adapter

This file is intentionally thin.  
Use `.ai-context/` as the single source of truth for project context, workflow, and standards.

## Read First (Every Session)
1. `.ai-context/project.overview.md`
2. `.ai-context/project.tasks.md`
3. `.ai-context/project.structure.md`
4. `.ai-context/standards/project.rules.md`
5. Relevant files in `.ai-context/standards/`

## Work Contract
- Follow `.ai-context/standards/project.rules.md` as the authoritative process.
- Keep changes incremental and testable.
- Update `.ai-context/` files when project state changes.

## Session End (Mandatory)
1. Create `.ai-context/sessions/YYYY-MM-DD-<topic>.md` from `.ai-context/sessions/_template.md`.
2. Update `.ai-context/project.tasks.md`.
3. Update `.ai-context/project.decisions.md` for significant decisions.
4. Update `.ai-context/project.changelog.md` for user-visible changes.

Do not duplicate shared governance in this file. Maintain shared policy in `.ai-context/standards/`.
