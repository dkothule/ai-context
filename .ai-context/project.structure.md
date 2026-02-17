***
last_updated: 2026-02-16 17:46:21
***

# Project Structure

## Directory Layout
```
project-root/
├── .ai-context/           # AI agent shared context (CENTRAL SOURCE OF TRUTH)
│   ├── README.md          # Context system overview
│   ├── project.overview.md    # Project summary and objectives
│   ├── project.structure.md   # This file - directory layout
│   ├── project.tasks.md       # Active tasks
│   ├── project.backlog.md     # Feature backlog
│   ├── project.decisions.md   # Architecture decision records
│   ├── project.changelog.md   # Version history
│   ├── standards/         # Coding standards
│   │   ├── project.rules.md      # Agent rules and session management
│   │   ├── project.workflow.md   # Git workflow
│   │   ├── project.python.md     # Python standards
│   │   └── project.testing.md    # Testing standards
│   └── sessions/          # Session logs (MANDATORY)
│       └── .gitkeep
│
├── .agent/                # Google Antigravity configuration
│   └── rules/
│       └── rules.md       # Antigravity agent rules
│
├── .cursor/               # Cursor IDE configuration
│   └── rules/
│       └── main.mdc       # Cursor agent rules
│
├── .github/               # GitHub Copilot configuration
│   └── copilot-instructions.md
│
├── CLAUDE.md              # Claude Code configuration
├── AGENTS.md              # Codex agent configuration
├── .gitignore             # Git ignore rules
│
├── src/                   # Source code (to be created)
├── tests/                 # Test files (to be created)
├── docs/                  # Documentation (to be created)
├── config/                # Configuration files (to be created)
├── scripts/               # Utility scripts (to be created)
└── README.md              # Project README (to be created)
```

## Multi-Agent Configuration

### Supported AI Agents
This project is configured for seamless use with multiple AI coding assistants:

- **Cursor** → `.cursor/rules/main.mdc`
- **Claude Code** → `CLAUDE.md` (root)
- **Codex** → `AGENTS.md` (root)
- **GitHub Copilot** → `.github/copilot-instructions.md`
- **Google Antigravity** → `.agent/rules/rules.md`

All agents share context through the `.ai-context/` directory.

## Key Locations
- **AI Context**: `.ai-context/` - All AI agent coordination files (READ FIRST)
- **Session Logs**: `.ai-context/sessions/` - Work session history (MANDATORY)
- **Standards**: `.ai-context/standards/` - Coding and workflow standards
- **Source Code**: `src/` - Main application code
- **Tests**: `tests/` - Unit and integration tests
- **Documentation**: `docs/` - Project documentation
- **Configuration**: `config/` - Environment and app configurations
- **Scripts**: `scripts/` - Build, deployment, and utility scripts

## Important Files
- Entry point: [To be determined]
- Configuration: [To be determined]
- Dependencies: [To be determined]

## Notes
This file should be updated whenever the project structure changes significantly.
