# AGENTS.md — Shared agent adapter

This file is intentionally thin. The single source of truth is `.ai-context/`, loaded on demand.

## Read First (Every Session)

Always read for orientation:
1. `.ai-context/project.overview.md`
2. `.ai-context/project.changelog.md`
3. Latest file in `.ai-context/sessions/` (**excluding `_archive/`**)

Then read based on task:
- **Writing/modifying code** → `.ai-context/standards/project.rules.base.md`, `project.rules.md`
- **Planning non-trivial work** → `.ai-context/project.tasks.md`, `plans/`
- **Understanding codebase layout** → `.ai-context/project.structure.md`
- **Continuing prior work** → additional files in `sessions/`
- **Language/testing specifics** → files in `.ai-context/standards/`

## Planning

Before non-trivial work (multi-session, architectural change, external dependency), write a plan to `.ai-context/plans/YYYY-MM-DD-<topic>.md` using `_template.md`. Reference the plan from `project.tasks.md` so it's discoverable.

## Execution Contract
1. Follow `.ai-context/standards/project.rules.base.md` and `project.rules.md`.
2. One logical change per commit; tests run before commit.
3. Keep `.ai-context/` in sync with project state — route each change to the correct file:
   - New architectural decision → `project.decisions.md`
   - User-visible change → `project.changelog.md`
   - Task transition (new/done/blocked) → `project.tasks.md`
   - Plan authored → `plans/YYYY-MM-DD-<topic>.md`
   - Session close → `sessions/YYYY-MM-DD-<topic>.md`

## End-Of-Session (Mandatory)
Any repo-aware task (review, investigation, coding) is a session unless it's pure chat without repository access.

1. Write `.ai-context/sessions/YYYY-MM-DD-<topic>.md` from `_template.md`. Multiple logs per day are fine — one per topic.
2. Update `project.tasks.md`, `project.decisions.md`, `project.changelog.md` per the mapping above.

## Notes
- Higher-priority system/developer/user instructions override this file.
- Do not duplicate shared standards here; update `.ai-context/standards/` instead.
