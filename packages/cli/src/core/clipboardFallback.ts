import clipboard from 'clipboardy';
import { runPromptContentViaCLI } from './agentCLI.js';
import type { KnownCLI } from './agentCLI.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

export type ExecuteOrCopyMode = 'auto' | 'copy' | 'print';

export interface ExecuteOrCopyOptions {
  /** The LLM prompt content, already rendered. */
  prompt: string;
  /** auto = try CLI then fall back to clipboard; copy = clipboard only; print = stdout only. */
  mode?: ExecuteOrCopyMode;
  /** CLI to prefer (claude, codex, gemini). If unset, auto-detect. */
  preferredCLI?: KnownCLI;
  /** Override `--permission-mode` (claude only). */
  permissionMode?: string;
  /** User-facing command name for status messages ("setup", "compact", "check-drift"). */
  commandName: string;
  /** One-line description of what the pasted prompt will do. Shown in status on clipboard path. */
  pasteHint: string;
}

export type ExecuteOrCopyOutcome = 'executed' | 'clipboard' | 'printed' | 'failed';

export interface ExecuteOrCopyResult {
  outcome: ExecuteOrCopyOutcome;
  cli?: KnownCLI;
  stdout?: string;
  error?: string;
  hadPermissionDenials?: boolean;
}

/**
 * Unified execute-first with clipboard fallback.
 *
 * - `mode: 'auto'` (default): tries the CLI with `--permission-mode acceptEdits`;
 *   on any failure (CLI missing, execution error, permission denials), copies the
 *   prompt to the clipboard with a clear paste instruction.
 * - `mode: 'copy'`: skips execution, copies directly to clipboard.
 * - `mode: 'print'`: skips execution, prints to stdout (for pipes like `| pbcopy`).
 *
 * Exit code convention: callers should treat `outcome === 'failed'` as fatal and
 * exit non-zero. All other outcomes are success from the CLI's point of view.
 */
export async function executeOrCopy(opts: ExecuteOrCopyOptions): Promise<ExecuteOrCopyResult> {
  const { prompt, mode = 'auto', preferredCLI, permissionMode, commandName, pasteHint } = opts;

  if (mode === 'print') {
    process.stdout.write(prompt);
    if (!prompt.endsWith('\n')) process.stdout.write('\n');
    return { outcome: 'printed' };
  }

  if (mode === 'copy') {
    return copyToClipboardWithStatus(prompt, commandName, pasteHint, 'copy requested');
  }

  // mode === 'auto' — try CLI first
  const result = await runPromptContentViaCLI(prompt, { preferredCLI, permissionMode });

  // Treat as executed if the CLI returned a real stdout/result, even if some
  // non-edit tool calls (e.g. Bash) hit permission_denials. The agent routinely
  // works around individual denials and completes the task — we shouldn't
  // discard its output by falling back to clipboard.
  if (result.success && result.stdout && result.stdout.trim().length > 0) {
    if (result.hadPermissionDenials) {
      log.done(`${commandName} completed via ${pc.bold(result.cli ?? 'CLI')} (some non-edit tools were denied; agent worked around them).`);
    } else {
      log.done(`${commandName} completed via ${pc.bold(result.cli ?? 'CLI')}.`);
    }
    return {
      outcome: 'executed',
      cli: result.cli,
      stdout: result.stdout,
      hadPermissionDenials: result.hadPermissionDenials,
    };
  }

  // CLI execution truly failed (no usable stdout) → clipboard fallback
  const reason = !result.success
    ? result.error ?? 'CLI execution failed'
    : 'CLI returned no output';
  return copyToClipboardWithStatus(prompt, commandName, pasteHint, reason);
}

async function copyToClipboardWithStatus(
  prompt: string,
  commandName: string,
  pasteHint: string,
  reason: string,
): Promise<ExecuteOrCopyResult> {
  try {
    await clipboard.write(prompt);
    log.blank();
    log.warn(`${commandName}: ${reason}. Prompt copied to clipboard.`);
    log.info(`Paste it into your agent window — ${pasteHint}`);
    return { outcome: 'clipboard' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.blank();
    log.error(`${commandName}: ${reason}, and clipboard copy failed (${msg}).`);
    log.info(`Run instead: ${pc.bold(`ai-context ${commandName} --print | pbcopy`)}`);
    return { outcome: 'failed', error: msg };
  }
}
