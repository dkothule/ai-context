import { mkdtemp, mkdir, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkCLIStatus: vi.fn(),
  runPromptContentViaCLI: vi.fn(),
  clipboardWrite: vi.fn(),
}));

vi.mock('../../src/core/agentCLI.js', () => ({
  getRegisteredCLIs: vi.fn(() => ['claude', 'codex', 'cursor']),
  checkCLIStatus: mocks.checkCLIStatus,
  runPromptContentViaCLI: mocks.runPromptContentViaCLI,
}));

vi.mock('clipboardy', () => ({
  default: {
    write: mocks.clipboardWrite,
  },
}));

const { runSetup } = await import('../../src/core/setupFlow.js');
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

describe('runSetup', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'ai-context-setup-flow-'));
    await mkdir(join(tmpDir, '.ai-context'), { recursive: true });
    mocks.checkCLIStatus.mockReset();
    mocks.runPromptContentViaCLI.mockReset();
    mocks.clipboardWrite.mockReset();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('does not execute a selected CLI after its health check fails', async () => {
    mocks.checkCLIStatus.mockResolvedValue('not-authenticated');
    mocks.clipboardWrite.mockResolvedValue(undefined);

    const ok = await runSetup(tmpDir, 'fresh-install', { cli: 'codex' });

    expect(ok).toBe(true);
    expect(mocks.checkCLIStatus).toHaveBeenCalledWith('codex', { cwd: tmpDir });
    expect(mocks.runPromptContentViaCLI).not.toHaveBeenCalled();
    expect(mocks.clipboardWrite).toHaveBeenCalledTimes(1);

    const logs = await readdir(join(tmpDir, '.ai-context', 'logs', 'setup'));
    expect(logs).toHaveLength(1);
  });

  it('falls back to clipboard when a selected CLI is temporarily unavailable', async () => {
    mocks.checkCLIStatus.mockResolvedValue('unavailable');
    mocks.clipboardWrite.mockResolvedValue(undefined);

    const ok = await runSetup(tmpDir, 'fresh-install', { cli: 'codex' });

    expect(ok).toBe(true);
    expect(mocks.runPromptContentViaCLI).not.toHaveBeenCalled();
    expect(mocks.clipboardWrite).toHaveBeenCalledTimes(1);
  });

  it('runs a ready selected CLI from the target project directory', async () => {
    mocks.checkCLIStatus.mockResolvedValue('ready');
    mocks.runPromptContentViaCLI.mockResolvedValue({
      success: true,
      cli: 'codex',
      stdout: 'setup complete',
    });

    const ok = await runSetup(tmpDir, 'reapply', { cli: 'codex' });

    expect(ok).toBe(true);
    expect(mocks.runPromptContentViaCLI).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        preferredCLI: 'codex',
        cwd: tmpDir,
      }),
    );
    expect(mocks.clipboardWrite).not.toHaveBeenCalled();
  });

  it('persists the selected CLI to the manifest on a successful run', async () => {
    await writeManifest(join(tmpDir, '.ai-context'), baseManifest);
    mocks.checkCLIStatus.mockResolvedValue('ready');
    mocks.runPromptContentViaCLI.mockResolvedValue({
      success: true,
      cli: 'codex',
      stdout: 'setup complete',
    });

    await runSetup(tmpDir, 'reapply', { cli: 'codex' });

    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest!.configured_cli).toBe('codex');
  });

  it('persists the selected CLI even when it falls back to clipboard', async () => {
    await writeManifest(join(tmpDir, '.ai-context'), baseManifest);
    mocks.checkCLIStatus.mockResolvedValue('not-authenticated');
    mocks.clipboardWrite.mockResolvedValue(undefined);

    await runSetup(tmpDir, 'fresh-install', { cli: 'codex' });

    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest!.configured_cli).toBe('codex');
  });

  it('does not persist a CLI for print mode', async () => {
    await writeManifest(join(tmpDir, '.ai-context'), baseManifest);

    await runSetup(tmpDir, 'fresh-install', { mode: 'print' });

    const manifest = await readManifest(join(tmpDir, '.ai-context'));
    expect(manifest!.configured_cli).toBeNull();
  });
});
