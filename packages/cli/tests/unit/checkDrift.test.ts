import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { runStaticChecks } from '../../src/commands/checkDrift.js';

let tmpDir: string;
let contextDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), 'ai-context-drift-' + randomBytes(6).toString('hex'));
  contextDir = join(tmpDir, '.ai-context');
  await mkdir(contextDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('runStaticChecks', () => {
  it('returns empty findings for an empty .ai-context/', async () => {
    const findings = await runStaticChecks(tmpDir);
    expect(findings).toEqual([]);
  });

  it('flags broken references in project.structure.md', async () => {
    await writeFile(
      join(contextDir, 'project.structure.md'),
      '# Structure\n\nKey files:\n- `src/main.ts` — entry point\n- `src/nope.ts` — ghost\n',
    );
    // Create only src/main.ts
    await mkdir(join(tmpDir, 'src'), { recursive: true });
    await writeFile(join(tmpDir, 'src', 'main.ts'), '// entry');

    const findings = await runStaticChecks(tmpDir);
    const brokenRefs = findings.filter((f) => f.kind === 'broken-ref');
    expect(brokenRefs.length).toBeGreaterThanOrEqual(1);
    expect(brokenRefs.some((f) => f.message.includes('src/nope.ts'))).toBe(true);
    expect(brokenRefs.some((f) => f.message.includes('src/main.ts'))).toBe(false);
  });

  it('does not flag bare-basename refs that resolve under .ai-context/standards/', async () => {
    // Simulate a structure.md that lists `project.python.md` under a "standards/" section (nested bullet).
    await writeFile(
      join(contextDir, 'project.structure.md'),
      '# Structure\n\nStandards:\n- `project.python.md`\n- `project.rules.base.md`\n',
    );
    // Create the files at their real locations under .ai-context/standards/
    await mkdir(join(contextDir, 'standards'), { recursive: true });
    await writeFile(join(contextDir, 'standards', 'project.python.md'), '# py');
    await writeFile(join(contextDir, 'standards', 'project.rules.base.md'), '# rules');

    const findings = await runStaticChecks(tmpDir);
    expect(findings.filter((f) => f.kind === 'broken-ref')).toEqual([]);
  });

  it('does not flag CLI flags or function-syntax backticks as broken refs', async () => {
    await writeFile(
      join(contextDir, 'project.structure.md'),
      '# Structure\n\nCommands: `--help`, `--print`.\nFunctions: `runInstall()`, `buildHooksBlock()`.\n',
    );

    const findings = await runStaticChecks(tmpDir);
    expect(findings.filter((f) => f.kind === 'broken-ref')).toEqual([]);
  });

  it('flags stale backlog items older than 90 days', async () => {
    const oldDate = '2025-01-01';
    const recentDate = new Date().toISOString().slice(0, 10);
    await writeFile(
      join(contextDir, 'project.backlog.md'),
      `# Backlog\n\n- ${oldDate} should flag — old entry\n- ${recentDate} should not flag — recent\n`,
    );

    const findings = await runStaticChecks(tmpDir);
    const backlog = findings.filter((f) => f.kind === 'stale-backlog');
    expect(backlog.length).toBe(1);
    expect(backlog[0].message).toContain(oldDate);
  });
});
