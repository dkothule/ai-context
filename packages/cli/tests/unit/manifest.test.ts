import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { readManifest, writeManifest, detectManifestPath } from '../../src/core/manifest.js';
import type { Manifest } from '../../src/core/manifest.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), 'ai-context-test-' + randomBytes(6).toString('hex'));
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const sampleManifest: Manifest = {
  name: 'ai-context',
  version: '1.0.0',
  schema_version: 5,
  managed_by: 'npm:ai-context@1.0.0',
  installed_at: '2026-03-17T00:00:00.000Z',
  apply_mode: 'fresh-install',
  agents_installed: ['claude', 'cursor'],
  previous_version: null,
  previous_schema_version: null,
};

describe('readManifest', () => {
  it('returns null when no manifest exists', async () => {
    const result = await readManifest(tmpDir);
    expect(result).toBeNull();
  });

  it('reads a valid manifest.json', async () => {
    await writeFile(join(tmpDir, 'manifest.json'), JSON.stringify(sampleManifest, null, 2));
    const result = await readManifest(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.0.0');
    expect(result!.schema_version).toBe(5);
    expect(result!.apply_mode).toBe('fresh-install');
  });

  it('falls back to template.manifest.json (legacy)', async () => {
    const legacy = { ...sampleManifest, version: '0.2.0', schema_version: 2 };
    await writeFile(join(tmpDir, 'template.manifest.json'), JSON.stringify(legacy, null, 2));
    const result = await readManifest(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('0.2.0');
  });

  it('normalizes missing fields from old schema', async () => {
    const old = { name: 'ai-context', version: '0.3.0', schema_version: 2 };
    await writeFile(join(tmpDir, 'manifest.json'), JSON.stringify(old, null, 2));
    const result = await readManifest(tmpDir);
    expect(result!.agents_installed).toBeNull();
    expect(result!.previous_version).toBeNull();
    expect(result!.installed_at).toBeNull();
  });
});

describe('writeManifest', () => {
  it('writes a manifest.json that can be read back', async () => {
    await writeManifest(tmpDir, sampleManifest);
    const result = await readManifest(tmpDir);
    expect(result).toEqual(sampleManifest);
  });

  it('writes a trailing newline', async () => {
    await writeManifest(tmpDir, sampleManifest);
    const { readFile } = await import('fs/promises');
    const raw = await readFile(join(tmpDir, 'manifest.json'), 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
  });
});

describe('detectManifestPath', () => {
  it('returns null when neither file exists', async () => {
    expect(await detectManifestPath(tmpDir)).toBeNull();
  });

  it('prefers manifest.json over template.manifest.json', async () => {
    await writeFile(join(tmpDir, 'manifest.json'), '{}');
    await writeFile(join(tmpDir, 'template.manifest.json'), '{}');
    const result = await detectManifestPath(tmpDir);
    expect(result).toContain('manifest.json');
    expect(result).not.toContain('template.');
  });
});
