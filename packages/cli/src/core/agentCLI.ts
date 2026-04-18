import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { startSpinner } from '../ui/spinner.js';

/**
 * Substitute `--permission-mode <value>` occurrences in an arg list.
 * Leaves the list unchanged if no `--permission-mode` flag is present.
 */
function withPermissionMode(args: string[], mode: string | undefined): string[] {
  if (!mode) return args;
  const out = [...args];
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i] === '--permission-mode') {
      out[i + 1] = mode;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI Registry — add new agents here
// ---------------------------------------------------------------------------

export interface CLIConfig {
  /** Display name for user-facing messages. */
  name: string;
  /** Binary name on PATH. */
  bin: string;
  /** Args to run a health-check ping (should produce output and exit quickly). */
  pingArgs: string[];
  /** Args for running a prompt via stdin. Must accept prompt on stdin. */
  promptArgs: string[];
  /**
   * If set, use streaming mode: run with these args, parse newline-delimited
   * JSON events, and call extractText/extractResult to extract content.
   */
  streaming?: {
    args: string[];
    /** Return text to display from a JSON event, or null if not a text event. */
    extractText: (event: Record<string, unknown>) => string | null;
    /** Return final result text from a JSON event, or null. */
    extractResult: (event: Record<string, unknown>) => string | null;
    /** Return true if the event indicates permission denials occurred. */
    hasPermissionDenials: (event: Record<string, unknown>) => boolean;
  };
}

/**
 * Registry of known CLI agents that support non-interactive prompt execution.
 * To add a new agent, add an entry here — no other code changes needed.
 */
const CLI_REGISTRY: Record<string, CLIConfig> = {
  claude: {
    name: 'claude',
    bin: 'claude',
    pingArgs: ['-p', 'respond ok'],
    // --permission-mode acceptEdits pre-grants file-edit permissions so
    // non-interactive runs don't stall on per-Edit permission prompts.
    // --allowedTools pre-approves read-only Bash patterns the setup/drift
    // prompts commonly use (diff, find, cat, ls, git diff/log/status) so
    // the agent doesn't hit permission_denials while investigating.
    // Users can override via `ai-context <cmd> --permission-mode <mode>`.
    promptArgs: [
      '-p',
      '--permission-mode', 'acceptEdits',
      '--allowedTools',
      'Bash(diff:*)', 'Bash(find:*)', 'Bash(cat:*)', 'Bash(ls:*)',
      'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git status:*)',
      'Bash(rg:*)', 'Bash(tree:*)',
      '-',
    ],
    streaming: {
      args: [
        '-p',
        '--permission-mode', 'acceptEdits',
        '--allowedTools',
        'Bash(diff:*)', 'Bash(find:*)', 'Bash(cat:*)', 'Bash(ls:*)',
        'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git status:*)',
        'Bash(rg:*)', 'Bash(tree:*)',
        '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
        '-',
      ],
      extractText: (event) => {
        if (event.type === 'stream_event') {
          const inner = event.event as Record<string, unknown> | undefined;
          if (inner?.type === 'content_block_delta') {
            const delta = inner.delta as Record<string, unknown> | undefined;
            return (delta?.text as string) ?? null;
          }
        }
        return null;
      },
      extractResult: (event) => {
        if (event.type === 'result' && typeof event.result === 'string') {
          return event.result;
        }
        return null;
      },
      hasPermissionDenials: (event) => {
        if (event.type === 'result') {
          const denials = event.permission_denials as unknown[] | undefined;
          return Array.isArray(denials) && denials.length > 0;
        }
        return false;
      },
    },
  },
  codex: {
    name: 'codex',
    bin: 'codex',
    pingArgs: ['-q', 'respond ok'],
    promptArgs: ['-q', '-'],
  },
  gemini: {
    name: 'gemini',
    bin: 'gemini',
    pingArgs: ['-p', 'respond ok'],
    promptArgs: ['-p', '-'],
  },
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type KnownCLI = string;

export type CLIStatus = 'ready' | 'not-found' | 'not-authenticated';

export interface CLICheckResult {
  cli: KnownCLI;
  status: CLIStatus;
}

export interface RunPromptResult {
  success: boolean;
  cli?: KnownCLI;
  error?: string;
  stdout?: string;
  /** True if the CLI reported permission denials during execution. */
  hadPermissionDenials?: boolean;
}

/** Returns the list of all registered CLI IDs. */
export function getRegisteredCLIs(): string[] {
  return Object.keys(CLI_REGISTRY);
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Detects which coding agent CLIs are available, authenticated, and responsive.
 *
 * @param filter     If provided, only check these CLIs.
 * @param onStatus   Optional callback to report per-CLI status.
 * @param stopOnFirst If true, return as soon as the first ready CLI is found.
 */
export async function detectAvailableCLIs(
  filter?: string[],
  onStatus?: (result: CLICheckResult) => void,
  stopOnFirst = false,
): Promise<KnownCLI[]> {
  const allCLIs = Object.keys(CLI_REGISTRY);
  const candidates = filter
    ? allCLIs.filter((cli) => filter.includes(cli))
    : allCLIs;

  const available: KnownCLI[] = [];

  for (const cli of candidates) {
    const status = await checkCLIStatus(cli);
    onStatus?.({ cli, status });
    if (status === 'ready') {
      available.push(cli);
      if (stopOnFirst) return available;
    }
  }

  return available;
}

/**
 * Checks whether a CLI binary is on PATH, authenticated, and can execute prompts.
 */
export async function checkCLIStatus(cli: KnownCLI): Promise<CLIStatus> {
  const config = CLI_REGISTRY[cli];
  if (!config) return 'not-found';

  const spinner = startSpinner(`Checking ${config.name}`);

  // Step 1: binary exists?
  try {
    await runProcess(config.bin, ['--version'], '', 5_000);
  } catch {
    spinner.stop();
    return 'not-found';
  }

  // Step 2: can it execute a trivial prompt? (proves auth + connectivity)
  try {
    await runProcess(config.bin, config.pingArgs, '', 15_000);
    spinner.stop();
    return 'ready';
  } catch {
    spinner.stop();
    return 'not-authenticated';
  }
}

// ---------------------------------------------------------------------------
// Prompt execution
// ---------------------------------------------------------------------------

export interface RunPromptOptions {
  /** CLI to use; if unset, auto-detect the first ready one. */
  preferredCLI?: KnownCLI;
  /**
   * Override the CLI's `--permission-mode` arg (claude only).
   * Falls through to the CLIConfig default if unset.
   */
  permissionMode?: string;
}

/**
 * Attempts to run a prompt (string content) through a coding agent CLI.
 */
export async function runPromptContentViaCLI(
  promptContent: string,
  options: RunPromptOptions = {},
): Promise<RunPromptResult> {
  const { preferredCLI, permissionMode } = options;
  const clisToTry: KnownCLI[] = preferredCLI
    ? [preferredCLI]
    : await detectAvailableCLIs();

  if (clisToTry.length === 0) {
    return { success: false, error: 'No coding agent CLI found on PATH' };
  }

  let lastError: string | undefined;
  for (const cli of clisToTry) {
    const config = CLI_REGISTRY[cli];
    if (!config) continue;

    try {
      if (config.streaming) {
        const args = withPermissionMode(config.streaming.args, permissionMode);
        const result = await runStreamingWithArgs(config, args, promptContent, 300_000);
        return { success: true, cli, stdout: result.stdout, hadPermissionDenials: result.hadPermissionDenials };
      }
      const args = withPermissionMode(config.promptArgs, permissionMode);
      const stdout = await runProcess(config.bin, args, promptContent, 300_000, true);
      return { success: true, cli, stdout };
    } catch (err) {
      lastError = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    }
  }

  return {
    success: false,
    error: lastError
      ? `CLI execution failed: ${lastError}`
      : `CLI(s) found but execution failed`,
  };
}

/**
 * Attempts to run a prompt file through a coding agent CLI.
 */
export async function runPromptViaCLI(
  promptPath: string,
  preferredCLI?: KnownCLI,
  options: Omit<RunPromptOptions, 'preferredCLI'> = {},
): Promise<RunPromptResult> {
  const promptContent = await readFile(promptPath, 'utf8');
  return runPromptContentViaCLI(promptContent, { preferredCLI, ...options });
}

// ---------------------------------------------------------------------------
// Process runners (private)
// ---------------------------------------------------------------------------

/**
 * Runs a CLI with streaming JSON output, parsing events in real-time.
 * Used when a CLIConfig has a `streaming` configuration.
 */
interface StreamingResult {
  stdout: string;
  hadPermissionDenials: boolean;
}

function runStreamingWithArgs(config: CLIConfig, args: string[], input: string, timeoutMs: number): Promise<StreamingResult> {
  const { streaming } = config;
  if (!streaming) throw new Error(`${config.name} does not support streaming`);

  return new Promise((resolve, reject) => {
    const child = spawn(config.bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '';
    let fullResult = '';
    let hadPermissionDenials = false;
    let timedOut = false;
    let stderr = '';
    let spinnerActive = true;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const IDLE_MS = 500; // re-show spinner after 500ms of no text

    let spinner = startSpinner(`Waiting for ${config.name}`);

    const showIdleSpinner = () => {
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

          const text = streaming.extractText(event);
          if (text) {
            hideSpinner();
            process.stdout.write(text);
            resetIdleTimer();
          }

          const result = streaming.extractResult(event);
          if (result) fullResult = result;

          if (streaming.hasPermissionDenials(event)) {
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
        reject(new Error(`${config.name} timed out after ${timeoutMs / 1000}s`));
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

/**
 * Spawns a process, optionally writes to stdin, and returns stdout.
 * Generic runner for health checks, non-streaming prompt execution, etc.
 */
function runProcess(
  cmd: string,
  args: string[],
  input: string,
  timeoutMs: number,
  /** If true, show a waiting spinner and stream output to terminal. */
  streamOutput = false,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let receivedFirstOutput = false;

    const spinner = streamOutput ? startSpinner(`Waiting for ${cmd}`) : null;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      if (streamOutput) {
        if (!receivedFirstOutput) {
          receivedFirstOutput = true;
          spinner?.stop();
        }
        process.stdout.write(text);
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      if (stderr.length > 2000) stderr = stderr.slice(-2000);
      if (streamOutput) process.stderr.write(text);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!receivedFirstOutput) spinner?.stop();
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (!receivedFirstOutput) spinner?.stop();
      if (timedOut) {
        reject(new Error(`${cmd} timed out after ${timeoutMs / 1000}s`));
      } else if (code !== 0) {
        reject(new Error(stderr || `${cmd} exited with code ${code}`));
      } else {
        resolve(stdout);
      }
    });

    if (input) {
      child.stdin?.write(input);
    }
    child.stdin?.end();
  });
}
