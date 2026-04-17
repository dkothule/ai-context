import { cp, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const HOOK_SCRIPT_NAME = 'session-log-check.sh';
const HOOK_MATCHER = HOOK_SCRIPT_NAME;

/**
 * The hooks block to inject into .claude/settings.json.
 * Matches the structure expected by Claude Code.
 */
function buildHooksBlock() {
  return {
    Stop: [
      {
        hooks: [
          {
            type: 'command',
            command: 'bash .claude/hooks/session-log-check.sh',
          },
        ],
      },
    ],
  };
}

export interface HooksInstallResult {
  hooksCopied: boolean;
  settingsMerged: boolean;
  settingsSkipReason?: string;
}

/**
 * Installs Claude Code hooks into the target project.
 *
 * 1. Copies .claude/hooks/ from the template source.
 * 2. Merges the Stop hook into .claude/settings.json using JSON.parse/stringify
 *    (safe, unlike the bash string-trimming approach).
 *
 * @param templateClaudeDir  Path to the `claude/` directory in bundled templates.
 * @param targetDir          The project root.
 * @param dryRun             If true, log actions but write nothing.
 */
export async function installClaudeHooks(
  templateClaudeDir: string,
  targetDir: string,
  dryRun = false,
): Promise<HooksInstallResult> {
  const targetClaudeDir = join(targetDir, '.claude');
  const targetHooksDir = join(targetClaudeDir, 'hooks');
  const targetSettingsPath = join(targetClaudeDir, 'settings.json');
  const templateHooksDir = join(templateClaudeDir, 'hooks');

  // 1. Copy hooks directory
  if (!dryRun) {
    await mkdir(targetHooksDir, { recursive: true });
    if (existsSync(templateHooksDir)) {
      await cp(templateHooksDir, targetHooksDir, { recursive: true });
    }
  }

  // 2. Merge settings.json
  const mergeResult = await mergeHooksIntoSettings(targetSettingsPath, dryRun);

  return {
    hooksCopied: !dryRun,
    settingsMerged: mergeResult.merged,
    settingsSkipReason: mergeResult.skipReason,
  };
}

interface MergeResult {
  merged: boolean;
  skipReason?: string;
}

async function mergeHooksIntoSettings(
  settingsPath: string,
  dryRun: boolean,
): Promise<MergeResult> {
  // If settings.json doesn't exist, create it with just the hooks block
  if (!existsSync(settingsPath)) {
    if (!dryRun) {
      const dir = dirname(settingsPath);
      await mkdir(dir, { recursive: true });
      const hooksBlock = buildHooksBlock();
      await writeFile(settingsPath, JSON.stringify({ hooks: hooksBlock }, null, 2) + '\n', 'utf8');
    }
    return { merged: true };
  }

  const raw = await readFile(settingsPath, 'utf8');

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(raw);
  } catch {
    return { merged: false, skipReason: 'settings.json is not valid JSON' };
  }

  // Already has our hook?
  if (raw.includes(HOOK_MATCHER)) {
    return { merged: false, skipReason: 'hook already present' };
  }

  // Has a "hooks" key from a different source? Skip to avoid duplicating or corrupting.
  if ('hooks' in settings && !raw.includes(HOOK_MATCHER)) {
    // Only skip if the existing hooks key does NOT contain our hook
    // (which we already checked above — so if we're here, it's a foreign hooks key)
    return {
      merged: false,
      skipReason:
        'settings.json already has a "hooks" key — add the Stop hook manually to avoid conflicts',
    };
  }

  // Safe to inject
  const hooksBlock = buildHooksBlock();
  const merged = { ...settings, hooks: hooksBlock };

  if (!dryRun) {
    await writeFile(settingsPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  }

  return { merged: true };
}

/**
 * Removes AI Context's Stop hook entry from .claude/settings.json.
 * Used during uninstall. No-op if hook is not present.
 */
export async function removeHookFromSettings(
  targetDir: string,
  dryRun = false,
): Promise<boolean> {
  const settingsPath = join(targetDir, '.claude', 'settings.json');
  if (!existsSync(settingsPath)) return false;

  const raw = await readFile(settingsPath, 'utf8');
  if (!raw.includes(HOOK_MATCHER)) return false;

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(raw);
  } catch {
    return false;
  }

  const hooks = settings.hooks as Record<string, unknown> | undefined;
  if (!hooks) return false;

  // Remove our Stop hook entry
  const stopHooks = hooks.Stop as Array<unknown> | undefined;
  if (Array.isArray(stopHooks)) {
    hooks.Stop = stopHooks.filter((entry) => {
      const e = entry as { hooks?: Array<{ command?: string }> };
      return !e.hooks?.some((h) => h.command?.includes(HOOK_SCRIPT_NAME));
    });
    // Clean up empty Stop array
    if ((hooks.Stop as Array<unknown>).length === 0) {
      delete hooks.Stop;
    }
  }

  // Clean up empty hooks object
  if (Object.keys(hooks).length === 0) {
    delete settings.hooks;
  }

  if (!dryRun) {
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  }

  return true;
}
