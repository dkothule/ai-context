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

Before non-trivial work (multi-session, architectural change, external dependency), write a plan to `.ai-context/plans/YYYY-MM-DD-<topic>.md` using `_template.md`. Reference the plan from `project.tasks.md` so it's discoverable. After plan approval, write the file immediately — before any implementation begins.

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

## Hooks (per-agent)

AI Context installs session-management hooks to automate session logging and (where possible) preserve transcript context across compaction. Coverage by agent:

| Agent | Session-end log reminder | Pre-compact autosave | Post-compact reminder |
|---|---|---|---|
| **Claude Code** (`.claude/settings.json`) | ✅ `Stop` hook | ✅ `PreCompact` hook | ✅ `SessionStart(compact)` hook |
| **Cursor** (`.cursor/hooks.json`) | ✅ `sessionEnd` hook | ✅ `preCompact` hook | ✅ `sessionStart` hook (JSON `additional_context`) |
| **Codex** (`.codex/hooks.json`) | ✅ `Stop` hook | ✅ `PreCompact` hook | ✅ `PostCompact` + `SessionStart` hooks |

When curating a pre-compact autosave into a normal session log, preserve the autosave filename as `source_autosave` and copy its `local_transcript_ref` when present. Older autosaves may use `transcript_ref`; copy that value into `local_transcript_ref`. The reference is a local/private fallback for recovering exact prior discussion after compaction; the curated session log remains the durable handoff. Redact `local_transcript_ref` if session logs will be shared and the local path should not be exposed.

For all agents, `ai-context setup` / `compact` / `check-drift` run the prompt non-interactively through a coding-agent CLI. They default to the CLI saved in `.ai-context/manifest.json` (`configured_cli`) — set when you pick a CLI during `init`/`setup`, changeable later with `ai-context use [cli]`. A per-run `--cli <name>` flag overrides it. If nothing is configured, they auto-detect Claude (`claude`), Codex (`codex`), or Cursor (`agent`, with fallback to legacy `cursor-agent`) on PATH. If no CLI is available or authenticated, the prompt is copied to your clipboard so you can paste it into your agent window.

## Notes
- Higher-priority system/developer/user instructions override this file.
- Do not duplicate shared standards here; update `.ai-context/standards/` instead.
