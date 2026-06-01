import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { startSpinner } from '../../ui/spinner.js';
import { CLI_REGISTRY } from './registry.js';
import { detectAvailableCLIs, resolveBinary } from './detection.js';
import { formatDuration, waitingMessage } from './process.js';
import type { CLIConfig, KnownCLI, RunPromptOptions, RunPromptResult } from './types.js';

const PROMPT_RUN_TIMEOUT_MS = 600_000;

/** Substitute `{PROMPT}` placeholders in an arg list with the prompt content. */
function substitutePromptPlaceholder(args: string[], prompt: string): string[] {
  return args.map((arg) => arg.replace('{PROMPT}', prompt));
}

/**
 * Builds the final run args for a CLI: applies the vendor's permission-mode
 * override (if any) and substitutes the positional prompt placeholder.
 */
function buildRunArgs(config: CLIConfig, prompt: string, permissionMode?: string): string[] {
  let args = config.runArgs;
  if (permissionMode && config.applyPermissionMode) {
    args = config.applyPermissionMode(args, permissionMode);
  }
  if (config.promptStyle === 'positional') {
    args = substitutePromptPlaceholder(args, prompt);
  }
  return args;
}

/**
 * Attempts to run a prompt (string content) through a coding-agent CLI.
 * Tries the preferred CLI, or auto-detects the first ready one.
 */
export async function runPromptContentViaCLI(
  promptContent: string,
  options: RunPromptOptions = {},
): Promise<RunPromptResult> {
  const { preferredCLI, permissionMode, cwd } = options;
  const clisToTry: KnownCLI[] = preferredCLI ? [preferredCLI] : await detectAvailableCLIs();

  if (clisToTry.length === 0) {
    return { success: false, error: 'No coding agent CLI found on PATH' };
  }

  let lastError: string | undefined;
  for (const cli of clisToTry) {
    const config = CLI_REGISTRY[cli];
    if (!config) continue;

    const resolvedBin = await resolveBinary(config);
    if (!resolvedBin) {
      lastError = `${config.name} binary not found on PATH`;
      continue;
    }

    // Single execution path: stream JSON events and extract via the vendor's
    // parsers. A future non-streaming CLI would add an explicit mode here.
    const positional = config.promptStyle === 'positional';
    const args = buildRunArgs(config, promptContent, permissionMode);
    const stdinForProcess = positional ? '' : promptContent;

    try {
      const result = await runStream(
        config,
        resolvedBin,
        args,
        stdinForProcess,
        PROMPT_RUN_TIMEOUT_MS,
        cwd,
      );
      return {
        success: true,
        cli,
        stdout: result.stdout,
        hadPermissionDenials: result.hadPermissionDenials,
      };
    } catch (err) {
      lastError = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    }
  }

  return {
    success: false,
    error: lastError ? `CLI execution failed: ${lastError}` : `CLI(s) found but execution failed`,
  };
}

/** Attempts to run a prompt file through a coding-agent CLI. */
export async function runPromptViaCLI(
  promptPath: string,
  preferredCLI?: KnownCLI,
  options: Omit<RunPromptOptions, 'preferredCLI'> = {},
): Promise<RunPromptResult> {
  const promptContent = await readFile(promptPath, 'utf8');
  return runPromptContentViaCLI(promptContent, { preferredCLI, ...options });
}

// ---------------------------------------------------------------------------
// Streaming runner (private)
// ---------------------------------------------------------------------------

interface StreamingResult {
  stdout: string;
  hadPermissionDenials: boolean;
}

/**
 * Runs a CLI with streaming JSON output, parsing events in real-time via the
 * vendor's parsers and rendering concise progress to the terminal.
 */
function runStream(
  config: CLIConfig,
  bin: string,
  args: string[],
  input: string,
  timeoutMs: number,
  cwd?: string,
): Promise<StreamingResult> {
  const { parsers } = config;

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '';
    let fullResult = '';
    let hadPermissionDenials = false;
    let timedOut = false;
    let stderr = '';
    let spinnerActive = true;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const IDLE_MS = 500; // re-show spinner after 500ms of no text
    const canRenderIdleSpinner = Boolean(process.stdout.isTTY);

    let spinner = startSpinner(waitingMessage(config.name, timeoutMs));

    const showIdleSpinner = () => {
      if (!canRenderIdleSpinner) return;
      if (!spinnerActive) {
        // Move to a new line so spinner doesn't overwrite streamed text
        process.stdout.write('\n');
        spinner = startSpinner(`${config.name} is working`);
        spinnerActive = true;
      }
    };

    const hideSpinner = () => {
      if (spinnerActive) {
        spinner.stop();
        spinnerActive = false;
      }
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(showIdleSpinner, IDLE_MS);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as Record<string, unknown>;

          const text = parsers.extractText(event);
          if (text) {
            hideSpinner();
            process.stdout.write(text);
            resetIdleTimer();
          }

          const result = parsers.extractResult(event);
          if (result) fullResult = result;

          if (parsers.hasPermissionDenials(event)) {
            hadPermissionDenials = true;
          }
        } catch {
          // Skip unparseable lines
        }
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 2000) stderr = stderr.slice(-2000);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (idleTimer) clearTimeout(idleTimer);
      hideSpinner();
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (idleTimer) clearTimeout(idleTimer);
      hideSpinner();
      process.stdout.write('\n');
      if (timedOut) {
        reject(new Error(`${config.name} timed out after ${formatDuration(timeoutMs)}`));
      } else if (code !== 0) {
        reject(new Error(stderr || `${config.name} exited with code ${code}`));
      } else {
        resolve({ stdout: fullResult, hadPermissionDenials });
      }
    });

    child.stdin?.write(input);
    child.stdin?.end();
  });
}
