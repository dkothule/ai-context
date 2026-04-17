import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { appendGitignoreEntries } from '../../src/core/gitignore.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), 'ai-context-test-' + randomBytes(6).toString('hex'));
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('appendGitignoreEntries', () => {
  it('creates .gitignore if it does not exist', async () => {
    const added = await appendGitignoreEntries(tmpDir);
    expect(added).toBe(true);

    const content = await readFile(join(tmpDir, '.gitignore'), 'utf8');
    expect(content).toContain('# ai-context');
    expect(content).toContain('.ai-context/sessions/');
    expect(content).toContain('.ai-context-backups/');
  });

  it('appends to existing .gitignore', async () => {
    await writeFile(join(tmpDir, '.gitignore'), 'node_modules/\n');
    await appendGitignoreEntries(tmpDir);

    const content = await readFile(join(tmpDir, '.gitignore'), 'utf8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('# ai-context');
  });

  it('is idempotent — does not add twice', async () => {
    await appendGitignoreEntries(tmpDir);
    await appendGitignoreEntries(tmpDir);

    const content = await readFile(join(tmpDir, '.gitignore'), 'utf8');
    const count = (content.match(/# ai-context/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('returns false if entries already present', async () => {
    await appendGitignoreEntries(tmpDir);
    const result = await appendGitignoreEntries(tmpDir);
    expect(result).toBe(false);
  });

  it('dry-run does not write anything', async () => {
    const added = await appendGitignoreEntries(tmpDir, true);
    expect(added).toBe(true); // reports it would add
    const { existsSync } = await import('fs');
    expect(existsSync(join(tmpDir, '.gitignore'))).toBe(false);
  });
});
