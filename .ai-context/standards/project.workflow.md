# Development Workflow

## Git Workflow

### Branch Strategy
1. **Never commit directly to main/master**
2. **Branch Naming Convention**:
   - Features: `feature/short-description`
   - Bug fixes: `bugfix/short-description`
   - Hotfixes: `hotfix/short-description`
   - Experiments: `experiment/short-description`
3. **Branch Lifecycle**:
   - Create from latest main
   - Keep branches short-lived (< 3 days when possible)
   - Delete after successful merge

### Commit Standards
1. **Commit Message Format**: Follow Conventional Commits
   - `feat: add new feature`
   - `fix: resolve bug`
   - `docs: update documentation`
   - `refactor: restructure code`
   - `test: add tests`
   - `chore: maintenance tasks`
2. **Atomic Commits**: Each commit should be a single logical change
3. **Meaningful Messages**: Explain what and why, not how

### Pull Request Process
1. **Required for all merges to main**
2. **PR Checklist**:
   - [ ] All tests pass
   - [ ] Code follows style guide
   - [ ] Documentation updated
   - [ ] Changelog updated (if user-facing)
   - [ ] No conflicts with main
   - [ ] Self-reviewed code changes
3. **PR Description**: Include context, changes, and testing notes

## Development Cycle

### Standard Workflow
1. **Planning**:
   - Add item to `project.backlog.md` (if high-level)
   - Move to `project.tasks.md` when starting
   - Create feature branch

2. **Implementation**:
   - Write failing test (TDD approach)
   - Implement feature/fix
   - Make test pass
   - Refactor if needed

3. **Testing**:
   - Run full test suite
   - Manual testing for UI changes
   - Check code coverage

4. **Documentation**:
   - Update code comments
   - Update `.ai-context/` files if needed
   - Update README if needed

5. **Integration**:
   - Create pull request
   - Address review comments
   - Merge to main
   - Delete feature branch

6. **Tracking**:
   - Update `project.tasks.md`
   - Update `project.changelog.md` (if user-facing)
   - Log decisions in `project.decisions.md` (if significant)

## Pre-Commit Checklist

Before creating any commit:
- [ ] All tests pass locally
- [ ] Code follows project style guide
- [ ] No debug code or commented-out code
- [ ] No sensitive data (credentials, keys, etc.)
- [ ] Relevant documentation updated
- [ ] Commit message is clear and follows conventions

## Pre-PR Checklist

Before creating a pull request:
- [ ] All commits are clean and meaningful
- [ ] Branch is up to date with main
- [ ] Full test suite passes
- [ ] Code has been self-reviewed
- [ ] Documentation is complete
- [ ] Changelog updated (if user-facing)
- [ ] No merge conflicts

## Emergency Hotfix Process

For critical production issues:
1. Create `hotfix/` branch from main
2. Implement minimal fix
3. Test thoroughly
4. Fast-track PR review
5. Deploy immediately after merge
6. Backport to development branches if needed
