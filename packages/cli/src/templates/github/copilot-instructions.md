# GitHub Copilot Adapter

This file is intentionally thin.  
Use `.ai-context/` as the single source of truth for project context, workflow, and standards.

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

## Work Contract
- Follow `.ai-context/standards/project.rules.base.md` and `.ai-context/standards/project.rules.md`.
- Keep changes incremental and testable.

Do not duplicate shared governance in this file. Maintain shared policy in `.ai-context/standards/`.
