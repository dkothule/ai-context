import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, utimes, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { selectSessionsToArchive } from '../../src/commands/compact.js';

let sessionsDir: string;

beforeEach(async () => {
  sessionsDir = join(tmpdir(), 'ai-context-compact-' + randomBytes(6).toString('hex'));
  await mkdir(sessionsDir, { recursive: true });
});

afterEach(async () => {
  await rm(sessionsDir, { recursive: true, force: true });
});

async function seed(name: string, daysAgo: number): Promise<void> {
  const p = join(sessionsDir, name);
  await writeFile(p, `# ${name}\n`);
  const t = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  await utimes(p, t, t);
}

describe('selectSessionsToArchive', () => {
  it('returns empty array when no session files exist', async () => {
    const result = await selectSessionsToArchive(sessionsDir, 30, 10);
    expect(result).toEqual([]);
  });

  it('does not archive anything when all files are newer than threshold', async () => {
    await seed('2026-04-10-foo.md', 5);
    await seed('2026-04-12-bar.md', 3);

    const result = await selectSessionsToArchive(sessionsDir, 30, 10);
    expect(result).toEqual([]);
  });

  it('archives files older than threshold, but always keeps the newest N', async () => {
    for (let i = 1; i <= 15; i++) {
      await seed(`session-${String(i).padStart(2, '0')}.md`, 60 - i); // 59, 58, 57, ... 45 days ago
    }

    const result = await selectSessionsToArchive(sessionsDir, 30, 10);
    // 15 files aged 45–59 days. Keep newest 10 → 5 should archive.
    expect(result.length).toBe(5);
  });

  it('excludes _template.md and *-precompact-autosave.md', async () => {
    await seed('_template.md', 100);
    await seed('2025-01-01-autosave-precompact-autosave.md', 100);
    await seed('2025-01-02-legit.md', 100);

    const result = await selectSessionsToArchive(sessionsDir, 30, 0);
    expect(result).toHaveLength(1);
    expect(result[0].relPath).toContain('2025-01-02-legit.md');
  });

  it('sorts output newest-first within the archive set', async () => {
    await seed('old-1.md', 90);
    await seed('old-2.md', 60);
    await seed('old-3.md', 45);

    const result = await selectSessionsToArchive(sessionsDir, 30, 0);
    expect(result).toHaveLength(3);
    // sorted newest (smallest daysAgo) first
    expect(result[0].relPath).toContain('old-3.md');
    expect(result[2].relPath).toContain('old-1.md');
  });
});
