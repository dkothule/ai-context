---
archived: true
---

# `.ai-context/logs/`

Append-only audit trail of `ai-context` command runs. Written by the CLI, not by you or your agent.

## Structure

```
logs/
├── install/      # ai-context init / apply — backup, copy, merge, restore, setup output
├── setup/        # ai-context setup — agent's output when run independently
├── drift/        # ai-context check-drift — static findings + LLM drift reports
└── compact/      # ai-context compact — selection, rollup, deletions
```

Each file is named `YYYY-MM-DDTHH-MM-SS[-<suffix>].md`.

## For agents: do NOT read this folder at session start

Logs are historical audit evidence, not current state. Reading them unconditionally bloats context.

- **Don't** include `logs/` in your "Read First" scan.
- **Do** read specific files when a user says "what did the last install do?" or when `check-drift`/`compact` point you at a specific report.

The `archived: true` frontmatter on this README marks the folder as reference-only (same convention as `sessions/_archive/`).

## Gitignore

Install logs and drift reports can include machine-specific paths, timestamps, and large LLM outputs. Most adopters should gitignore them. Either:

```gitignore
.ai-context/logs/
```

in the project root, or run `ai-context init --gitignore` (the flag auto-adds common ignores).

## Lifecycle

- The installer creates subdirectories on first use — they may not all exist until the corresponding command runs.
- Logs accumulate indefinitely. Use `ai-context compact` periodically on session logs (separate flow) — there is no auto-prune for `logs/` today.
- Safe to manually delete old log files if the directory grows large.
