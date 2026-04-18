***
last_updated: [YYYY-MM-DD]
***

# Project Structure

Top-level layout of this repository. Update when major directories are added, removed, or renamed.

## Directory Layout
```
project-root/
├── .ai-context/          # AI agent shared context (single source of truth)
│   ├── project.overview.md
│   ├── project.tasks.md
│   ├── project.decisions.md
│   ├── project.changelog.md
│   ├── project.backlog.md
│   ├── project.structure.md
│   ├── plans/            # Design plans for non-trivial work
│   ├── sessions/         # Session logs (usually gitignored for adopters)
│   └── standards/        # Coding/workflow standards
├── AGENTS.md             # Shared agent adapter (canonical)
├── CLAUDE.md             # Claude Code adapter (@AGENTS.md + notes)
├── .cursor/              # Cursor adapter
└── [To be filled — describe your actual source tree]
```

## Key Entry Points
- [To be filled — main executable, library entry, or primary service]

## Important Config/Manifests
- [To be filled — e.g., `package.json`, `pyproject.toml`, `Cargo.toml`]

## Infrastructure / Deployment
- [To be filled — CI workflows, Dockerfile, deploy configs]

***

**For Agents**: Keep this in sync with actual layout. `ai-context check-drift` flags references to files that no longer exist.
