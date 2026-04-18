import { Command } from 'commander';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { readManifest } from '../core/manifest.js';
import { getRegisteredCLIs } from '../core/agentCLI.js';
import { interactiveSetup, runSetup, promptFileForMode } from '../core/setupFlow.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

const VALID_PERMISSION_MODES = ['default', 'acceptEdits', 'plan', 'auto', 'dontAsk', 'bypassPermissions'];

export function setupCommand(): Command {
  return new Command('setup')
    .description('Run the AI Context setup prompt via your coding agent (or copy/print it)')
    .argument('[path]', 'Target project directory', process.cwd())
    .option('--print', 'Print the prompt to stdout (bypass execution and clipboard)')
    .option('--copy', 'Copy the prompt to the clipboard (skip CLI execution)')
    .option('--cli <name>', 'Force a specific CLI (e.g. claude, codex)')
    .option('--permission-mode <mode>', `Override claude --permission-mode (${VALID_PERMISSION_MODES.join('|')})`)
    .action(
      async (
        pathArg: string,
        opts: { print?: boolean; copy?: boolean; cli?: string; permissionMode?: string },
      ) => {
        const targetDir = resolve(pathArg);
        const contextDir = join(targetDir, '.ai-context');

        if (!existsSync(contextDir)) {
          log.error('AI Context is not installed in this directory.');
          log.info(`Run: ${pc.bold('ai-context init')} first.`);
          process.exit(1);
        }

        if (opts.permissionMode && !VALID_PERMISSION_MODES.includes(opts.permissionMode)) {
          log.error(`Invalid --permission-mode: ${opts.permissionMode}. Valid: ${VALID_PERMISSION_MODES.join(', ')}`);
          process.exit(1);
        }

        const manifest = await readManifest(contextDir);
        const applyMode = manifest?.apply_mode ?? 'fresh-install';
        const promptFile = promptFileForMode(applyMode);

        if (!existsSync(promptFile)) {
          log.error(`Setup prompt file not found: ${promptFile}`);
          process.exit(1);
        }

        const mode = opts.print ? 'print' : opts.copy ? 'copy' : 'auto';

        // --cli flag or --print/--copy: skip agent selector, go straight to runSetup
        if (opts.cli || mode !== 'auto') {
          if (opts.cli) {
            const registeredCLIs = getRegisteredCLIs();
            if (!registeredCLIs.includes(opts.cli)) {
              log.error(`Unknown CLI: ${opts.cli}. Valid options: ${registeredCLIs.join(', ')}`);
              process.exit(1);
            }
          }
          if (mode !== 'print') log.heading('AI Context — setup');
          await runSetup(targetDir, applyMode, { cli: opts.cli, mode, permissionMode: opts.permissionMode });
          return;
        }

        // Interactive: prompt user to pick a CLI, then runSetup via executeOrCopy.
        log.heading('AI Context — setup');
        await interactiveSetup(targetDir, applyMode, { permissionMode: opts.permissionMode });
      },
    );
}
