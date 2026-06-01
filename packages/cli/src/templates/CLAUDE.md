@AGENTS.md

## Claude Code

Claude Code reads `CLAUDE.md` (not `AGENTS.md`) — the `@AGENTS.md` import above pulls in the shared adapter so both tools use one source of truth. Claude-specific notes only below.

- **Plan mode**: use `/plan` before multi-file refactors or architectural changes. Once approved, immediately write the plan to `.ai-context/plans/YYYY-MM-DD-<topic>.md` before beginning any implementation.
- **Compaction**: a `PreCompact` hook autosaves the working transcript to `.ai-context/sessions/YYYY-MM-DD-HHMM-precompact-autosave.md` before every compaction (manual `/compact` or auto) so context is never lost. A `SessionStart(compact)` hook then reminds the fresh session via injected context — review the autosave, curate it into a proper session log, record the autosave filename as `source_autosave`, copy its `local_transcript_ref` if present, then delete the autosave.
- **Permissions**: `ai-context setup`/`compact`/`check-drift` run with `--permission-mode acceptEdits` by default. Override via `--permission-mode <mode>` if you need stricter/looser permissions.
