import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { select } from '@inquirer/prompts';
import { getRegisteredCLIs, checkCLIStatus } from './agentCLI.js';
import type { KnownCLI } from './agentCLI.js';
import { executeOrCopy } from './clipboardFallback.js';
import type { ExecuteOrCopyMode, ExecuteOrCopyResult } from './clipboardFallback.js';
import { writeCommandLog, isoStamp } from './logWriter.js';
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

export interface SetupOptions {
  /** CLI to prefer. If unset and no chosen CLI, auto-detects. */
  cli?: KnownCLI;
  /** Execute mode override; default is 'auto' (CLI → clipboard fallback). */
  mode?: ExecuteOrCopyMode;
  /** Override `--permission-mode` for Claude. */
  permissionMode?: string;
}

/**
 * Interactive setup: ask user to pick a CLI agent, then run the setup flow.
 * Used by both `init` (after file copy) and `setup` (standalone).
 */
export async function interactiveSetup(
  targetDir: string,
  applyMode: ApplyMode,
  options: SetupOptions = {},
): Promise<boolean> {
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
    return runSetup(targetDir, applyMode, { ...options, mode: 'print' });
  }

  return runSetup(targetDir, applyMode, { ...options, cli: chosen });
}

/**
 * Non-interactive setup: executes the setup prompt via the preferred/detected
 * CLI, with automatic clipboard fallback if the CLI is missing, fails, or
 * hits a permission denial. `mode: 'print'` prints the prompt to stdout;
 * `mode: 'copy'` copies directly to clipboard.
 */
export async function runSetup(
  targetDir: string,
  applyMode: ApplyMode,
  options: SetupOptions = {},
): Promise<boolean> {
  const { cli, mode = 'auto', permissionMode } = options;

  // Only health-check when we're about to execute via a specific CLI.
  if (mode === 'auto' && cli) {
    const status = await checkCLIStatus(cli);
    if (status === 'not-found') {
      log.warn(`${cli} is not installed; falling back to clipboard.`);
    } else if (status === 'not-authenticated') {
      log.warn(`${cli} is installed but not authenticated; falling back to clipboard.`);
    } else {
      log.done(`${cli}: ready`);
    }
  }

  const promptFile = promptFileForMode(applyMode);
  const promptContent = await readFile(promptFile, 'utf8');

  if (mode === 'auto') {
    log.blank();
    log.info(`Running ${applyMode === 'fresh-install' ? 'fresh-install' : 'upgrade'} setup${cli ? ` via ${pc.bold(cli)}` : ''}...`);
    log.blank();
  }

  const result = await executeOrCopy({
    prompt: promptContent,
    mode,
    preferredCLI: cli,
    permissionMode,
    commandName: 'setup',
    pasteHint: 'the agent will read .ai-context/ and update it for this project.',
  });

  // Always persist a setup log, regardless of outcome (executed | clipboard | printed | failed).
  const logPath = await writeSetupLogEntry(targetDir, applyMode, cli, result);
  if (logPath) log.info(`Setup log: ${pc.dim(logPath)}`);

  return result.outcome !== 'failed';
}

/**
 * @deprecated — kept for backwards compatibility of the `init` command path.
 * Forwards to runSetup with a fixed CLI.
 */
export async function runWithCLI(targetDir: string, applyMode: ApplyMode, cli: KnownCLI): Promise<boolean> {
  return runSetup(targetDir, applyMode, { cli });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function writeSetupLogEntry(
  targetDir: string,
  applyMode: ApplyMode,
  cli: KnownCLI | undefined,
  result: ExecuteOrCopyResult,
): Promise<string | null> {
  const content = [
    '---',
    `command: ai-context setup`,
    `apply_mode: ${applyMode}`,
    `cli: ${cli ?? result.cli ?? 'none'}`,
    `outcome: ${result.outcome}`,
    `had_permission_denials: ${result.hadPermissionDenials ?? false}`,
    `finished_at: ${isoStamp()}`,
    '---',
    '',
    '# Setup log',
    '',
    `- **Apply mode**: ${applyMode}`,
    `- **CLI**: ${cli ?? result.cli ?? 'none'}`,
    `- **Outcome**: ${result.outcome}`,
    result.error ? `- **Error**: ${result.error}` : '',
    result.hadPermissionDenials ? `- **Note**: agent hit some non-edit tool denials (Bash) but completed its work.` : '',
    '',
    '## Agent output',
    '',
    result.stdout && result.stdout.trim().length > 0
      ? result.stdout
      : '(no output captured — outcome was not "executed" or the agent produced no streamed result)',
    '',
  ].filter((l) => l !== '').join('\n');

  return writeCommandLog({
    targetDir,
    category: 'setup',
    content,
  });
}
