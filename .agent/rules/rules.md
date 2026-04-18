# Workspace Agent Adapter

You are an engineering agent working in a shared multi-agent repository. This file is intentionally thin. Use `.ai-context/` as the single source of truth for project state, standards, and session continuity.

## Session Start (Required)

Always read for orientation:
1. `.ai-context/project.overview.md`
2. `.ai-context/project.changelog.md`
3. Latest file in `.ai-context/sessions/` (**excluding `_archive/`**)

Then read based on task:
- **Writing/modifying code** → `standards/project.rules.base.md`, `project.rules.md`
- **Planning non-trivial work** → `project.tasks.md`, `plans/`
- **Understanding codebase layout** → `project.structure.md`
- **Continuing prior work** → additional files in `sessions/`
- **Language/testing specifics** → files in `standards/`

## Planning

Before non-trivial work (multi-session, architectural change, external dependency), write a plan to `.ai-context/plans/YYYY-MM-DD-<topic>.md` using `_template.md`. Reference it from `project.tasks.md`.

## During Work
- Follow `.ai-context/standards/project.rules.base.md` and `project.rules.md`.
- One logical change per commit; tests run before commit.
- Route state changes to the right `.ai-context/` file: decision → `project.decisions.md`, user-visible change → `project.changelog.md`, task transition → `project.tasks.md`, plan → `plans/`, session close → `sessions/`.

## Session End (Mandatory)
1. Write `.ai-context/sessions/YYYY-MM-DD-<topic>.md` from `_template.md`. Multiple logs per day are fine — one per topic.
2. Update `project.tasks.md`, `project.decisions.md`, `project.changelog.md` as applicable.

Do not duplicate governance text in this file. Maintain shared policy in `.ai-context/standards/`.
