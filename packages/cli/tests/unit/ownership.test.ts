import { describe, it, expect } from 'vitest';
import { isAiContextOwned, AI_CONTEXT_OWNED_PATHS } from '../../src/core/ownership.js';

describe('isAiContextOwned', () => {
  it('returns true for AI Context-owned files', () => {
    expect(isAiContextOwned('README.md')).toBe(true);
    expect(isAiContextOwned('manifest.json')).toBe(true);
    expect(isAiContextOwned('template.manifest.json')).toBe(true);
    expect(isAiContextOwned('project.overview.md.template')).toBe(true);
    expect(isAiContextOwned('sessions/_template.md')).toBe(true);
    expect(isAiContextOwned('plans/_template.md')).toBe(true);
    expect(isAiContextOwned('standards/project.rules.base.md')).toBe(true);
    expect(isAiContextOwned('standards/project.workflow.base.md')).toBe(true);
  });

  it('returns false for project-owned files', () => {
    expect(isAiContextOwned('project.overview.md')).toBe(false);
    expect(isAiContextOwned('project.structure.md')).toBe(false);
    expect(isAiContextOwned('project.tasks.md')).toBe(false);
    expect(isAiContextOwned('project.decisions.md')).toBe(false);
    expect(isAiContextOwned('project.changelog.md')).toBe(false);
    expect(isAiContextOwned('project.backlog.md')).toBe(false);
    expect(isAiContextOwned('sessions/2026-01-01-some-session.md')).toBe(false);
    expect(isAiContextOwned('plans/2026-03-17-npm-cli.md')).toBe(false);
    expect(isAiContextOwned('standards/project.rules.md')).toBe(false);
    expect(isAiContextOwned('standards/project.workflow.md')).toBe(false);
    expect(isAiContextOwned('standards/project.python.md')).toBe(false);
  });

  it('normalizes Windows backslash separators', () => {
    expect(isAiContextOwned('sessions\\_template.md')).toBe(true);
    expect(isAiContextOwned('standards\\project.rules.base.md')).toBe(true);
  });

  it('exports a non-empty list of owned paths', () => {
    expect(AI_CONTEXT_OWNED_PATHS.length).toBeGreaterThan(0);
    expect(AI_CONTEXT_OWNED_PATHS).toContain('manifest.json');
  });
});
