# Agent Rules and Disciplines

## General Rules

1. **Timestamp Format**: Always use ISO 8601 format (YYYY-MM-DD HH:MM:SS) for all timestamps
2. **Documentation Updates**: Update relevant `.ai-context/` files after significant changes
3. **Decision Recording**: Log architectural decisions in `project.decisions.md`
4. **Testing Requirement**: Never commit untested code
5. **Context Preservation**: Update `project.tasks.md` at the end of each session

## File Modification Rules

1. **Structure Check**: Always check `project.structure.md` before creating new files or directories
2. **Naming Conventions**: Follow naming conventions specified in language-specific standards
3. **Changelog Updates**: Update `project.changelog.md` for user-facing changes
4. **Version Control**: All changes must be committed with meaningful commit messages

---

## Session Management (CRITICAL)

### ⚠️ MANDATORY: Session Logging

**Every work session MUST be logged.** This is critical for multi-agent coordination.

A "session" is any conversation where:
- Code changes were made
- Architectural decisions were discussed
- Bugs were fixed
- Features were implemented
- Significant investigation/debugging occurred

### Start of Session
1. Read `project.overview.md` to understand current project state
2. Check `project.tasks.md` for current work items
3. Check `sessions/` for recent session notes to understand context
4. Review `project.structure.md` for codebase layout

### During Session
1. Follow standards in `.ai-context/standards/`
2. Make incremental, testable changes
3. Update relevant context files as you go

### End of Session (MANDATORY)

Before concluding ANY work session, the AI agent MUST:

1. **Create session log** in `sessions/YYYY-MM-DD-<topic>.md`
   - Use the template below
   - Include ALL work completed
   - Note any unfinished items

2. **Update `project.tasks.md`** with current progress

3. **Update `project.changelog.md`** if there are user-facing changes

4. **Log decisions** in `project.decisions.md` for any significant choices

### Session Log Template

Create files in `sessions/` using this template:

```markdown
---
date: YYYY-MM-DD HH:MM
agent: [Cursor Agent | Claude Code | Codex | Other]
session_type: [Feature | Bugfix | Refactor | Investigation | Setup | Other]
---

# Session: [Brief Description]

## Summary
[1-2 sentence summary of what was accomplished]

## Work Completed
- ✅ Item 1
- ✅ Item 2

## Files Modified
- `path/to/file` - [what changed]

## Decisions Made
- **Decision**: [what was decided]
- **Rationale**: [why]

## Issues/Blockers
- [Any problems encountered]

## Next Steps
- [ ] [What should be done next]

## Notes for Next Agent
[Any context the next AI agent should know for continuity]
```

### Session Naming Convention

Format: `YYYY-MM-DD-<topic>.md`

Examples:
- `2025-01-15-initial-setup.md`
- `2025-01-15-feature-auth.md`
- `2025-01-15-bugfix-login.md`

If multiple sessions on the same day, add a number:
- `2025-01-15-01-feature-x.md`
- `2025-01-15-02-bugfix-y.md`

---

## Workflow

See `project.workflow.md` for detailed git and branching strategy.

## Multi-Agent Coordination

You may be working alongside other AI agents (Cursor, Claude Code, Codex). These context files are the shared source of truth. Always keep them current to enable seamless handoffs between agents.

**Session logs are the primary mechanism for continuity between agents and sessions.**
