# Codex Agent Instructions

## Centralized Context System

This project uses a **shared AI context system** located in `.ai-context/`. This directory is the single source of truth shared across multiple AI coding agents (Cursor, Claude Code, and Codex).

## Session Start Protocol

Every time you start working, follow this sequence:

1. **Read** `.ai-context/project.overview.md` - Understand the project goals and current state
2. **Check** `.ai-context/project.tasks.md` - See what's currently being worked on
3. **Review** `.ai-context/project.structure.md` - Understand the codebase layout
4. **Consult** relevant files in `.ai-context/standards/` - Follow project conventions

## Development Standards

### Coding Standards
- **Python**: See `.ai-context/standards/project.python.md`
- **Testing**: See `.ai-context/standards/project.testing.md`
- **General**: See `.ai-context/standards/project.rules.md`

### Git Workflow
Reference `.ai-context/standards/project.workflow.md` for detailed git practices:

**Core Principles:**
- ✅ Always work on feature branches
- ✅ Run complete test suite before committing
- ✅ Use pull requests for all merges to main
- ✅ Write clear, conventional commit messages
- ❌ Never commit directly to main branch
- ❌ Never commit code without tests
- ❌ Never ignore failing tests

## Session End Protocol

Before ending your coding session, complete these steps:

1. **Update progress** in `.ai-context/project.tasks.md`
   - Mark completed items
   - Update in-progress items with current status
   - Add any blockers encountered

2. **Log decisions** in `.ai-context/project.decisions.md`
   - Record any significant architectural choices
   - Include context, decision, and consequences

3. **Update changelog** in `.ai-context/project.changelog.md`
   - Add user-facing changes
   - Use ISO 8601 timestamp format (YYYY-MM-DD HH:MM:SS)

4. **Create session notes** in `.ai-context/sessions/YYYY-MM-DD-session-notes.md`
   - Summarize work completed
   - Note any issues or blockers
   - Outline next steps

## Multi-Agent Coordination

**Critical Understanding**: You share this codebase with other AI agents.

### Why Context Files Matter
- **Continuity**: Work continues across agents and sessions
- **Consistency**: All agents follow the same standards
- **Collaboration**: Agents can build on each other's work
- **Traceability**: Decision history is preserved

### Your Responsibility
Keep `.ai-context/` files accurate and current. Other agents (and future you) depend on this information.

## Available Context Files

### Project Documentation
- **`.ai-context/project.overview.md`** - Project summary, objectives, tech stack
- **`.ai-context/project.structure.md`** - Directory layout and important file locations
- **`.ai-context/project.backlog.md`** - High-level TODO items (not replacing Jira)
- **`.ai-context/project.tasks.md`** - Active tasks and work in progress
- **`.ai-context/project.decisions.md`** - Architectural decision records (ADRs)
- **`.ai-context/project.changelog.md`** - Project changelog with timestamps

### Standards & Guidelines
- **`.ai-context/standards/project.rules.md`** - General agent rules and disciplines
- **`.ai-context/standards/project.workflow.md`** - Git workflow and branching strategy
- **`.ai-context/standards/project.python.md`** - Python-specific coding conventions
- **`.ai-context/standards/project.testing.md`** - Testing standards and requirements

## Testing Requirements

Never commit untested code. From `.ai-context/standards/project.testing.md`:
- Minimum 80% code coverage overall
- Minimum 90% coverage for new code
- Use pytest for all tests
- Follow Arrange-Act-Assert pattern
- Write tests before or alongside implementation

## Timestamp Format

**Always use ISO 8601 format** for all timestamps:
- Format: `YYYY-MM-DD HH:MM:SS`
- Example: `2025-11-20 16:30:45`

## Session Notes Template

Create `.ai-context/sessions/YYYY-MM-DD-session-notes.md` at end of session:

```markdown
---
date: YYYY-MM-DD
time: HH:MM:SS
agent: Codex
---

# Session Notes

## Work Completed
- [List completed tasks]

## Work in Progress
- [List partial completions]

## Blockers Encountered
- [List any blockers]

## Decisions Made
- [List decisions - copy to project.decisions.md if significant]

## Files Modified
- [List key files changed]

## Context Updates
- [List .ai-context/ files updated]

## Next Session Should
- [Guidance for next session]

## Additional Notes
- [Any other relevant context]
```

## Code Quality Checklist

Before committing any code:

- [ ] Code follows style guide (`.ai-context/standards/project.python.md` or relevant)
- [ ] All tests pass locally
- [ ] New functionality has tests
- [ ] Code coverage meets requirements
- [ ] Documentation is updated
- [ ] Type hints are present (for Python)
- [ ] No debug code or commented-out code
- [ ] No hardcoded credentials or sensitive data
- [ ] Commit message follows conventional format

## Pull Request Checklist

Before creating a PR:

- [ ] Branch is up to date with main
- [ ] All commits are clean and meaningful
- [ ] Full test suite passes
- [ ] Code has been self-reviewed
- [ ] Documentation is complete and accurate
- [ ] `.ai-context/project.changelog.md` updated (if user-facing)
- [ ] `.ai-context/project.tasks.md` updated with progress
- [ ] No merge conflicts with main

## Working Philosophy

1. **Read before writing**: Always check context files before starting work
2. **Test as you go**: Don't accumulate untested code
3. **Document decisions**: Future you (and other agents) will thank you
4. **Update frequently**: Keep context files current, not just at session end
5. **Be explicit**: Don't assume others know your reasoning

## Quick Reference Commands

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=src --cov-report=html

# Format code (Python)
black .

# Lint code (Python)
ruff check .

# Type check (Python)
mypy .

# Create feature branch
git checkout -b feature/your-feature-name

# Update branch from main
git fetch origin
git rebase origin/main
```

## Remember

This is a multi-agent, multi-session project. Your primary responsibility is writing quality code **and maintaining accurate context** for continuity. Treat `.ai-context/` files as first-class project artifacts.
