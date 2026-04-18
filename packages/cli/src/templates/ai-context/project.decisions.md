***
last_updated: [YYYY-MM-DD]
***

# Architecture Decision Records (ADRs)

Significant technical and architectural decisions. Record decisions that future agents (or future-you) will need the *why* for.

## Format
Each decision should include:
- **ID**: `DEC-NNN` (sequential)
- **Date**: `YYYY-MM-DD`
- **Status**: Proposed | Accepted | Superseded (by DEC-XXX) | Deprecated
- **Context**: what problem or constraint motivated the decision
- **Decision**: what was decided (concrete, verifiable)
- **Rationale**: why this option over alternatives
- **Alternatives considered**: options rejected and why

## Decisions

### DEC-001 — [Example decision title]
- **Date**: [YYYY-MM-DD]
- **Status**: Accepted
- **Context**: [To be filled — what problem]
- **Decision**: [To be filled — what was chosen]
- **Rationale**: [To be filled — why]
- **Alternatives considered**: [To be filled]

***

**For Agents**: Add a new ADR whenever a non-trivial choice is made (new dependency, data model change, infra migration, auth/security policy, etc.). Don't log purely-internal refactors.
