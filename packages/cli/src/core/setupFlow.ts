import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { select } from '@inquirer/prompts';
import { getRegisteredCLIs, checkCLIStatus, runPromptViaCLI } from './agentCLI.js';
import type { KnownCLI } from './agentCLI.js';
import type { ApplyMode } from './manifest.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETUP_PROMPTS_DIR = join(__dirname, '..', '..', 'src', 'setup-prompts');

export function promptFileForMode(applyMode: ApplyMode): string {
  if (applyMode === 'fresh-install') {
    return join(SETUP_PROMPTS_DIR, 'fresh-install.md');
  }
  return join(SETUP_PROMPTS_DIR, 'upgrade.md');
}

// ---------------------------------------------------------------------------
// Public API — two entry points
// ---------------------------------------------------------------------------

/**
 * Interactive setup: ask user to pick a CLI agent, health check it, run the
 * setup prompt, save output log. Used by both `init` (after file copy) and
 * `setup` (standalone).
 */
export async function interactiveSetup(targetDir: string, applyMode: ApplyMode): Promise<boolean> {
  const registeredCLIs = getRegisteredCLIs();

  const choices = [
    ...registeredCLIs.map((cli) => ({ name: cli, value: cli })),
    { name: 'Print prompt (manual setup)', value: '_print' },
  ];

  const chosen = await select<string>({
    message: 'Which CLI agent should configure this project?',
    choices,
  });

  if (chosen === '_print') {
    const promptContent = await readFile(promptFileForMode(applyMode), 'utf8');
    printManualFallback(promptContent);
    return false;
  }

  return runWithCLI(targetDir, applyMode, chosen);
}

/**
 * Non-interactive setup: health check the given CLI, run the setup prompt,
 * save output log. Used by `setup --cli <name>`.
 */
export async function runWithCLI(targetDir: string, applyMode: ApplyMode, cli: KnownCLI): Promise<boolean> {
  const status = await checkCLIStatus(cli);
  if (status === 'not-found') {
    log.error(`${cli} is not installed. Install it and try again.`);
    return false;
  }
  if (status === 'not-authenticated') {
    log.error(`${cli} is installed but not authenticated or not responding. Set it up and try again.`);
    return false;
  }

  log.done(`${cli}: ready`);

  const promptFile = promptFileForMode(applyMode);

  log.blank();
  log.info(`Running ${applyMode === 'fresh-install' ? 'fresh-install' : 'upgrade'} setup via ${pc.bold(cli)}...`);
  log.blank();

  const result = await runPromptViaCLI(promptFile, cli);

  if (result.success) {
    log.done(`Setup completed via ${result.cli}.`);
    if (result.stdout) {
      const logPath = await writeSetupLog(targetDir, result.cli!, result.stdout);
      log.info(`Output saved to ${pc.dim(logPath)}`);
    }
    if (result.hadPermissionDenials) {
      log.blank();
      log.warn('Some files could not be updated — the CLI agent was denied write permission.');
      log.info('To complete setup, open this project in your coding agent interactively');
      log.info(`and paste the setup prompt. To see the prompt, run:`);
      log.info(`  ${pc.bold('ai-context setup --print')}`);
    }
    return true;
  }

  log.warn(result.error ?? 'CLI execution failed.');
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function printManualFallback(promptContent: string): void {
  log.blank();
  log.info('Paste the following prompt into your coding agent:');
  log.blank();
  log.rule();
  console.log(promptContent);
  log.rule();
  log.blank();
  log.info(`Or re-run later: ${pc.bold('ai-context setup')}`);
}

async function writeSetupLog(targetDir: string, cli: string, output: string): Promise<string> {
  const sessionsDir = join(targetDir, '.ai-context', 'sessions');
  await mkdir(sessionsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logFile = join(sessionsDir, `setup-${cli}-${ts}.log`);
  await writeFile(logFile, output, 'utf8');
  return logFile;
}
