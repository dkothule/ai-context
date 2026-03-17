***
last_updated: 2025-11-20 14:30:00
***

# Project Backlog

High-level items to work on. This is not a replacement for issue tracking systems like Jira, but a local working backlog.

## High Priority
- [ ] Complete initial project setup
- [ ] Define core features and requirements

## Medium Priority
- [ ] Set up CI/CD pipeline
- [ ] Establish testing framework

## Low Priority
- [ ] Performance optimization planning

## Ideas / Future Considerations
- [ ] **`ai-context` CLI command** — rename `scripts/ai-context.sh` to a proper `ai-context` command (no `.sh` extension), with an install step that puts it on PATH (e.g. `/usr/local/bin`). Current invocation `./ai-context/scripts/ai-context.sh` awkward and could be simplified iwth commands such as `$ ai-context init`. Subcommands to consider: `init`, `apply`, `upgrade`, `uninstall`, `version`. Makes the tool feel like a proper CLI and improves adoption.

## Completed
- [x] Set up AI context system (2025-11-20)

***
**Note**: Move items to `project.tasks.md` when actively working on them.
