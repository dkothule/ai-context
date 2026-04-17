import { mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { readManifest, writeManifest, readSourceManifest } from './manifest.js';
import { detectApplyMode } from './applyMode.js';
import { createBackupDir, backupPath } from './backup.js';
import { copyTemplates } from './copyTemplates.js';
import { installClaudeHooks } from './claudeHooks.js';
import { renameLegacyStandards } from './legacyStandards.js';
import { restoreProjectOwnedFiles } from './restore.js';
import { appendGitignoreEntries } from './gitignore.js';
import type { AgentId } from './copyTemplates.js';
import type { Manifest, ApplyMode } from './manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = join(__dirname, '..', '..', 'src', 'templates');

/** Paths managed by the installer (relative to target project root). */
const MANAGED_PATHS = [
  '.ai-context',
  '.cursor',
  '.agent',
  '.claude/hooks',
];

const ROOT_INSTRUCTION_FILES = ['AGENTS.md', 'CLAUDE.md'];

export interface InstallOptions {
  targetDir: string;
  agents?: AgentId[];
  gitignore?: boolean;
  dryRun?: boolean;
  onStep?: (msg: string) => void;
  onSkip?: (msg: string) => void;
  onWarn?: (msg: string) => void;
}

export interface InstallResult {
  applyMode: ApplyMode;
  version: string;
  schemaVersion: number;
  previousVersion: string | null;
  backupDir: string | null;
  restoredCount: number;
  copiedPaths: string[];
  hooksMerged: boolean;
  hooksMergeSkipReason?: string;
  gitignoreAdded: boolean;
}

/**
 * Core installation logic — shared by `apply` and `init` commands.
 *
 * Installation pipeline:
 * 1. Detect apply mode
 * 2. Backup managed paths
 * 3. Copy template files
 * 4. Install Claude hooks
 * 5. Rename legacy standards
 * 6. Restore project-owned .ai-context files
 * 7. Write manifest.json
 * 8. Optionally update .gitignore
 */
export async function runInstall(options: InstallOptions): Promise<InstallResult> {
  const {
    targetDir,
    agents,
    gitignore = false,
    dryRun = false,
    onStep = () => {},
    onSkip = () => {},
    onWarn = () => {},
  } = options;

  // Ensure target exists
  if (!existsSync(targetDir)) {
    if (!dryRun) await mkdir(targetDir, { recursive: true });
  }

  // 1. Read source manifest (bundled in package)
  const sourceManifest = await readSourceManifest(TEMPLATES_DIR);

  // 2. Detect apply mode
  const contextDir = join(targetDir, '.ai-context');
  const existingManifest = await readManifest(contextDir);
  const applyMode = detectApplyMode({
    hasExistingContext: existsSync(contextDir),
    existingVersion: existingManifest?.version ?? null,
    existingSchemaVersion: existingManifest?.schema_version ?? null,
    incomingVersion: sourceManifest.version,
    incomingSchemaVersion: sourceManifest.schema_version,
  });

  onStep(`Apply mode: ${applyMode}`);

  // 3. Backup managed paths
  let backupDir: string | null = null;
  if (!dryRun) {
    backupDir = await createBackupDir(targetDir);
  }

  // Back up root instruction files
  for (const file of ROOT_INSTRUCTION_FILES) {
    const existed = dryRun ? existsSync(join(targetDir, file)) : await backupPath(targetDir, file, backupDir!);
    if (existed) onStep(`Backed up ${file}`);
  }

  // Back up managed directories
  for (const rel of MANAGED_PATHS) {
    const existed = dryRun ? existsSync(join(targetDir, rel)) : await backupPath(targetDir, rel, backupDir!);
    if (existed) onStep(`Backed up ${rel}`);
  }

  // 4. Copy templates
  const copiedPaths = await copyTemplates({
    templatesDir: TEMPLATES_DIR,
    targetDir,
    agents,
    dryRun,
    onCopy: (rel) => onStep(`Copied ${rel}`),
  });

  // 5. Install Claude hooks
  const templateClaudeDir = join(TEMPLATES_DIR, 'claude');
  const hooksResult = await installClaudeHooks(templateClaudeDir, targetDir, dryRun);
  if (hooksResult.settingsMerged) {
    onStep('Merged Stop hook into .claude/settings.json');
  } else if (hooksResult.settingsSkipReason) {
    onSkip(`hooks merge skipped: ${hooksResult.settingsSkipReason}`);
    if (hooksResult.settingsSkipReason.includes('hooks')) {
      onWarn('Add the Stop hook manually to .claude/settings.json if needed.');
    }
  }

  // 6. Rename legacy standards
  const standardsDir = join(targetDir, '.ai-context', 'standards');
  const renamedStandards = dryRun ? [] : await renameLegacyStandards(standardsDir);
  for (const f of renamedStandards) {
    onStep(`Renamed legacy standards: ${f}`);
  }

  // 7. Restore project-owned .ai-context files from backup
  let restoredCount = 0;
  if (!dryRun && backupDir) {
    const backupContextDir = join(backupDir, '.ai-context');
    restoredCount = await restoreProjectOwnedFiles(backupContextDir, contextDir);
    if (restoredCount > 0) onStep(`Restored ${restoredCount} project-owned file(s)`);
  }

  // 8. Write manifest.json
  const now = new Date().toISOString();
  const newManifest: Manifest = {
    name: 'ai-context',
    version: sourceManifest.version,
    schema_version: sourceManifest.schema_version,
    managed_by: `npm:ai-context@${sourceManifest.version}`,
    installed_at: dryRun ? null : now,
    apply_mode: applyMode,
    agents_installed: agents ?? null,
    previous_version: existingManifest?.version ?? null,
    previous_schema_version: existingManifest?.schema_version ?? null,
  };

  if (!dryRun) {
    await writeManifest(contextDir, newManifest);
  }

  // Remove legacy template.manifest.json if present
  if (!dryRun) {
    const legacyManifest = join(contextDir, 'template.manifest.json');
    if (existsSync(legacyManifest)) {
      await rm(legacyManifest);
      onStep('Removed legacy template.manifest.json');
    }
  }

  // 9. Optionally update .gitignore
  let gitignoreAdded = false;
  if (gitignore) {
    gitignoreAdded = await appendGitignoreEntries(targetDir, dryRun);
    if (gitignoreAdded) onStep('Updated .gitignore');
    else onSkip('.gitignore entries already present');
  }

  return {
    applyMode,
    version: sourceManifest.version,
    schemaVersion: sourceManifest.schema_version,
    previousVersion: existingManifest?.version ?? null,
    backupDir,
    restoredCount,
    copiedPaths,
    hooksMerged: hooksResult.settingsMerged,
    hooksMergeSkipReason: hooksResult.settingsSkipReason,
    gitignoreAdded,
  };
}
