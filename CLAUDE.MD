# Claude Code Instructions

## Project Context System

This project uses a **centralized AI context system** located in `.ai-context/`. This directory is shared with other AI agents (Cursor and Codex) and serves as the single source of truth for project information.

## Required Reading Order (Every Session)

1. **`.ai-context/project.overview.md`** - Start here to understand the project
2. **`.ai-context/project.structure.md`** - Understand the codebase layout
3. **`.ai-context/project.tasks.md`** - Check what's currently being worked on
4. **`.ai-context/standards/`** - Review relevant coding standards

## Your Responsibilities

### Before Starting Any Task
- Read the relevant context files from `.ai-context/`
- Understand the current project state
- Check for any blockers or dependencies in `.ai-context/project.tasks.md`

### While Coding
- Follow all standards defined in `.ai-context/standards/`
- Reference `.ai-context/standards/project.workflow.md` for git practices
- Use language-specific standards (e.g., `.ai-context/standards/project.python.md`)
- Make incremental, testable changes

### After Completing Work
1. **Update tasks**: Modify `.ai-context/project.tasks.md` with your progress
2. **Update changelog**: Add user-facing changes to `.ai-context/project.changelog.md`
3. **Log decisions**: Record significant decisions in `.ai-context/project.decisions.md`
4. **Create session notes**: Save session summary to `.ai-context/sessions/YYYY-MM-DD-session-notes.md`
5. **Use proper timestamps**: Always use ISO 8601 format (YYYY-MM-DD HH:MM:SS)

## Git Workflow (Critical)

Follow `.ai-context/standards/project.workflow.md` strictly:

- ✅ **Create feature branches** for all work
- ✅ **Run tests** before every commit
- ✅ **Use pull requests** for all merges to main
- ✅ **Write meaningful commit messages** following Conventional Commits
- ❌ **Never commit directly to main**
- ❌ **Never commit untested code**
- ❌ **Never commit with failing tests**

## Multi-Agent Coordination

**Important**: You're working in a multi-agent environment with Cursor and Codex. The `.ai-context/` directory is your shared memory system.

### Why This Matters
- Other agents will read these files to understand what you've done
- You'll read these files to understand what other agents have done
- Keeping context current enables seamless handoffs

### Your Role
- **Always keep context files up to date**
- **Be explicit in your session notes**
- **Document decisions and rationale**
- **Update task status accurately**

## Context File Reference

### Project Information
- **Overview**: `.ai-context/project.overview.md` - High-level project summary
- **Structure**: `.ai-context/project.structure.md` - Directory layout and key files
- **Backlog**: `.ai-context/project.backlog.md` - High-level TODO items
- **Tasks**: `.ai-context/project.tasks.md` - Current work in progress
- **Decisions**: `.ai-context/project.decisions.md` - Architecture decision records
- **Changelog**: `.ai-context/project.changelog.md` - Project changelog

### Standards & Guidelines
- **General rules**: `.ai-context/standards/project.rules.md`
- **Git workflow**: `.ai-context/standards/project.workflow.md`
- **Python standards**: `.ai-context/standards/project.python.md`
- **Testing standards**: `.ai-context/standards/project.testing.md`

## Testing Requirements

From `.ai-context/standards/project.testing.md`:
- Write tests for all new functionality
- Maintain minimum 80% code coverage
- Run full test suite before committing
- Use pytest for all tests
- Follow TDD approach when feasible

## Code Quality Standards

From `.ai-context/standards/project.python.md` (adapt for your language):
- Follow PEP 8 style guide
- Use type hints for all functions
- Write Google-style docstrings
- Use Black for formatting (88 char line length)
- Use Ruff for linting
- Use mypy for type checking

## Emergency Protocol

If you encounter critical issues:
1. Document in `.ai-context/project.tasks.md` under "Blocked" section
2. Create entry in `.ai-context/project.decisions.md` if architectural
3. Update `.ai-context/project.overview.md` if it affects project status

## Session Template

At end of each session, create `.ai-context/sessions/YYYY-MM-DD-session-notes.md`:

```markdown
---
date: YYYY-MM-DD
time: HH:MM:SS
agent: Claude Code
---

# Session Summary

## Objectives
- [What was planned]

## Completed
- [What was accomplished]

## In Progress
- [What's partially done]

## Blockers
- [Any issues encountered]

## Next Steps
- [What should be done next]

## Context Updates
- Updated: [List files modified in .ai-context/]

## Notes
- [Any additional context for next session]
```

## Remember

Your work lives beyond this session. Keep the context system updated so that you (in future sessions), other agents, and human developers can seamlessly continue the work.
