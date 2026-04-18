import { Command } from 'commander';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { rm, mkdir } from 'fs/promises';
import { createBackupDir, backupPath } from '../core/backup.js';
import { removeHookFromSettings } from '../core/claudeHooks.js';
import { readManifest } from '../core/manifest.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

/** Files and directories managed by AI Context (removed on uninstall). */
/** Authoritative removal scope — keep in sync with install.ts MANAGED_PATHS / ROOT_INSTRUCTION_FILES. */
const MANAGED_PATHS = [
  '.ai-context',
  '.cursor/rules/main.mdc',
  '.agent/rules/rules.md',
  '.claude/hooks',
  'AGENTS.md',
  'CLAUDE.md',
];

/** Parent dirs to prune if empty after removal. */
const PRUNE_CANDIDATES = ['.cursor/rules', '.cursor', '.agent/rules', '.agent'];

export function uninstallCommand(): Command {
  return new Command('uninstall')
    .description('Remove AI Context from a project')
    .argument('[path]', 'Target project directory', process.cwd())
    .option('-n, --dry-run', 'Print what would happen without removing anything')
    .action(async (pathArg: string, opts: { dryRun?: boolean }) => {
      const targetDir = resolve(pathArg);

      if (!existsSync(targetDir)) {
        log.error(`Directory not found: ${targetDir}`);
        process.exit(1);
      }

      // Verify AI Context is actually installed
      const hasMarker = MANAGED_PATHS.some((p) => existsSync(join(targetDir, p)));
      if (!hasMarker) {
        log.error('AI Context does not appear to be installed in this directory.');
        process.exit(1);
      }

      if (opts.dryRun) {
        log.warn('Dry run — no files will be removed.');
      }

      const contextDir = join(targetDir, '.ai-context');
      const manifest = await readManifest(contextDir);

      log.heading(`AI Context — uninstall${opts.dryRun ? ' (dry run)' : ''}`);
      if (manifest) {
        log.info(`Installed version: ${manifest.version}`);
      }

      // 1. Backup everything before removal
      let backupDir: string | null = null;
      if (!opts.dryRun) {
        backupDir = await createBackupDir(targetDir);
        // Override name to indicate uninstall
        // (backupDir already created, rename not necessary — timestamp is enough)
      }

      for (const rel of MANAGED_PATHS) {
        if (!opts.dryRun) {
          await backupPath(targetDir, rel, backupDir!);
        }
        log.step(`${opts.dryRun ? 'Would back up' : 'Backup'}: ${rel}`);
      }

      // 2. Remove managed paths
      for (const rel of MANAGED_PATHS) {
        const full = join(targetDir, rel);
        if (!existsSync(full)) continue;

        if (!opts.dryRun) {
          await rm(full, { recursive: true, force: true });
        }
        log.step(`Removed ${rel}`);
      }

      // 3. Remove hook from settings.json (proper JSON removal)
      if (!opts.dryRun) {
        const removed = await removeHookFromSettings(targetDir, false);
        if (removed) {
          log.step('Removed Stop hook from .claude/settings.json');
        }
      }

      // 4. Prune empty parent directories
      if (!opts.dryRun) {
        for (const rel of PRUNE_CANDIDATES) {
          const full = join(targetDir, rel);
          if (!existsSync(full)) continue;
          try {
            const { readdirSync } = await import('fs');
            if (readdirSync(full).length === 0) {
              await rm(full, { recursive: true });
              log.step(`Pruned empty dir: ${rel}`);
            }
          } catch {
            // ignore
          }
        }
      }

      log.blank();
      log.rule();
      if (backupDir) {
        log.info(`Backup:  ${backupDir}`);
      }
      log.done('AI Context removed.');
      log.rule();

      if (opts.dryRun) {
        log.blank();
        log.info(pc.dim('Re-run without --dry-run to apply.'));
      }
    });
}
