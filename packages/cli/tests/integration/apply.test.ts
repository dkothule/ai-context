import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { runInstall } from '../../src/core/install.js';
import { ALL_AGENTS } from '../../src/core/copyTemplates.js';
import { readManifest, writeManifest } from '../../src/core/manifest.js';
import type { Manifest } from '../../src/core/manifest.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), 'ai-context-int-' + randomBytes(6).toString('hex'));
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('runInstall — fresh install', () => {
  it('creates .ai-context/ with manifest.json', async () => {
    const result = await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS });
    expect(result.applyMode).toBe('fresh-install');
    expect(existsSync(join(tmpDir, '.ai-context', 'manifest.json'))).toBe(true);

    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest).not.toBeNull();
    expect(manifest!.version).toBe('1.0.0');
    expect(manifest!.apply_mode).toBe('fresh-install');
    expect(manifest!.managed_by).toContain('npm:ai-context');
  });

  it('copies agent adapter files', async () => {
    await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS });
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tmpDir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(tmpDir, '.cursor', 'rules', 'main.mdc'))).toBe(true);
  });

  it('installs only selected agents', async () => {
    await runInstall({ targetDir: tmpDir, agents: ['claude'] });
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tmpDir, 'AGENTS.md'))).toBe(false);
    expect(existsSync(join(tmpDir, '.cursor'))).toBe(false);
  });

  it('creates a backup directory', async () => {
    const result = await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS });
    expect(result.backupDir).not.toBeNull();
    expect(existsSync(result.backupDir!)).toBe(true);
  });

  it('dry-run writes nothing', async () => {
    const result = await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS, dryRun: true });
    expect(result.applyMode).toBe('fresh-install');
    expect(existsSync(join(tmpDir, '.ai-context'))).toBe(false);
    expect(result.backupDir).toBeNull();
  });
});

describe('runInstall — upgrade', () => {
  async function installOldVersion(dir: string): Promise<void> {
    // Simulate an existing installation at v0.5.0 with a project-owned file
    const contextDir = join(dir, '.ai-context');
    await mkdir(join(contextDir, 'sessions'), { recursive: true });
    await mkdir(join(contextDir, 'standards'), { recursive: true });

    const oldManifest: Manifest = {
      name: 'ai-context',
      version: '0.5.0',
      schema_version: 4,
      managed_by: 'scripts/ai-context.sh',
      installed_at: '2026-01-01T00:00:00.000Z',
      apply_mode: 'fresh-install',
      agents_installed: null,
      previous_version: null,
      previous_schema_version: null,
    };
    await writeManifest(contextDir, oldManifest);
    // Project-owned file
    await writeFile(join(contextDir, 'project.overview.md'), '# My Project\nCustom content');
  }

  it('detects upgrade mode and preserves project-owned files', async () => {
    await installOldVersion(tmpDir);

    const result = await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS });
    expect(result.applyMode).toBe('upgrade');
    expect(result.previousVersion).toBe('0.5.0');

    // Project-owned file should be restored
    const overview = await readFile(join(tmpDir, '.ai-context', 'project.overview.md'), 'utf8');
    expect(overview).toContain('Custom content');
  });

  it('writes upgrade apply_mode to new manifest', async () => {
    await installOldVersion(tmpDir);
    await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS });

    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest!.apply_mode).toBe('upgrade');
    expect(manifest!.previous_version).toBe('0.5.0');
    expect(manifest!.version).toBe('1.0.0');
  });
});

describe('runInstall — reapply', () => {
  it('detects reapply when version matches', async () => {
    // Install once
    await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS });
    // Install again
    const result = await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS });
    expect(result.applyMode).toBe('reapply');
  });
});

describe('runInstall — legacy upgrade', () => {
  it('detects legacy-upgrade for unversioned .ai-context/', async () => {
    // Old-style: .ai-context/ exists but no manifest
    const contextDir = join(tmpDir, '.ai-context');
    await mkdir(contextDir, { recursive: true });
    await writeFile(join(contextDir, 'project.overview.md'), 'Legacy project');

    const result = await runInstall({ targetDir: tmpDir, agents: ALL_AGENTS });
    expect(result.applyMode).toBe('legacy-upgrade');
  });
});

describe('runInstall — .gitignore', () => {
  it('adds entries when gitignore=true', async () => {
    await runInstall({ targetDir: tmpDir, agents: ['claude'], gitignore: true });
    const content = await readFile(join(tmpDir, '.gitignore'), 'utf8');
    expect(content).toContain('# ai-context');
    expect(content).toContain('.ai-context/sessions/');
  });

  it('does not modify .gitignore by default', async () => {
    await runInstall({ targetDir: tmpDir, agents: ['claude'] });
    expect(existsSync(join(tmpDir, '.gitignore'))).toBe(false);
  });
});

describe('runInstall — hooks', () => {
  it('merges hooks into existing settings.json', async () => {
    await mkdir(join(tmpDir, '.claude'), { recursive: true });
    await writeFile(
      join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: ['Bash'] } }, null, 2),
    );

    const result = await runInstall({ targetDir: tmpDir, agents: ['claude'] });
    expect(result.hooksMerged).toBe(true);

    const raw = await readFile(join(tmpDir, '.claude', 'settings.json'), 'utf8');
    const settings = JSON.parse(raw);
    expect(settings.hooks).toBeDefined();
    expect(settings.permissions).toEqual({ allow: ['Bash'] }); // preserved
  });
});
