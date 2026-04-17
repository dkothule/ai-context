# AI Context: Shared Memory for Coding Agents

> Persistent context across sessions, tools, and teams

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is This?

A production-ready, open-source memory layer for **true multi-agent development** with Claude, Cursor, Codex, Gemini, Antigravity, and more. Stop losing context when switching between AI assistants or starting a new session.

### The Problem

- Switching between AI coding assistants loses context
- Each agent has different configuration formats
- No shared memory between sessions or agents
- Architectural decisions get lost
- Team members (human or AI) can't see what was done

### The Solution

A centralized `.ai-context/` directory that serves as the **single source of truth** for all AI agents, with thin configuration files that route each agent to the shared context.

## Features

- ✅ **Multi-Agent Support** - Works with Claude, Cursor, Codex, Antigravity, and more
- ✅ **Session Continuity** - Mandatory session logs preserve context across sessions
- ✅ **Architecture Decision Records** - Track decisions with rationale and consequences
- ✅ **Zero Duplication** - Single source of truth for all project context
- ✅ **Standards Enforcement** - Shared coding standards, git workflow, and testing requirements
- ✅ **Task Tracking** - Lightweight task management integrated into the context system
- ✅ **Version Controlled** - All context evolves with your project in git
- ✅ **Session Log Reminder** - Claude Code Stop hook reminds you to create a session log before ending

## Supported AI Agents

| Agent | Config File | Status |
|-------|-------------|--------|
| Agent | Adapter File | Has CLI? |
|-------|-------------|----------|
| **Claude** | `CLAUDE.md` + `.claude/hooks/` | ✅ `claude` — streaming setup |
| **Cursor** | `.cursor/rules/main.mdc` | No (IDE only) |
| **Codex** | `AGENTS.md` | ✅ `codex` — prompt execution |
| **Antigravity** | `.agent/rules/rules.md` | No (`agy` — no prompt execution) |
| **Gemini** | *(no adapter yet)* | ✅ `gemini` — prompt execution |

All agents share the centralized `.ai-context/` directory. Agents with a CLI (Claude, Codex, Gemini) can run the setup prompt automatically to configure your project. Other agents use the same shared context via their adapter files.

## Quick Start

### 1. Install AI Context

```bash
npx ai-context init
```

The interactive flow:
1. **Confirm** target directory
2. **Select agent adapters** to install (Claude, Cursor, Codex pre-checked; Antigravity opt-in)
3. **Install** — copies adapter files, backs up existing files, restores project-owned content
4. **Select CLI agent** for project configuration (claude, codex, gemini, or manual paste)
5. **Run setup** — the CLI agent analyzes your repo and configures `.ai-context/` files

Install globally for repeated use:

```bash
npm install -g ai-context
ai-context init
```

### Other Commands

```bash
ai-context setup               # Re-run setup (pick a CLI agent to configure project)
ai-context setup --cli claude   # Skip picker, use claude directly
ai-context setup --print        # Print setup prompt for manual paste
ai-context status               # Show installed version, schema, agent adapters
ai-context version              # Show CLI version
ai-context apply <path>         # Non-interactive install (CI/scripts)
ai-context uninstall <path>     # Remove AI Context from a project
ai-context init --dry-run       # Preview without writing
ai-context init --gitignore     # Also add sessions/ and backups/ to .gitignore
```

### 2. Customize for Your Project

Edit `.ai-context/project.overview.md`:

```markdown
## Project Name
Your Awesome Project

## Mission
[One sentence describing your project's purpose]

## Tech Stack
- Language: Python 3.11
- Framework: FastAPI
- Database: PostgreSQL
```

### 3. Start Coding with Any Agent

The AI agents will automatically:
- Read the shared context on session start
- Follow your defined standards
- Log their work for continuity
- Update task status and decisions

### 4. Switch Agents Seamlessly

Move between Claude, Cursor, Codex, Gemini, or Antigravity without losing context. All agents read from and write to the same `.ai-context/` directory.

## Project Structure

