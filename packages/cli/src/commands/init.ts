import { Command } from 'commander';
import { resolve } from 'path';
import { confirm } from '@inquirer/prompts';
import { runInstall, TEMPLATES_DIR } from '../core/install.js';
import { readSourceManifest } from '../core/manifest.js';
import { selectAgents, parseAgentList } from '../prompts/agentSelector.js';
import { interactiveSetup } from '../core/setupFlow.js';
import type { AgentId } from '../core/copyTemplates.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

export function initCommand(): Command {
  return new Command('init')
    .description('Install AI Context interactively (the npx experience)')
    .argument('[path]', 'Target project directory', process.cwd())
    .option('-n, --dry-run', 'Print what would happen without writing anything')
    .option('-y, --yes', 'Skip confirmation prompts (CI-friendly)')
    .option('--agents <list>', 'Comma-separated agent list (skips interactive selection)')
    .option('--gitignore', 'Add sessions/ and backups/ to .gitignore')
    .action(
      async (
        pathArg: string,
        opts: {
          dryRun?: boolean;
          yes?: boolean;
          agents?: string;
          gitignore?: boolean;
        },
      ) => {
        const sourceManifest = await readSourceManifest(TEMPLATES_DIR);
        log.heading(`AI Context v${sourceManifest.version}`);

        const targetDir = resolve(pathArg);

        // 1. Confirm target directory
        if (!opts.yes) {
          const confirmed = await confirm({
            message: `Install AI Context into ${targetDir}?`,
            default: true,
          });
          if (!confirmed) {
            log.info('Cancelled.');
            process.exit(0);
          }
        }

        // 2. Agent selection
        let agents: AgentId[];
        if (opts.agents) {
          try {
            agents = parseAgentList(opts.agents);
          } catch (err) {
            log.error(err instanceof Error ? err.message : String(err));
            process.exit(1);
          }
        } else if (opts.yes) {
          const { ALL_AGENTS } = await import('../core/copyTemplates.js');
          agents = ALL_AGENTS;
        } else {
          agents = await selectAgents();
        }

        // 3. .gitignore (opt-in only via --gitignore flag)
        const addGitignore = opts.gitignore ?? false;

        if (opts.dryRun) {
          log.warn('Dry run — no files will be written.');
        }

        log.blank();

        try {
          const result = await runInstall({
            targetDir,
            agents,
            gitignore: addGitignore,
            dryRun: opts.dryRun ?? false,
            onStep: (msg) => log.step(msg),
            onSkip: (msg) => log.skip(msg),
            onWarn: (msg) => log.warn(msg),
          });

          // 4. Print summary
          log.blank();
          log.rule();
          log.info(`AI Context:  ${pc.bold(result.version)} (schema v${sourceManifest.schema_version})`);
          log.info(`Apply mode:  ${pc.bold(result.applyMode)}`);
          log.info(`Agents:      ${agents.join(', ')}`);
          if (result.previousVersion) {
            log.info(`Previous:    ${result.previousVersion}`);
          }
          if (result.backupDir) {
            log.info(`Backup:      ${result.backupDir}`);
          }
          if (result.restoredCount > 0) {
            log.info(`Restored:    ${result.restoredCount} project-owned file(s)`);
          }
          if (result.gitignoreAdded) {
            log.info(`Gitignore:   updated`);
          }
          log.rule();

          // 5. Run setup — same interactive flow as `ai-context setup`
          if (!opts.dryRun) {
            log.blank();
            await interactiveSetup(targetDir, result.applyMode);
          }
        } catch (err) {
          log.error(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}


