import { cp, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

/**
 * Script names we install into .claude/hooks/. Used to detect our hook entries
 * in settings.json (both to avoid duplicates on upgrade and to clean up on uninstall).
 */
const HOOK_SCRIPTS = {
  stop: 'session-log-check.sh',
  preCompact: 'pre-compact.sh',
  postCompact: 'post-compact-reminder.sh',
} as const;

const ALL_HOOK_SCRIPTS: string[] = Object.values(HOOK_SCRIPTS);

interface HookEntry {
  matcher?: string;
  hooks: Array<{ type: string; command: string; timeout?: number }>;
}

interface HooksBlock {
  [event: string]: HookEntry[];
}

/**
 * Builds the hooks block AI Context installs into .claude/settings.json.
 * See docs: https://code.claude.com/docs/en/hooks
 */
function buildHooksBlock(): HooksBlock {
  return {
    Stop: [
      {
        matcher: '',
        hooks: [
          {
            type: 'command',
            command: `bash .claude/hooks/${HOOK_SCRIPTS.stop}`,
            timeout: 5000,
          },
        ],
      },
    ],
    PreCompact: [
      {
        matcher: 'manual',
        hooks: [
          {
            type: 'command',
            command: `bash .claude/hooks/${HOOK_SCRIPTS.preCompact}`,
            timeout: 5000,
          },
        ],
      },
      {
        matcher: 'auto',
        hooks: [
          {
            type: 'command',
            command: `bash .claude/hooks/${HOOK_SCRIPTS.preCompact}`,
            timeout: 10000,
          },
        ],
      },
    ],
    SessionStart: [
      {
        matcher: 'compact',
        hooks: [
          {
            type: 'command',
            command: `bash .claude/hooks/${HOOK_SCRIPTS.postCompact}`,
            timeout: 5000,
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
  /** Which hook events had our entries added (or would be added, in dry-run). */
  eventsMerged: string[];
}

/**
 * Installs Claude Code hooks into the target project.
 * - Copies .claude/hooks/*.sh from bundled templates.
 * - Merges AI Context hook entries (Stop, PreCompact, SessionStart) into
 *   .claude/settings.json per-event, preserving any existing user-owned hooks.
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

  if (!dryRun) {
    await mkdir(targetHooksDir, { recursive: true });
    if (existsSync(templateHooksDir)) {
      await cp(templateHooksDir, targetHooksDir, { recursive: true });
    }
  }

  const mergeResult = await mergeHooksIntoSettings(targetSettingsPath, dryRun);

  return {
    hooksCopied: !dryRun,
    settingsMerged: mergeResult.merged,
    settingsSkipReason: mergeResult.skipReason,
    eventsMerged: mergeResult.eventsMerged,
  };
}

interface MergeResult {
  merged: boolean;
  skipReason?: string;
  eventsMerged: string[];
}

function ourScriptInCommand(cmd?: string): string | null {
  if (!cmd) return null;
  return ALL_HOOK_SCRIPTS.find((name) => cmd.includes(name)) ?? null;
}

function entryUsesOurScript(entry: HookEntry, scriptNames: string[]): boolean {
  if (!Array.isArray(entry.hooks)) return false;
  return entry.hooks.some((h) => {
    const our = ourScriptInCommand(h.command);
    return our !== null && scriptNames.includes(our);
  });
}

async function mergeHooksIntoSettings(
  settingsPath: string,
  dryRun: boolean,
): Promise<MergeResult> {
  const ours = buildHooksBlock();

  // Case 1: no settings.json yet → write ours fresh.
  if (!existsSync(settingsPath)) {
    if (!dryRun) {
      await mkdir(dirname(settingsPath), { recursive: true });
      await writeFile(settingsPath, JSON.stringify({ hooks: ours }, null, 2) + '\n', 'utf8');
    }
    return { merged: true, eventsMerged: Object.keys(ours) };
  }

  const raw = await readFile(settingsPath, 'utf8');

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(raw);
  } catch {
    return { merged: false, skipReason: 'settings.json is not valid JSON', eventsMerged: [] };
  }

  const existingHooks = (settings.hooks as HooksBlock | undefined) ?? {};
  const mergedHooks: HooksBlock = { ...existingHooks };

  const eventsMerged: string[] = [];

  for (const [event, ourEntries] of Object.entries(ours)) {
    const existingArr = Array.isArray(mergedHooks[event]) ? mergedHooks[event] : [];
    const toAdd: HookEntry[] = [];

    for (const ourEntry of ourEntries) {
      const ourScriptNames = ourEntry.hooks
        .map((h) => ourScriptInCommand(h.command))
        .filter((n): n is string => n !== null);

      const alreadyPresent = existingArr.some(
        (e) =>
          (e.matcher ?? '') === (ourEntry.matcher ?? '') && entryUsesOurScript(e, ourScriptNames),
      );

      if (!alreadyPresent) {
        toAdd.push(ourEntry);
      }
    }

    if (toAdd.length > 0) {
      mergedHooks[event] = [...existingArr, ...toAdd];
      eventsMerged.push(event);
    }
  }

  if (eventsMerged.length === 0) {
    return { merged: false, skipReason: 'AI Context hooks already present', eventsMerged: [] };
  }

  const merged = { ...settings, hooks: mergedHooks };

  if (!dryRun) {
    await writeFile(settingsPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  }

  return { merged: true, eventsMerged };
}

/**
 * Removes AI Context's hook entries (any of Stop / PreCompact / SessionStart
 * referring to our scripts) from .claude/settings.json during uninstall.
 * Leaves user-owned hooks untouched.
 */
export async function removeHookFromSettings(
  targetDir: string,
  dryRun = false,
): Promise<boolean> {
  const settingsPath = join(targetDir, '.claude', 'settings.json');
  if (!existsSync(settingsPath)) return false;

  const raw = await readFile(settingsPath, 'utf8');
  if (!ALL_HOOK_SCRIPTS.some((name) => raw.includes(name))) return false;

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(raw);
  } catch {
    return false;
  }

  const hooks = settings.hooks as HooksBlock | undefined;
  if (!hooks) return false;

  let removedAny = false;

  for (const event of Object.keys(hooks)) {
    const arr = hooks[event];
    if (!Array.isArray(arr)) continue;
    const filtered = arr.filter((entry) => !entryUsesOurScript(entry, ALL_HOOK_SCRIPTS));
    if (filtered.length !== arr.length) removedAny = true;
    if (filtered.length === 0) {
      delete hooks[event];
    } else {
      hooks[event] = filtered;
    }
  }

  if (Object.keys(hooks).length === 0) {
    delete settings.hooks;
  }

  if (!removedAny) return false;

  if (!dryRun) {
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  }

  return true;
}