```
your-project/
├── .ai-context/                    # CENTRAL SOURCE OF TRUTH
│   ├── manifest.json               # Installed AI Context version + schema metadata
│   ├── README.md                   # Context system overview
│   ├── project.overview.md         # START HERE - Project summary
│   ├── project.structure.md        # Directory layout
│   ├── project.tasks.md            # Active tasks
│   ├── project.backlog.md          # Feature backlog
│   ├── project.decisions.md        # Architecture decision records
│   ├── project.changelog.md        # Version history
│   ├── standards/                  # Coding standards
│   │   ├── project.rules.base.md   # AI Context-owned shared rules
│   │   ├── project.rules.md        # Project-owned rule overrides
│   │   ├── project.workflow.base.md # AI Context-owned workflow baseline
│   │   ├── project.workflow.md     # Project-owned workflow overrides
│   │   ├── project.python.md       # Python standards
│   │   └── project.testing.md      # Testing requirements
│   └── sessions/                   # Session logs (MANDATORY)
│
├── .agent/rules/rules.md           # Antigravity config
├── .claude/                        # Claude Code hooks & settings
│   ├── hooks/
│   │   └── session-log-check.sh    # Stop hook: reminds agent to create session log
│   └── settings.json               # Hook configuration (merged on install)
├── .cursor/rules/main.mdc          # Cursor config
├── CLAUDE.md                       # Claude Code config
├── AGENTS.md                       # Codex config
│
├── src/                            # Your source code (in your project)
│
└── README.md                       # This file
```

## How It Works

### Session Start Protocol

Agents use a **tiered reading strategy** to minimize context usage while maintaining orientation:

**Always read** (essential orientation):
1. `.ai-context/project.overview.md` — project state and objectives
2. `.ai-context/project.changelog.md` — recent changes
3. Latest file in `.ai-context/sessions/` — last session's handoff notes

**Then read based on task:**
- **Writing/modifying code** → `standards/project.rules.base.md`, `standards/project.rules.md`
- **Planning or scoping work** → `project.tasks.md`
- **Understanding codebase layout** → `project.structure.md`
- **Continuing prior work** → additional files in `sessions/`
- **Language/testing specifics** → relevant files in `standards/`

> **Why tiered reading?** AI agents have finite context windows. Loading every project file upfront wastes that budget on information irrelevant to the current task — and pushes out the actual code and conversation that matter. The tiered approach front-loads only what every task needs (orientation + recent history), then lets agents pull in additional context on demand based on what they're actually doing. The result: agents stay grounded in the latest project state, carry forward session continuity, and still have room for deep, high-quality work.

### During Development

Agents follow shared standards:
- Git workflow (feature branches, conventional commits)
- Testing requirements (80% coverage minimum)
- Code style (language-specific standards)
- Documentation practices

### Session End Protocol (Mandatory)

Before ending any session, agents **must**:

1. Create session log in `.ai-context/sessions/YYYY-MM-DD-topic.md`
2. Update `.ai-context/project.tasks.md` with progress
3. Log significant decisions in `.ai-context/project.decisions.md`
4. Update `.ai-context/project.changelog.md` if user-facing changes

This ensures perfect continuity across agents and sessions.

#### Automated Reminder (Claude Code)

Claude Code includes a **Stop hook** (`.claude/hooks/session-log-check.sh`) that reminds Claude to create a session log when one doesn't exist for the current date. It exits 0 (advisory) rather than blocking — using `exit 2` to force-continue would cause an infinite loop since the Stop event fires after every turn. Other agents rely on their instruction files to encourage session logging.

## Customization Guide

### Adding Language-Specific Standards

Create files in `.ai-context/standards/`:
- `project.typescript.md` - TypeScript conventions
- `project.go.md` - Go coding standards
- `project.rust.md` - Rust best practices

Update agent config files to reference your new standards.

### Adapting Standards

Edit existing files in `.ai-context/standards/`:
- `project.python.md` - Modify Python style guide
- `project.testing.md` - Adjust coverage requirements
- `project.rules.md` - Add project-specific rule overrides
- `project.workflow.md` - Add project-specific workflow overrides

AI Context-owned baseline files:
- `project.rules.base.md`
- `project.workflow.base.md`

Keep project-specific deltas in `project.rules.md` and `project.workflow.md`; avoid copying baseline sections into local files.

### Versioned Upgrades

