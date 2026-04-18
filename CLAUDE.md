@AGENTS.md

## Claude Code

Claude Code reads `CLAUDE.md` (not `AGENTS.md`) — the `@AGENTS.md` import above pulls in the shared adapter so both tools use one source of truth. Claude-specific notes only below.

- **Plan mode**: use `/plan` before multi-file refactors or architectural changes. Write the plan to `.ai-context/plans/` if the user approves.
- **Compaction**: a `PreCompact` hook blocks `/compact` if no session log has been edited recently (within 30 min by default — override via `AI_CONTEXT_PRECOMPACT_STALENESS_MINUTES`). Auto-compaction autosaves the transcript to `.ai-context/sessions/YYYY-MM-DD-HHMM-precompact-autosave.md`; review and curate it in the next turn, then delete the autosave.
- **Permissions**: `ai-context setup`/`compact`/`check-drift` run with `--permission-mode acceptEdits` by default. Override via `--permission-mode <mode>` if you need stricter/looser permissions.
