# .ai-context/standards/

Source of truth for coding standards and workflow conventions, loaded on demand by agent adapters.

## Ownership model

| File | Owner | Edit freely? |
|---|---|---|
| `project.rules.base.md` | **AI Context** (shipped, updated by `ai-context` upgrades) | No — overrides in `project.rules.md` |
| `project.workflow.base.md` | **AI Context** (shipped, updated by `ai-context` upgrades) | No — overrides in `project.workflow.md` |
| `project.rules.md` | **Project** (your team) | Yes — project-specific overrides/additions |
| `project.workflow.md` | **Project** (your team) | Yes — project-specific overrides/additions |
| `project.<lang>.md` | **Project** (optional, created by `ai-context init`) | Yes |
| `project.testing.md` | **Project** (optional, created by `ai-context init`) | Yes |

Base files carry shared defaults that are safe across languages and projects. Your `project.rules.md` and `project.workflow.md` layer team-specific policy on top without fighting upgrades.

## Optional language/testing standards

`ai-context init` analyzes your repo and offers to create topic files for the languages and test stacks it detects. These files are fully project-owned — base AI Context never ships or updates them. Typical patterns:

- `project.typescript.md` — TS-specific rules (strict mode, import style, error handling)
- `project.python.md` — PEP conventions, typing rules, package layout
- `project.go.md` — error handling, receiver conventions, testing style
- `project.testing.md` — test strategy, coverage targets, naming conventions

If `init` doesn't create one you need, write it yourself following the same thin-file pattern (~50–150 lines). Reference it from `project.rules.md` so agents know to read it.

## When to update

- **Base files**: don't edit directly. If a shared default is wrong, open an issue against `ai-context` or override the rule in your `project.rules.md`.
- **Project files**: edit whenever a team convention changes. Note the change in `.ai-context/project.changelog.md` if it's user-visible.