The installer tracks the applied AI Context release in `.ai-context/manifest.json`.

- `version` follows semantic versioning for AI Context releases.
- `schema_version` tracks installer-relevant `.ai-context` layout changes.
- `apply_mode` records whether the run was a `fresh-install`, `legacy-upgrade`, `upgrade`, or `reapply`.
- Legacy installs using `.ai-context/template.manifest.json` are migrated automatically on upgrade.

Treat `manifest.json` as installer-managed metadata. Project-specific content should live in the `project.*`, `sessions/`, and local standards files instead.

Custom files and directories under `.ai-context/**` are treated as project-owned by default unless they match one of the installer-managed paths above.

### Adding Custom Agents

To add support for a new AI agent:

1. Create its configuration file (check agent's docs for format)
2. Point it to `.ai-context/` directory
3. Ensure it follows session logging protocol
4. Update `.ai-context/README.md` with agent info

## Architecture Decision Records

AI Context uses ADRs (Architecture Decision Records) in `.ai-context/project.decisions.md` to track:

- Why decisions were made
- What alternatives were considered
- What consequences are expected

Example:

```markdown
## Decision 1: Multi-Agent AI Context System

**Date**: 2025-11-20

**Context**: Working with multiple AI assistants, need consistent context

**Decision**: Centralized .ai-context/ directory with agent-specific configs

**Consequences**:
- ✅ Consistent context across all agents
- ✅ Single source of truth
- ⚠️ Requires discipline to keep updated
```

## Session Logging

Session logs in `.ai-context/sessions/` are **mandatory** and serve as:

- Work history documentation
- Context for future sessions
- Handoff notes between agents
- Decision rationale preservation

AI Context baseline provided in `.ai-context/standards/project.rules.base.md` and `.ai-context/standards/project.rules.md`, with install metadata in `.ai-context/manifest.json`.

## Best Practices

### Do's ✅

- Update context files as you work (not just at the end)
- Write clear, detailed session logs
- Log architectural decisions with rationale
- Follow the git workflow (feature branches, PRs)
- Run tests before committing

### Don'ts ❌

- Don't commit directly to main
- Don't skip session logging
- Don't commit untested code
- Don't ignore context file updates
- Don't hardcode credentials

## Use Cases

### Solo Developer with Multiple AI Tools

Switch between Cursor for feature work, Claude for refactoring, and Gemini for complex debugging — without losing context.

### Team Development

Multiple developers using different AI assistants maintain consistency through shared context and standards.

### Long-Running Projects

Preserve architectural decisions and context as your project evolves over months or years.

### AI Agent Research

Experiment with different AI agents while maintaining consistent project understanding.

## Contributing

Contributions welcome. AI Context is meant to evolve with the AI coding landscape.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-improvement`)
3. Make your changes
4. Follow the existing standards in `.ai-context/standards/`
5. Create session log documenting your changes
6. Submit a Pull Request

### Ideas for Contributions

- Support for additional AI agents
- Language-specific standard packs (TypeScript, Go, Rust, etc.)
- Integration examples (CI/CD, linting, formatting)
- Improved session log templates
- Documentation improvements

## FAQ

### Q: Do I need all the AI agents?

No! Use any combination. Select only the adapters you need during `ai-context init`. Each agent config file is independent.

### Q: Can I use this for non-AI development?

Yes! The context system works great for human-only teams too. Session logs become work journals, and standards ensure consistency.

### Q: How do I handle sensitive information?

Never commit credentials to `.ai-context/`. Use environment variables and document requirements in `project.overview.md`.

### Q: What if an agent doesn't follow the rules?

Agent configs may need adjustment based on your specific agent version. Check agent-specific docs and update config files as needed.

### Q: Can I customize the structure?

Absolutely. Adapt `.ai-context/` structure to your needs. Just keep agents synced by updating their config files.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

AI Context synthesizes best practices from:
- Architecture Decision Records (ADRs)
- Multi-agent AI development workflows
- Modern software development practices
- Open source collaboration patterns

## Support

- **Issues**: [GitHub Issues](https://github.com/dkothule/ai-context/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dkothule/ai-context/discussions)

---

**Star this repo** if you find it useful! Contributions and feedback welcome.
