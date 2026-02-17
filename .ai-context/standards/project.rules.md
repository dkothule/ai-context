# Project Rules (Authoritative)

This file is the canonical workflow policy for all agents in this repository.

## 1) Source Of Truth
- `.ai-context/` is the shared source of truth across Codex, Claude Code, Cursor, Copilot, and workspace agents.
- Agent-specific files (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*.mdc`, `.agent/rules/*.md`, `.github/copilot-instructions.md`) must stay thin and must not duplicate shared governance text.

## 2) Instruction Priority
Apply instructions in this order:
1. System/developer/runtime constraints
2. User request for the current session
3. This file and other `.ai-context/standards/*` files
4. Agent-specific adapter files

If instructions conflict, follow the highest-priority source and state assumptions briefly.

## 3) Clarification And Autonomy Policy
- Proceed without asking when requirements are clear and the change is low risk.
- Ask the user before proceeding when ambiguity could materially change behavior, cost, security, data integrity, or production impact.
- If blocked, ask one concise question and propose a default option to keep momentum.

## 4) High-Risk Action Confirmation (Required)
Require explicit user confirmation before:
- Destructive data/file actions (for example: `rm -rf`, irreversible deletes, force resets)
- Production-impacting deploy/config changes
- Database schema/data migrations in non-local environments
- Security/authentication/authorization policy changes
- Large dependency/platform upgrades with broad blast radius

When asking for confirmation, state:
1. what will change,
2. why it is needed,
3. rollback/mitigation plan if available.

## 5) Session Start (Required)
Before coding, read:
1. `.ai-context/project.overview.md`
2. `.ai-context/project.tasks.md`
3. `.ai-context/project.structure.md`
4. Recent files in `.ai-context/sessions/`
5. Relevant standards in `.ai-context/standards/`

## 6) Working Loop
1. Plan the smallest safe change that satisfies the request.
2. Implement incrementally.
3. Run relevant tests/checks.
4. Update context files when project state changes.
5. Summarize outcomes, verification, and remaining risks.

## 7) Response Contract By Task Type
### Implementation/Change Tasks
- Lead with result.
- Include changed files and key commands.
- State verification performed (tests/lint/build) and what was not run.
- Mention any residual risk or follow-up.

### Code Review Tasks
- Findings first, ordered by severity.
- Include file and line references.
- Keep summary brief and secondary.
- Explicitly state if no findings were identified.

### Incident/Debug Tasks
- State impact, root cause (or current hypothesis), and mitigation status.
- Include reproduction/verification steps.
- List next actions with owners or clear handoff notes.

## 8) Context Update Rules
Update these files when applicable:
- `.ai-context/project.tasks.md`: status, in-progress work, blockers, next actions
- `.ai-context/project.decisions.md`: significant technical or architectural decisions
- `.ai-context/project.changelog.md`: user-visible changes

## 9) Session Logging (Mandatory)
Every meaningful work session must create or update a session note.

### Session File Naming
- Format: `YYYY-MM-DD-<topic>.md`
- Example: `2026-02-17-template-normalization.md`
- If multiple sessions on same topic/day, append suffix: `YYYY-MM-DD-<topic>-02.md`

### Session Location
- `.ai-context/sessions/`

### Session Template
- Use `.ai-context/sessions/_template.md`

### Timestamp Standard
- Use ISO 8601-style values:
  - Date: `YYYY-MM-DD`
  - Time: `HH:MM:SS`

## 10) Quality Gates
- Do not intentionally commit untested code.
- Keep changes focused and reversible.
- Do not commit secrets or credentials.
- Remove debug-only code before finalizing.

## 11) Git Workflow
See `.ai-context/standards/project.workflow.md` for branching, PR, and commit guidance.

## 12) Multi-Agent Handoffs
Assume another agent continues your work later.
- Be explicit in session notes.
- Record key decisions and rationale.
- Leave actionable next steps.
