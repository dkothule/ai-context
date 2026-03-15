***
last_updated: 2026-03-15 00:00:00
***

# Project Structure

## Directory Layout
```
project-root/
├── .ai-context/           # AI agent shared context (CENTRAL SOURCE OF TRUTH)
│   ├── manifest.json      # Installer-managed AI Context version metadata
│   ├── README.md          # Context system overview
│   ├── project.overview.md    # Project summary and objectives
│   ├── project.structure.md   # This file - directory layout
│   ├── project.tasks.md       # Active tasks
│   ├── project.backlog.md     # Feature backlog
│   ├── project.decisions.md   # Architecture decision records
│   ├── project.changelog.md   # Version history
│   ├── standards/         # Coding standards
│   │   ├── project.rules.base.md # AI Context-owned shared rules
│   │   ├── project.rules.md      # Project-owned rule overrides
│   │   ├── project.workflow.base.md # AI Context-owned workflow baseline
│   │   ├── project.workflow.md   # Project-owned workflow overrides
│   │   ├── project.python.md     # Python standards
│   │   └── project.testing.md    # Testing standards
│   └── sessions/          # Session logs (MANDATORY)
│       └── .gitkeep
│
├── .ai-context-setup/     # AI Context installer setup prompts (AI Context-owned)
│   └── SETUP-PROMPTS.md   # Post-install/upgrade agent prompts
│
├── .agent/                # Google Antigravity configuration
│   └── rules/
│       └── rules.md       # Antigravity agent rules
│
├── .claude/               # Claude Code hooks & settings
│   ├── hooks/
│   │   └── session-log-check.sh  # Stop hook: enforces session log creation
│   └── settings.json      # Hook configuration (merged on install)
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
├── tests/
│   ├── test-ai-context-installer.sh   # Release validation for installer flows
│   └── test-ai-context-uninstaller.sh # Release validation for uninstall flows
├── docs/                  # Documentation (to be created)
├── config/                # Configuration files (to be created)
├── scripts/
│   ├── ai-context.sh            # Installer entrypoint
│   └── uninstall-ai-context.sh  # Uninstall utility
└── README.md              # Project README (to be created)
```

## Multi-Agent Configuration

### Supported AI Agents
This project is configured for seamless use with multiple AI coding assistants:

- **Cursor** → `.cursor/rules/main.mdc`
- **Claude Code** → `CLAUDE.md` (root) + `.claude/hooks/session-log-check.sh` (Stop hook)
- **Codex** → `AGENTS.md` (root)
- **GitHub Copilot** → `.github/copilot-instructions.md`
- **Google Antigravity** → `.agent/rules/rules.md`

All agents share context through the `.ai-context/` directory.

## Key Locations
- **AI Context**: `.ai-context/` - All AI agent coordination files (READ FIRST)
- **AI Context Metadata**: `.ai-context/manifest.json` - installed AI Context version and schema
- **Session Logs**: `.ai-context/sessions/` - Work session history (MANDATORY)
- **Standards**: `.ai-context/standards/` - Coding and workflow standards
- **Source Code**: `src/` - Main application code
- **Tests**: `tests/` - Unit and integration tests
- **Documentation**: `docs/` - Project documentation
- **Configuration**: `config/` - Environment and app configurations
- **Scripts**: `scripts/` - Install, uninstall, and post-apply utility scripts

## Important Files
- Entry point: [To be determined]
- Configuration: [To be determined]
- Dependencies: [To be determined]

## Notes
This file should be updated whenever the project structure changes significantly.
