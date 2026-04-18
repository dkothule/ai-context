import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { renameLegacyStandards } from '../../src/core/legacyStandards.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), 'ai-context-test-' + randomBytes(6).toString('hex'));
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('renameLegacyStandards', () => {
  it('renames project.rules.md with legacy heading', async () => {
    await writeFile(
      join(tmpDir, 'project.rules.md'),
      '# Project Rules (Authoritative)\n\nsome content',
    );

    const renamed = await renameLegacyStandards(tmpDir);
    expect(renamed).toHaveLength(1);
    expect(existsSync(join(tmpDir, 'project.rules.md'))).toBe(false);
    expect(existsSync(join(tmpDir, 'project.rules.legacy.md'))).toBe(true);
  });

  it('renames project.workflow.md with legacy heading', async () => {
    await writeFile(
      join(tmpDir, 'project.workflow.md'),
      '# Project Workflow (Authoritative)\n\nsome content',
    );

    const renamed = await renameLegacyStandards(tmpDir);
    expect(renamed).toHaveLength(1);
    expect(existsSync(join(tmpDir, 'project.workflow.legacy.md'))).toBe(true);
  });

  it('does not rename project.rules.md without legacy heading', async () => {
    await writeFile(
      join(tmpDir, 'project.rules.md'),
      '# Project Rules\n\nproject-specific overrides only',
    );

    const renamed = await renameLegacyStandards(tmpDir);
    expect(renamed).toHaveLength(0);
    expect(existsSync(join(tmpDir, 'project.rules.md'))).toBe(true);
  });

  it('does not overwrite existing .legacy.md file', async () => {
    await writeFile(join(tmpDir, 'project.rules.md'), '# Project Rules (Authoritative)');
    await writeFile(join(tmpDir, 'project.rules.legacy.md'), 'existing legacy content');

    const renamed = await renameLegacyStandards(tmpDir);
    expect(renamed).toHaveLength(0);
    // Original file still there (not renamed since legacy target exists)
    expect(existsSync(join(tmpDir, 'project.rules.md'))).toBe(true);
  });

  it('returns empty array when no standards files exist', async () => {
    const renamed = await renameLegacyStandards(tmpDir);
    expect(renamed).toHaveLength(0);
  });
});
