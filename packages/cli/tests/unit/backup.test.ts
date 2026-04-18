import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { backupPath, createBackupDir, skipDotGit } from '../../src/core/backup.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), 'ai-context-backup-test-' + randomBytes(6).toString('hex'));
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('skipDotGit', () => {
  it('returns false for `.git` basename', () => {
    expect(skipDotGit('/foo/bar/.git')).toBe(false);
    expect(skipDotGit('.git')).toBe(false);
  });

  it('returns true for non-.git paths', () => {
    expect(skipDotGit('/foo/bar/src')).toBe(true);
    expect(skipDotGit('/foo/bar/.gitignore')).toBe(true);
    expect(skipDotGit('/foo/.gitkeep')).toBe(true);
  });
});

describe('backupPath — nested .git handling', () => {
  it('excludes .ai-context/.git/ directory from the backup', async () => {
    // Seed a .ai-context/ with a nested .git/ directory
    await mkdir(join(tmpDir, '.ai-context', '.git', 'refs', 'heads'), { recursive: true });
    await writeFile(join(tmpDir, '.ai-context', '.git', 'HEAD'), 'ref: refs/heads/main\n');
    await writeFile(join(tmpDir, '.ai-context', '.git', 'config'), '[core]\n\trepositoryformatversion = 0\n');
    await writeFile(join(tmpDir, '.ai-context', 'project.overview.md'), '# Overview\n');
    await mkdir(join(tmpDir, '.ai-context', 'sessions'), { recursive: true });
    await writeFile(join(tmpDir, '.ai-context', 'sessions', '2026-04-17-test.md'), '# Session\n');

    const backupRoot = await createBackupDir(tmpDir);
    const ok = await backupPath(tmpDir, '.ai-context', backupRoot);

    expect(ok).toBe(true);
    expect(existsSync(join(backupRoot, '.ai-context', 'project.overview.md'))).toBe(true);
    expect(existsSync(join(backupRoot, '.ai-context', 'sessions', '2026-04-17-test.md'))).toBe(true);
    expect(existsSync(join(backupRoot, '.ai-context', '.git'))).toBe(false);
    expect(existsSync(join(backupRoot, '.ai-context', '.git', 'HEAD'))).toBe(false);
  });

  it('excludes a `.git` file (worktree case) from the backup', async () => {
    // In a worktree, .git is a file pointing to the real gitdir, not a directory.
    await mkdir(join(tmpDir, '.ai-context'), { recursive: true });
    await writeFile(join(tmpDir, '.ai-context', '.git'), 'gitdir: /elsewhere/.git/worktrees/ctx\n');
    await writeFile(join(tmpDir, '.ai-context', 'project.overview.md'), '# Overview\n');

    const backupRoot = await createBackupDir(tmpDir);
    await backupPath(tmpDir, '.ai-context', backupRoot);

    expect(existsSync(join(backupRoot, '.ai-context', 'project.overview.md'))).toBe(true);
    expect(existsSync(join(backupRoot, '.ai-context', '.git'))).toBe(false);
  });

  it('preserves .gitignore and .gitkeep (only `.git` exactly is filtered)', async () => {
    await mkdir(join(tmpDir, '.ai-context', 'sessions'), { recursive: true });
    await writeFile(join(tmpDir, '.ai-context', '.gitignore'), '*.tmp\n');
    await writeFile(join(tmpDir, '.ai-context', 'sessions', '.gitkeep'), '');

    const backupRoot = await createBackupDir(tmpDir);
    await backupPath(tmpDir, '.ai-context', backupRoot);

    expect(existsSync(join(backupRoot, '.ai-context', '.gitignore'))).toBe(true);
    expect(existsSync(join(backupRoot, '.ai-context', 'sessions', '.gitkeep'))).toBe(true);
    expect(await readFile(join(backupRoot, '.ai-context', '.gitignore'), 'utf8')).toBe('*.tmp\n');
  });
});
