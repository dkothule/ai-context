import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

/**
 * Script names we install into .cursor/hooks/. Used to detect our hook entries
 * in hooks.json (both to avoid duplicates on upgrade and to clean up on uninstall).
 *
 * Scripts themselves are copied by `copyTemplates` (since AGENT_FILES.cursor includes
 * the entire `cursor/` directory). This module only manages the hooks.json merge.
 */
const HOOK_SCRIPTS = {
  preCompact: 'pre-compact.sh',
  sessionEnd: 'session-log-check.sh',
  sessionStart: 'post-compact-reminder.sh',
} as const;

const ALL_HOOK_SCRIPTS: string[] = Object.values(HOOK_SCRIPTS);

/** Cursor hook entry — `{ "command": "bash ..." }`. No matcher/type/timeout. */
interface CursorHookEntry {
  command: string;
}

interface CursorHooksFile {
  version?: number;
  hooks?: Record<string, CursorHookEntry[]>;
  [key: string]: unknown;
}

/**
 * Builds the hooks block AI Context installs into .cursor/hooks.json.
 * See docs: https://cursor.com/docs/hooks
 */
function buildHookCommand(scriptName: string): string {
  return `bash "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.cursor/hooks/${scriptName}"`;
}

function buildHooksBlock(): Record<string, CursorHookEntry[]> {
  return {
    preCompact: [{ command: buildHookCommand(HOOK_SCRIPTS.preCompact) }],
    sessionEnd: [{ command: buildHookCommand(HOOK_SCRIPTS.sessionEnd) }],
    sessionStart: [{ command: buildHookCommand(HOOK_SCRIPTS.sessionStart) }],
  };
}

export interface CursorHooksInstallResult {
  /** True if scripts are present in `.cursor/hooks/` (copied by copyTemplates). */
  hooksCopied: boolean;
  configMerged: boolean;
  configSkipReason?: string;
  /** Which hook events had our entries added (or would be added, in dry-run). */
  eventsMerged: string[];
}

/**
 * Installs Cursor hooks into the target project.
 *
 * Scripts (`.cursor/hooks/*.sh`) are copied by `copyTemplates` as part of the
 * `cursor/` agent directory copy. This function only writes/merges
 * `.cursor/hooks.json` programmatically — keeping it out of the template tree
 * ensures `copyTemplates` never overwrites a user's customised hooks.json.
 */
export async function installCursorHooks(
  templateCursorDir: string,
  targetDir: string,
  dryRun = false,
): Promise<CursorHooksInstallResult> {
  const targetCursorDir = join(targetDir, '.cursor');
  const targetHooksDir = join(targetCursorDir, 'hooks');
  const targetHooksJson = join(targetCursorDir, 'hooks.json');

  // Confirm scripts are present (they should be — copyTemplates ran first).
  // We don't re-copy here because including hooks.json in templates would risk
  // overwriting user customisations on upgrade.
  void templateCursorDir;
  const hooksCopied = existsSync(join(targetHooksDir, HOOK_SCRIPTS.preCompact));

  if (!dryRun) {
    await mkdir(targetCursorDir, { recursive: true });
  }

  const mergeResult = await mergeHooksIntoConfig(targetHooksJson, dryRun);

  return {
    hooksCopied,
    configMerged: mergeResult.merged,
    configSkipReason: mergeResult.skipReason,
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

function entryUsesOurScript(entry: CursorHookEntry, scriptNames: string[]): boolean {
  const our = ourScriptInCommand(entry.command);
  return our !== null && scriptNames.includes(our);
}

async function mergeHooksIntoConfig(
  hooksPath: string,
  dryRun: boolean,
): Promise<MergeResult> {
  const ours = buildHooksBlock();

  // Case 1: no hooks.json yet → write ours fresh.
  if (!existsSync(hooksPath)) {
    if (!dryRun) {
      await mkdir(dirname(hooksPath), { recursive: true });
      await writeFile(
        hooksPath,
        JSON.stringify({ version: 1, hooks: ours }, null, 2) + '\n',
        'utf8',
      );
    }
    return { merged: true, eventsMerged: Object.keys(ours) };
  }

  const raw = await readFile(hooksPath, 'utf8');

  let config: CursorHooksFile;
  try {
    config = JSON.parse(raw);
  } catch {
    return { merged: false, skipReason: 'hooks.json is not valid JSON', eventsMerged: [] };
  }

  const existingHooks = config.hooks ?? {};
  const mergedHooks: Record<string, CursorHookEntry[]> = { ...existingHooks };

  const eventsMerged: string[] = [];

  for (const [event, ourEntries] of Object.entries(ours)) {
    const existingArr = Array.isArray(mergedHooks[event]) ? mergedHooks[event] : [];
    const toAdd: CursorHookEntry[] = [];

    for (const ourEntry of ourEntries) {
      const ourScriptName = ourScriptInCommand(ourEntry.command);
      if (!ourScriptName) continue;

      const existingIdx = existingArr.findIndex((e) => entryUsesOurScript(e, [ourScriptName]));
      if (existingIdx >= 0) {
        if (existingArr[existingIdx].command !== ourEntry.command) {
          existingArr[existingIdx] = ourEntry;
          eventsMerged.push(event);
        }
      } else {
        toAdd.push(ourEntry);
      }
    }

    if (toAdd.length > 0) {
      mergedHooks[event] = [...existingArr, ...toAdd];
      if (!eventsMerged.includes(event)) eventsMerged.push(event);
    } else if (eventsMerged.includes(event)) {
      mergedHooks[event] = existingArr;
    }
  }

  if (eventsMerged.length === 0) {
    return { merged: false, skipReason: 'AI Context hooks already present', eventsMerged: [] };
  }

  const merged: CursorHooksFile = {
    version: config.version ?? 1,
    ...config,
    hooks: mergedHooks,
  };

  if (!dryRun) {
    await writeFile(hooksPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  }

  return { merged: true, eventsMerged };
}

/**
 * Removes AI Context's hook entries from .cursor/hooks.json during uninstall.
 * Leaves user-owned hooks untouched. Returns true if anything was removed.
 *
 * If after removal the file is a "stub" — only the `version` field we wrote
 * on fresh install (or an empty object) — the file is deleted entirely so
 * uninstall actually removes everything AI Context created. Files with any
 * remaining user content are preserved.
 */
export async function removeCursorHooks(
  targetDir: string,
  dryRun = false,
): Promise<boolean> {
  const hooksPath = join(targetDir, '.cursor', 'hooks.json');
  if (!existsSync(hooksPath)) return false;

  const raw = await readFile(hooksPath, 'utf8');
  if (!ALL_HOOK_SCRIPTS.some((name) => raw.includes(name))) return false;

  let config: CursorHooksFile;
  try {
    config = JSON.parse(raw);
  } catch {
    return false;
  }

  const hooks = config.hooks;
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
    delete config.hooks;
  }

  if (!removedAny) return false;

  // If only `version` remains (or the object is empty), the file was created
  // by us on a fresh install — delete it so nothing AI Context-owned lingers.
  const remainingKeys = Object.keys(config).filter((k) => k !== 'version');
  const isOurStub = remainingKeys.length === 0;

  if (!dryRun) {
    if (isOurStub) {
      await rm(hooksPath, { force: true });
    } else {
      await writeFile(hooksPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    }
  }

  return true;
}
