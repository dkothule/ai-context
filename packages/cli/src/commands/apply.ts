import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { runInstall } from '../core/install.js';
import { ALL_AGENTS } from '../core/copyTemplates.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

export function applyCommand(): Command {
  return new Command('apply')
    .description('Install or upgrade AI Context in a project (non-interactive)')
    .argument('[path]', 'Target project directory', process.cwd())
    .option('-n, --dry-run', 'Print what would happen without writing anything')
    .option('--gitignore', 'Add sessions/ and .ai-context-backups/ to .gitignore')
    .action(async (pathArg: string, opts: { dryRun?: boolean; gitignore?: boolean }) => {
      const targetDir = resolve(pathArg);

      if (!existsSync(targetDir)) {
        log.error(`Directory not found: ${targetDir}`);
        process.exit(1);
      }

      if (opts.dryRun) {
        log.warn('Dry run — no files will be written.');
      }

      log.heading(`AI Context — apply${opts.dryRun ? ' (dry run)' : ''}`);

      try {
        const result = await runInstall({
          targetDir,
          agents: ALL_AGENTS,
          gitignore: opts.gitignore ?? false,
          dryRun: opts.dryRun ?? false,
          onStep: (msg) => log.step(msg),
          onSkip: (msg) => log.skip(msg),
          onWarn: (msg) => log.warn(msg),
        });

        log.blank();
        log.rule();
        log.info(`AI Context:   ${pc.bold(result.version)} (schema v${result.schemaVersion})`);
        log.info(`Apply mode:   ${pc.bold(result.applyMode)}`);
        if (result.previousVersion) {
          log.info(`Previous:     ${result.previousVersion}`);
        }
        if (result.backupDir) {
          log.info(`Backup:       ${result.backupDir}`);
        }
        if (result.restoredCount > 0) {
          log.info(`Restored:     ${result.restoredCount} project-owned file(s)`);
        }
        log.rule();

        if (!opts.dryRun && result.applyMode === 'fresh-install') {
          log.blank();
          log.info('Next step: open this project in your coding agent and run:');
          log.info(pc.bold('  ai-context setup'));
          log.blank();
        }
      } catch (err) {
        log.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
