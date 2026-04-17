import { Command } from 'commander';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { readManifest } from '../core/manifest.js';
import { getRegisteredCLIs } from '../core/agentCLI.js';
import { interactiveSetup, runWithCLI, promptFileForMode } from '../core/setupFlow.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

export function setupCommand(): Command {
  return new Command('setup')
    .description('Run (or print) the AI Context setup prompt for your coding agent')
    .argument('[path]', 'Target project directory', process.cwd())
    .option('--print', 'Print the prompt to stdout without executing it')
    .option('--cli <name>', 'Force a specific CLI (e.g. claude, codex)')
    .action(
      async (
        pathArg: string,
        opts: { print?: boolean; cli?: string },
      ) => {
        const targetDir = resolve(pathArg);
        const contextDir = join(targetDir, '.ai-context');

        if (!existsSync(contextDir)) {
          log.error('AI Context is not installed in this directory.');
          log.info(`Run: ${pc.bold('ai-context init')} first.`);
          process.exit(1);
        }

        const manifest = await readManifest(contextDir);
        const applyMode = manifest?.apply_mode ?? 'fresh-install';
        const promptFile = promptFileForMode(applyMode);

        if (!existsSync(promptFile)) {
          log.error(`Setup prompt file not found: ${promptFile}`);
          process.exit(1);
        }

        // --print: just print the prompt
        if (opts.print) {
          const promptContent = await readFile(promptFile, 'utf8');
          console.log(promptContent);
          return;
        }

        log.heading('AI Context — setup');

        // --cli flag: skip prompts, run directly
        if (opts.cli) {
          const registeredCLIs = getRegisteredCLIs();
          if (!registeredCLIs.includes(opts.cli)) {
            log.error(`Unknown CLI: ${opts.cli}. Valid options: ${registeredCLIs.join(', ')}`);
            process.exit(1);
          }
          await runWithCLI(targetDir, applyMode, opts.cli);
          return;
        }

        // Interactive: same flow as init's post-install setup
        await interactiveSetup(targetDir, applyMode);
      },
    );
}
