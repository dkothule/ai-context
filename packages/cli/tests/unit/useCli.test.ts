import { mkdtemp, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkCLIStatus: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../../src/core/agentCLI.js', () => ({
  getRegisteredCLIs: vi.fn(() => ['claude', 'codex', 'cursor']),
  checkCLIStatus: mocks.checkCLIStatus,
}));

vi.mock('@inquirer/prompts', () => ({
  select: mocks.select,
}));

const { useCliCommand } = await import('../../src/commands/useCli.js');
const { readManifest, writeManifest } = await import('../../src/core/manifest.js');
import type { Manifest } from '../../src/core/manifest.js';

const baseManifest: Manifest = {
  name: 'ai-context',
  version: '1.0.0',
  schema_version: 5,
  managed_by: 'npm:ai-context@1.0.0',
  installed_at: '2026-03-17T00:00:00.000Z',
  apply_mode: 'fresh-install',
  agents_installed: ['claude', 'codex', 'cursor'],
  configured_cli: null,
  previous_version: null,
  previous_schema_version: null,
};

/** Runs the `use` command action with the given args; resolves after it returns. */
async function runUse(args: string[]): Promise<void> {
  await useCliCommand().parseAsync(['node', 'use', ...args]);
}

describe('ai-context use', () => {
  let tmpDir: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'ai-context-use-'));
    mocks.checkCLIStatus.mockReset();
    mocks.checkCLIStatus.mockResolvedValue('ready');
    mocks.select.mockReset();
    // Make process.exit throw so we can assert on it without killing the test run.
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('persists a valid CLI passed as an argument', async () => {
    await mkdir(join(tmpDir, '.ai-context'), { recursive: true });
    await writeManifest(join(tmpDir, '.ai-context'), baseManifest);

    await runUse(['codex', '--path', tmpDir]);

    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest!.configured_cli).toBe('codex');
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('persists even when the CLI is not ready', async () => {
    await mkdir(join(tmpDir, '.ai-context'), { recursive: true });
    await writeManifest(join(tmpDir, '.ai-context'), baseManifest);
    mocks.checkCLIStatus.mockResolvedValue('not-authenticated');

    await runUse(['cursor', '--path', tmpDir]);

    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest!.configured_cli).toBe('cursor');
  });

  it('uses the interactive picker when no CLI argument is given', async () => {
    await mkdir(join(tmpDir, '.ai-context'), { recursive: true });
    await writeManifest(join(tmpDir, '.ai-context'), baseManifest);
    mocks.select.mockResolvedValue('claude');

    await runUse(['--path', tmpDir]);

    expect(mocks.select).toHaveBeenCalledTimes(1);
    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest!.configured_cli).toBe('claude');
  });

  it('errors on an unknown CLI', async () => {
    await mkdir(join(tmpDir, '.ai-context'), { recursive: true });
    await writeManifest(join(tmpDir, '.ai-context'), baseManifest);

    await expect(runUse(['bogus', '--path', tmpDir])).rejects.toThrow('process.exit:1');
  });

  it('errors when AI Context is not installed', async () => {
    await expect(runUse(['codex', '--path', tmpDir])).rejects.toThrow('process.exit:1');
  });
});
