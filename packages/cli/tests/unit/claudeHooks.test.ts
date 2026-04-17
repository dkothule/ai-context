import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { installClaudeHooks, removeHookFromSettings } from '../../src/core/claudeHooks.js';

let tmpDir: string;
let claudeDir: string;
let templateClaudeDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), 'ai-context-test-' + randomBytes(6).toString('hex'));
  claudeDir = join(tmpDir, '.claude');
  templateClaudeDir = join(tmpDir, '_template_claude');
  await mkdir(claudeDir, { recursive: true });
  await mkdir(join(templateClaudeDir, 'hooks'), { recursive: true });
  // Create a dummy hook script in template
  await writeFile(join(templateClaudeDir, 'hooks', 'session-log-check.sh'), '#!/bin/bash\necho ok\n');
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('installClaudeHooks', () => {
  it('copies hooks and merges settings when settings.json has only permissions', async () => {
    const settings = { permissions: { allow: ['Bash'] } };
    await writeFile(join(claudeDir, 'settings.json'), JSON.stringify(settings, null, 2));

    const result = await installClaudeHooks(templateClaudeDir, tmpDir, false);
    expect(result.settingsMerged).toBe(true);

    const raw = await readFile(join(claudeDir, 'settings.json'), 'utf8');
    const merged = JSON.parse(raw);
    expect(merged.hooks).toBeDefined();
    expect(merged.hooks.Stop).toBeDefined();
    // Preserved existing permissions
    expect(merged.permissions).toEqual({ allow: ['Bash'] });
  });

  it('skips merge if hook already present', async () => {
    const settings = {
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'bash .claude/hooks/session-log-check.sh' }] }],
      },
    };
    await writeFile(join(claudeDir, 'settings.json'), JSON.stringify(settings, null, 2));

    const result = await installClaudeHooks(templateClaudeDir, tmpDir, false);
    expect(result.settingsMerged).toBe(false);
    expect(result.settingsSkipReason).toBe('hook already present');
  });

  it('skips merge if settings.json has a foreign hooks key', async () => {
    const settings = { hooks: { PreToolUse: [] } };
    await writeFile(join(claudeDir, 'settings.json'), JSON.stringify(settings, null, 2));

    const result = await installClaudeHooks(templateClaudeDir, tmpDir, false);
    expect(result.settingsMerged).toBe(false);
    expect(result.settingsSkipReason).toContain('hooks');
  });

  it('creates settings.json with hooks if it does not exist', async () => {
    const result = await installClaudeHooks(templateClaudeDir, tmpDir, false);
    expect(result.settingsMerged).toBe(true);

    const raw = await readFile(join(claudeDir, 'settings.json'), 'utf8');
    const created = JSON.parse(raw);
    expect(created.hooks).toBeDefined();
    expect(created.hooks.Stop).toBeDefined();
  });

  it('dry-run does not write anything', async () => {
    const settings = { permissions: {} };
    await writeFile(join(claudeDir, 'settings.json'), JSON.stringify(settings));

    await installClaudeHooks(templateClaudeDir, tmpDir, true);
    const raw = await readFile(join(claudeDir, 'settings.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual(settings); // unchanged
  });
});

describe('removeHookFromSettings', () => {
  it('removes the Stop hook entry', async () => {
    const settings = {
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'bash .claude/hooks/session-log-check.sh' }] }],
      },
    };
    await writeFile(join(claudeDir, 'settings.json'), JSON.stringify(settings, null, 2));

    const removed = await removeHookFromSettings(tmpDir, false);
    expect(removed).toBe(true);

    const raw = await readFile(join(claudeDir, 'settings.json'), 'utf8');
    const updated = JSON.parse(raw);
    expect(updated.hooks).toBeUndefined();
  });

  it('returns false if hook is not present', async () => {
    await writeFile(join(claudeDir, 'settings.json'), JSON.stringify({ permissions: {} }));
    const removed = await removeHookFromSettings(tmpDir, false);
    expect(removed).toBe(false);
  });

  it('returns false if settings.json does not exist', async () => {
    const result = await removeHookFromSettings(tmpDir, false);
    expect(result).toBe(false);
  });
});
