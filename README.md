# ai-context

**Shared memory for coding agents.** One `.ai-context/` directory. Every agent — Claude, Cursor, Codex, Antigravity — reads it. Sessions stop losing context.

[![npm](https://img.shields.io/npm/v/@dkothule/ai-context.svg)](https://www.npmjs.com/package/@dkothule/ai-context) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

---

## Why

You ask Claude to refactor something. Tomorrow you switch to Cursor. It has no idea what happened yesterday. Next week a teammate uses Codex — they have even less.

`ai-context` fixes this with a tiny convention:

- One shared directory (`.ai-context/`) every agent reads on session start.
- Thin "adapter" files (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules/…`) point the agents there.
- Mandatory session logs preserve decisions and state between sessions.
- Hooks guarantee context isn't lost when Claude Code auto-compacts.

Nothing fancy — just a file layout and a few scripts that work.

---

## Install

```bash
npx @dkothule/ai-context init
```

That's it. Interactive prompts pick your agents (Claude, Cursor, Codex pre-checked; Antigravity opt-in), then an LLM configures the context files from your repo.

Once installed, all commands are available as `ai-context <cmd>` (no scope prefix needed — scope is just the npm package name).

### What `init` does (≈ 30 seconds)

1. **Asks you** which agent adapters to install.
2. **Backs up** existing `.ai-context/`, `CLAUDE.md`, `AGENTS.md`, and any current agent adapters to `.ai-context-backups/<timestamp>/`. Nothing destructive happens without a safety copy.
3. **Copies templates** into your project: generic `.ai-context/` files, thin adapter wrappers (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules/main.mdc`, etc.), Claude Code hooks under `.claude/hooks/`.
4. **Runs a setup prompt** via your chosen CLI (usually `claude -p`). The agent reads your repo and personalizes `project.overview.md`, `project.structure.md`, and any language/testing standards it detects (TypeScript, Python, Go, etc.).
5. **Writes an install log** to `.ai-context/logs/install/<timestamp>.md` so you can see exactly what happened.

After `init`, start a session with any supported agent — it will read `.ai-context/` on its own. No further configuration needed.

### Other ways to install / upgrade

```bash
npm install -g @dkothule/ai-context  # global install for repeat use
ai-context init

npx @dkothule/ai-context@latest init # upgrade to latest — safely handles existing installs

ai-context apply --agents claude,cursor,codex   # non-interactive (for CI / scripts)
ai-context init --dry-run            # preview without writing
ai-context init --gitignore          # also add sessions/ + backups to .gitignore
```

**Requirements:** Node 18+. Any Unix-like shell for the Claude hooks (macOS, Linux, WSL, Git Bash on Windows).

---

## Commands

Six commands, each does one thing:

| Command | What it does |
|---|---|
| `ai-context init` | Install or upgrade. Interactive prompts for agents + setup. |
| `ai-context apply` | Same as `init`, but non-interactive (for CI/scripts). |
| `ai-context setup` | Re-run just the setup prompt (your agent configures `.ai-context/`). |
| `ai-context check-drift` | Audit `.ai-context/` vs. your actual code. Optionally apply patches. |
| `ai-context compact` | Archive old session logs to reduce noise. |
| `ai-context status` | Show installed version + schema. |
| `ai-context uninstall` | Remove everything. |

All LLM-driven commands (`setup`, `check-drift`, `compact`) work the same way: try the local `claude` CLI first with pre-approved permissions, fall back to copying a prompt to your clipboard if the CLI isn't available.

**Getting help:** every command supports `--help` (or `-h`) for full flag reference:

```bash
ai-context --help                    # list all commands
ai-context check-drift --help        # flags for a specific command
ai-context help check-drift          # same — subcommand form
```

---

## What gets installed

```
your-project/
├── .ai-context/                 # shared context (the whole point)
│   ├── project.overview.md      # what this project is
│   ├── project.tasks.md         # what's in flight
│   ├── project.decisions.md     # architecture decisions (ADRs)
│   ├── project.changelog.md     # user-visible changes
│   ├── project.backlog.md       # ideas, deferred work
│   ├── project.structure.md     # directory layout
│   ├── plans/                   # design plans (write before non-trivial work)
│   ├── sessions/                # session logs (written at session end)
│   │   └── _archive/            # rollups of old sessions (don't read at session start)
│   ├── standards/               # coding + workflow rules
│   └── logs/                    # audit log of every ai-context command run
│
├── CLAUDE.md                    # thin wrapper → @AGENTS.md
├── AGENTS.md                    # thin wrapper → points to .ai-context/
├── .cursor/rules/main.mdc       # Cursor adapter
├── .agent/rules/rules.md        # Antigravity adapter (opt-in)
├── .claude/
│   ├── hooks/                   # context-preservation hooks (see below)
│   └── settings.json            # hook registrations
└── your source code...
```

**Principle**: adapter files are thin. All real content lives in `.ai-context/`, loaded on demand by each agent. This keeps context windows clean — agents read only what they need for the current task.

---

## How agents use it

On session start, every agent follows the same tiered reading protocol:

**Always read:**
1. `project.overview.md` — project state and objectives
2. `project.changelog.md` — recent user-visible changes
3. Latest file in `sessions/` (excluding `_archive/`) — last session's handoff

**Then read based on task:**
- Writing code → `standards/project.rules.base.md` + `project.rules.md`
- Planning non-trivial work → `project.tasks.md` + `plans/`
- Continuing prior work → additional files in `sessions/`
- Language/testing specifics → relevant files in `standards/`

At session end, the agent writes a session log, updates `project.tasks.md`, logs decisions to `project.decisions.md`, and notes user-visible changes in `project.changelog.md`.

---

## Claude hooks

Claude Code gets two hooks out of the box:

- **`Stop` hook** — reminds Claude to write a session log before ending a session. Advisory (never blocks).
- **`PreCompact` hook** — before any compaction (`/compact` or auto-compact), writes the transcript to `sessions/YYYY-MM-DD-HHMM-precompact-autosave.md` so context is preserved on disk even if Claude's context window gets dropped.
- **`SessionStart(compact)` hook** — in the fresh session after compaction, injects a reminder to curate the autosave into a proper session log and delete it.

Result: you can never lose working context to compaction. The autosave captures it, the reminder ensures it gets curated next turn.

---

## Drift detection

Over time, `.ai-context/` drifts from your actual code. Files get renamed, architecture evolves, the overview goes stale. `check-drift` catches this:

```bash
ai-context check-drift                # analyze + write report to .ai-context/logs/drift/
ai-context check-drift --static-only  # fast local checks only (no LLM)
ai-context check-drift --copy         # write report + copy follow-up prompt to clipboard
ai-context check-drift --print        # print the analysis prompt to stdout (no file, no execute)
ai-context check-drift --dry-run      # preview what would happen; no files written
```

Two layers:

1. **Static checks** (local, fast): broken refs in `project.structure.md`, stale `last_updated` frontmatter, "In Progress" tasks with no recent commits, backlog items older than 90 days.
2. **LLM analysis** (optional, via `claude -p`): compares overview/structure/decisions against recent git log + tree, produces a structured report with severity-tagged patches (`[significant]`, `[moderate]`, `[minor]`).

Reports land in `.ai-context/logs/drift/<timestamp>-drift.md`.

### Auto-applying patches with `--fix`

`--fix [severity]` runs drift analysis, **then** invokes a second LLM pass that reads the report and applies matching patches. The severity argument is a **cutoff** — patches at that severity and anything more critical are applied:

```bash
ai-context check-drift --fix               # default: only [significant] patches
ai-context check-drift --fix=significant   # same as above — most critical only
ai-context check-drift --fix=moderate      # [significant] + [moderate]
ai-context check-drift --fix=minor         # everything (includes cleanup/polish items)
ai-context check-drift --fix=all           # alias for minor — full YOLO
ai-context check-drift --fix --dry-run     # print what would be patched, don't write anything
```

Tip: snapshot `.ai-context/` first (`cd .ai-context && git add -A && git commit -m "pre-fix"`) if you want an easy rollback. The fix step edits files in place; reviewing a clean diff afterwards is the safety net.

---

## Session compaction

Session logs accumulate. After a few months you'll have dozens; after a year, hundreds. That noise makes "read the latest session at session start" less useful because there's too much "latest" to sort through.

`ai-context compact` summarizes old sessions into a single rollup file and deletes the originals — keeping `sessions/` focused on recent, actionable context without losing long-term history.

```bash
ai-context compact --dry-run                 # preview what would be archived (safe)
ai-context compact                           # archive > 30 days old, keep latest 10
ai-context compact --older-than 90           # only > 90 days old
ai-context compact --keep 20                 # always preserve the newest 20
ai-context compact --older-than 90 --keep 50 # combine
ai-context compact --copy                    # prompt → clipboard, skip CLI execution
ai-context compact --print                   # prompt → stdout, for pipes
ai-context compact --cli codex               # force a specific CLI
```

**What happens:**
1. Selects sessions that are older than `--older-than` days AND outside the latest `--keep`.
2. Builds an LLM prompt listing the selected files + a rollup template.
3. The agent reads each file, extracts decisions / open threads / file knowledge, writes a rollup at `.ai-context/sessions/_archive/YYYY-MM-rollup.md`, deletes the originals.
4. An operation log lands at `.ai-context/logs/compact/<ts>.md`.

**Rollup format** (`sessions/_archive/YYYY-MM-rollup.md`):

```markdown
---
archived: true
range_start: 2026-02-27
range_end: 2026-03-03
source_count: 4
---

# Archived sessions 2026-02-27 → 2026-03-03

## Decisions carried forward
- ADRs 007–011 added for agent architecture; source: 2026-02-27-bootstrap-ai-context.md
- ...

## Open threads at end of range
- Architecture diagram not yet created; source: ...

## File/area knowledge
- knowledge/: runtime content lives under live/, staging area under staging/

## Archived sessions
- 2026-02-27-bootstrap-ai-context.md — one-line summary
- ...
```

`archived: true` in frontmatter + the `_archive/` README tell agents to skip this folder at session start. `grep` still works when you need a specific historical answer.

If the result isn't what you wanted → see **Safety & rollback** below.

---

## Audit trail

Every command that produces meaningful output writes a log to `.ai-context/logs/`:

```
.ai-context/logs/
├── install/       # ai-context init / apply
├── setup/         # ai-context setup
├── drift/         # ai-context check-drift reports
└── compact/       # ai-context compact operations
```

Logs are append-only — past runs aren't overwritten on upgrade. Review them to see what `ai-context` did to your project, when, and what the agent said.

Most adopters gitignore `.ai-context/logs/` since logs are machine-local and noisy.

---

## Safety & rollback

Everything `ai-context` does is reversible. Three scenarios, three recovery paths.

### Before running anything risky — snapshot `.ai-context/`

If you track `.ai-context/` in git (recommended), make a snapshot before any LLM-driven command. This gives you a one-command rollback:

```bash
cd .ai-context
git add -A && git commit -m "snapshot before <command>"
cd ..

# run whatever
ai-context check-drift --fix
# or
ai-context compact
# or
ai-context init
```

If the outcome isn't what you want:

```bash
cd .ai-context
git checkout -- .           # revert tracked changes
git clean -fd               # remove untracked files (rollup, logs, etc.)
```

### `check-drift --fix` edited files you don't like

```bash
cd .ai-context
git diff project.structure.md project.overview.md   # review what changed
git checkout -- project.structure.md                 # revert one file
# or
git checkout -- .                                    # revert everything
```

The original drift report stays in `logs/drift/<ts>-drift.md` — you can re-read what was supposed to change and cherry-pick manually.

### `compact` deleted sessions you wanted back

```bash
cd .ai-context
git checkout -- sessions/                           # restores deleted session files
rm sessions/_archive/<YYYY-MM>-rollup.md            # remove the rollup (it's untracked)
```

The rollup file itself is valuable reading before deletion — it distilled what was in those sessions. Review it first, then decide.

### `init` / `apply` (upgrade) went wrong

Every install backs up the pre-install state automatically. No git required:

```bash
ls .ai-context-backups/                              # list timestamped backups
# 20260418-081533-19339/   ← pick one

TARGET=20260418-081533-19339
# restore (overwrites current state):
rm -rf .ai-context .cursor .agent .claude/hooks AGENTS.md CLAUDE.md
cp -R .ai-context-backups/$TARGET/* .
```

Or just re-run `ai-context init` against any version — the installer handles downgrades and re-applies cleanly.

### Full uninstall

```bash
ai-context uninstall --dry-run                       # preview what will be removed
ai-context uninstall                                 # remove everything ai-context installed
```

Your source code, git history, and non-AI-Context files are never touched by any of these commands.

---

## Customization

### Agent adapters are thin on purpose

`CLAUDE.md` is literally one line (`@AGENTS.md`) plus a few Claude-specific notes. `AGENTS.md` is ~40 lines. Neither duplicates content from `.ai-context/`. If you want to add project-specific rules, edit `.ai-context/standards/project.rules.md` — not the adapters.

### Language/testing standards are created per-project

The installer doesn't ship example `project.python.md` or `project.testing.md`. Instead, `ai-context init`'s setup prompt analyzes your repo and creates the right standards files based on what it finds (TypeScript, Python, Go, etc.). You can always add more by hand later.

### Sessions stay local if you want

```bash
ai-context init --gitignore        # adds .ai-context/sessions/ and backups to .gitignore
```

Many teams keep session logs local (personal) while committing the rest of `.ai-context/`. Your call.

---

## Supported agents

| Agent | Adapter | CLI support for `setup`/`check-drift`/`compact` |
|---|---|---|
| **Claude Code** | `CLAUDE.md` + `.claude/hooks/` + `settings.json` | ✅ `claude -p` (primary) |
| **Cursor** | `.cursor/rules/main.mdc` | IDE only — paste from clipboard |
| **Codex / OpenAI agents** | `AGENTS.md` | ✅ `codex` (prompt execution) |
| **Google Antigravity** | `.agent/rules/rules.md` | IDE only |
| **Google Gemini** | (no adapter) | ✅ `gemini -p` (if installed) |
| **GitHub Copilot** | _(not shipped — incompatible with Copilot's auto-review + can't resolve relative links; backlog: generate a self-contained instructions file)_ | N/A |

All agents read `.ai-context/`. The CLI column affects whether `ai-context setup/check-drift/compact` can execute the LLM prompt directly vs. copy it to your clipboard for manual paste.

---

## FAQ

**Do I need all the agents?**
No. Pick whatever combo you use during `init`. Rest of the flow is identical.

**Can I use this without AI?**
Yes. Session logs become work journals, standards ensure consistency. Works fine for human-only teams.

**How do I handle secrets?**
Never commit them to `.ai-context/`. Reference environment variables in `project.overview.md` — don't store values.

**What if I want to roll back a change?**
Every action is reversible. See the [Safety & rollback](#safety--rollback) section for recovery paths after `check-drift --fix`, `compact`, or `init`/upgrade.

**Does it work on Windows?**
Yes, via Git Bash or WSL. Native PowerShell equivalents are on the backlog.

**What's the upgrade path?**
Just re-run `npx @dkothule/ai-context@latest init`. The installer detects existing installs, backs up, upgrades the installer-managed files, and preserves everything project-owned (your overview, tasks, decisions, history, custom standards).

**Something went wrong — how do I see what happened?**
Check `.ai-context/logs/install/` for the latest install, `.ai-context/logs/setup/` for agent output, `.ai-context-backups/<timestamp>/` for pre-upgrade state.

---

## Architecture

Deep dive with mermaid diagrams covering every command and flow: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

Short version:

- **Single source of truth**: `.ai-context/` holds all governance. Adapters are thin pointers.
- **Base vs. local standards**: `project.rules.base.md` ships with the tool (upgraded automatically); `project.rules.md` is project-owned (never overwritten).
- **Ownership-based restore**: on upgrade, tool-owned files are replaced, project-owned files are restored from backup by path pattern. Custom files you add are preserved.
- **Session logs are mandatory**: enforced by Claude's Stop hook as a reminder, by the adapter files as an instruction, and by the Session Start protocol as a reading habit.
- **Hooks, not humans, preserve compaction context**: PreCompact autosaves before Claude Code drops the transcript; SessionStart(compact) reminds the next session to curate.

---

## On the horizon

Ideas on the near-term roadmap. Directions, not commitments — open an issue if one would unblock you.

- **Windows-native hooks** — drop the Git Bash / WSL dependency with PowerShell or Node equivalents for the three Claude hooks.
- **Self-contained GitHub Copilot adapter** — a generator command that builds a flat `.github/copilot-instructions.md` by synthesizing `.ai-context/` content, since Copilot can't resolve relative links the way CLAUDE.md / AGENTS.md can.
- **First-class Codex support** — non-interactive permission flags for the `codex` CLI so `setup` / `check-drift` / `compact` run cleanly end-to-end instead of falling back to clipboard.
- **Plugin system** — register custom static drift checks or additional "Read First" files without forking the tool.
- **`ai-context export`** — dump a flattened snapshot of `.ai-context/` (markdown bundle + manifest) for offline sharing, incident tickets, or attaching to bug reports.
- **`check-drift --fix` operation log** — persist what the fix pass edited/skipped alongside the drift report (today only the analysis is logged; the apply step is terminal-only).

---

## Contributing

PRs welcome. The tool should stay small and sharp.

1. Fork, branch off `main`.
2. `cd packages/cli && npm install && npm test` to confirm the 73-test suite passes.
3. Follow standards in `.ai-context/standards/`.
4. Write a session log for non-trivial changes.
5. Open a PR.

For ideas not listed above, open a GitHub issue — discussion before code is welcome.

---

## License

MIT — see [LICENSE](./LICENSE).
