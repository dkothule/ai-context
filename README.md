# AI Agent Context Template

> A unified context system for seamless collaboration across multiple AI coding assistants

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is This?

A production-ready project template that enables **true multi-agent development** with Cursor, Claude Code, Codex, and Google Antigravity. Stop duplicating context and losing continuity when switching between AI assistants.

### The Problem

- Switching between AI coding assistants loses context
- Each agent has different configuration formats
- No shared memory between sessions or agents
- Architectural decisions get lost
- Team members (human or AI) can't see what was done

### The Solution

A centralized `.ai-context/` directory that serves as the **single source of truth** for all AI agents, with thin configuration files that route each agent to the shared context.

## Features

- ✅ **4-Agent Support** - Works with Cursor, Claude Code, Codex, and Google Antigravity
- ✅ **Session Continuity** - Mandatory session logs preserve context across sessions
- ✅ **Architecture Decision Records** - Track decisions with rationale and consequences
- ✅ **Zero Duplication** - Single source of truth for all project context
- ✅ **Standards Enforcement** - Shared coding standards, git workflow, and testing requirements
- ✅ **Task Tracking** - Lightweight task management integrated into the context system
- ✅ **Version Controlled** - All context evolves with your project in git

## Supported AI Agents

| Agent | Config File | Status |
|-------|-------------|--------|
| **Cursor** | `.cursor/rules/main.mdc` | ✅ Latest `.mdc` format |
| **Claude Code** | `CLAUDE.MD` | ✅ CLI optimized |
| **Codex** | `AGENTS.md` | ✅ Full support |
| **Google Antigravity** | `.agent/rules/rules.md` | ✅ Persona-first format |

All agents share the centralized `.ai-context/` directory.

## Quick Start

### 1. Use This Template

Click **"Use this template"** on GitHub or clone directly:

```bash
git clone https://github.com/dkothule/ai-agent-context-template.git my-project
cd my-project
```

Or apply this template to an existing project:

```bash
git clone https://github.com/dkothule/ai-agent-context-template.git
./ai-agent-context-template/scripts/apply-ai-context-template.sh /path/to/your-project
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

Move between Cursor, Claude Code, Codex, or Antigravity without losing context. All agents read from and write to the same `.ai-context/` directory.

## Project Structure

```
your-project/
├── .ai-context/                    # CENTRAL SOURCE OF TRUTH
│   ├── README.md                   # Context system overview
│   ├── project.overview.md         # START HERE - Project summary
│   ├── project.structure.md        # Directory layout
│   ├── project.tasks.md            # Active tasks
│   ├── project.backlog.md          # Feature backlog
│   ├── project.decisions.md        # Architecture decision records
│   ├── project.changelog.md        # Version history
│   ├── standards/                  # Coding standards
│   │   ├── project.rules.md        # Agent rules & session management
│   │   ├── project.workflow.md     # Git workflow
│   │   ├── project.python.md       # Python standards
│   │   └── project.testing.md      # Testing requirements
│   └── sessions/                   # Session logs (MANDATORY)
│
├── .agent/rules/rules.md           # Google Antigravity config
├── .cursor/rules/main.mdc          # Cursor config
├── CLAUDE.MD                       # Claude Code config
├── AGENTS.md                       # Codex config
│
├── src/                            # Your source code
├── tests/                          # Your tests
└── README.md                       # This file
```

## How It Works

### Session Start Protocol

Every AI agent is configured to:

1. **Read** `.ai-context/project.overview.md` - Understand project state
2. **Check** `.ai-context/project.tasks.md` - See current work
3. **Review** `.ai-context/sessions/` - Read recent session logs
4. **Consult** `.ai-context/standards/` - Follow coding standards

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
- `project.workflow.md` - Change git branching strategy

### Adding Custom Agents

To add support for a new AI agent:

1. Create its configuration file (check agent's docs for format)
2. Point it to `.ai-context/` directory
3. Ensure it follows session logging protocol
4. Update `.ai-context/README.md` with agent info

## Architecture Decision Records

This template uses ADRs (Architecture Decision Records) in `.ai-context/project.decisions.md` to track:

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

Template provided in `.ai-context/standards/project.rules.md`.

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

Switch between Cursor for feature work, Claude Code for refactoring, and Antigravity for complex debugging - without losing context.

### Team Development

Multiple developers using different AI assistants maintain consistency through shared context and standards.

### Long-Running Projects

Preserve architectural decisions and context as your project evolves over months or years.

### AI Agent Research

Experiment with different AI agents while maintaining consistent project understanding.

## Contributing

Contributions welcome! This is an open template meant to evolve with the AI coding landscape.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-improvement`)
3. Make your changes
4. Follow the existing standards in `.ai-context/standards/`
5. Create session log documenting your changes
6. Submit a Pull Request

### Ideas for Contributions

- Support for additional AI agents
- Language-specific standard templates (TypeScript, Go, Rust, etc.)
- Integration examples (CI/CD, linting, formatting)
- Improved session log templates
- Documentation improvements

## FAQ

### Q: Do I need all four AI agents?

No! Use any combination. Each agent config file is independent. Delete configs for agents you don't use.

### Q: Can I use this for non-AI development?

Yes! The context system works great for human-only teams too. Session logs become work journals, and standards ensure consistency.

### Q: How do I handle sensitive information?

Never commit credentials to `.ai-context/`. Use environment variables and document requirements in `project.overview.md`.

### Q: What if an agent doesn't follow the rules?

Agent configs may need adjustment based on your specific agent version. Check agent-specific docs and update config files as needed.

### Q: Can I customize the structure?

Absolutely! This is a template. Adapt `.ai-context/` structure to your needs. Just keep agents synced by updating their config files.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

This template synthesizes best practices from:
- Architecture Decision Records (ADRs)
- Multi-agent AI development workflows
- Modern software development practices
- Open source collaboration patterns

## Support

- **Issues**: [GitHub Issues](https://github.com/dkothule/ai-agent-context-template/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dkothule/ai-agent-context-template/discussions)

---

**Star this repo** if you find it useful! Contributions and feedback welcome.
