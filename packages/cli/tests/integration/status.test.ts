import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { runInstall } from '../../src/core/install.js';
import { readManifest } from '../../src/core/manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_MANIFEST = join(__dirname, '..', '..', 'src', 'templates', 'ai-context', 'manifest.json');
async function currentTemplateVersion(): Promise<string> {
  return JSON.parse(await readFile(TEMPLATE_MANIFEST, 'utf8')).version;
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), 'ai-context-int-' + randomBytes(6).toString('hex'));
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('status (via readManifest)', () => {
  it('reads correct version and apply_mode after fresh install', async () => {
    await runInstall({ targetDir: tmpDir, agents: ['claude', 'cursor'] });

    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest).not.toBeNull();
    expect(manifest!.version).toBe(await currentTemplateVersion());
    expect(manifest!.apply_mode).toBe('fresh-install');
    expect(manifest!.agents_installed).toEqual(['claude', 'cursor']);
    expect(manifest!.managed_by).toMatch(/^npm:.*ai-context@[\d.]+$/);
  });

  it('returns null for directory without AI Context', async () => {
    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest).toBeNull();
  });

  it('reports correct agent files present after selective install', async () => {
    await runInstall({ targetDir: tmpDir, agents: ['claude'] });

    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tmpDir, 'AGENTS.md'))).toBe(false);
    expect(existsSync(join(tmpDir, '.cursor'))).toBe(false);
  });
});
