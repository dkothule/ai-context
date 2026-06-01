import { Command } from 'commander';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { select } from '@inquirer/prompts';
import { readManifest, setConfiguredCli } from '../core/manifest.js';
import { getRegisteredCLIs, checkCLIStatus } from '../core/agentCLI.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

/**
 * `ai-context use [cli]` — set the CLI execution transport used by setup,
 * compact, and check-drift. Bare `use` shows an interactive picker; passing a
 * CLI name is the non-interactive shortcut.
 */
export function useCliCommand(): Command {
  return new Command('use')
    .description('Set the CLI agent used to run setup/compact/check-drift (claude, codex, cursor)')
    .argument('[cli]', 'CLI to use (omit for an interactive picker)')
    .option('--path <dir>', 'Target project directory', process.cwd())
    .action(async (cliArg: string | undefined, opts: { path: string }) => {
      const targetDir = resolve(opts.path);
      const contextDir = join(targetDir, '.ai-context');

      if (!existsSync(contextDir)) {
        log.error('AI Context is not installed in this directory.');
        log.info(`Run: ${pc.bold('ai-context init')} first.`);
        process.exit(1);
      }

      const registeredCLIs = getRegisteredCLIs();
      const manifest = await readManifest(contextDir);
      const current = manifest?.configured_cli ?? null;

      // Resolve the target CLI: validate the argument, or prompt interactively.
      let cli: string;
      if (cliArg) {
        if (!registeredCLIs.includes(cliArg)) {
          log.error(`Unknown CLI: ${cliArg}. Valid options: ${registeredCLIs.join(', ')}`);
          process.exit(1);
        }
        cli = cliArg;
      } else {
        log.heading('AI Context — use');
        if (current) log.info(`Current CLI: ${pc.bold(current)}`);
        cli = await select<string>({
          message: 'Which CLI agent should run setup/compact/check-drift?',
          choices: registeredCLIs.map((c) => ({ name: c, value: c })),
          default: current && registeredCLIs.includes(current) ? current : undefined,
        });
      }

      // Health-check is informational only — persist regardless so the user can
      // authenticate/install the CLI later without re-running this command.
      const status = await checkCLIStatus(cli, { cwd: targetDir });
      if (status === 'not-found') {
        log.warn(`${cli} is not installed yet; saved anyway.`);
      } else if (status === 'not-authenticated') {
        log.warn(`${cli} is installed but not authenticated; saved anyway.`);
      } else if (status === 'unavailable') {
        log.warn(`${cli} is installed but not ready right now; saved anyway.`);
      }

      const saved = await setConfiguredCli(contextDir, cli);
      if (!saved) {
        log.error('Could not write manifest.json — AI Context may be partially installed.');
        process.exit(1);
      }

      log.done(`Configured CLI: ${pc.bold(cli)}`);
      log.info('setup, compact, and check-drift will use this CLI by default.');
    });
}
