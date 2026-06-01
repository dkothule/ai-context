import { spawn } from 'child_process';
import { startSpinner } from '../../ui/spinner.js';

// ---------------------------------------------------------------------------
// Low-level process helpers (leaf module — no imports from registry/detection/
// runner, so it can be used by all of them without cycles).
// ---------------------------------------------------------------------------

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return `${seconds}s`;
}

export function waitingMessage(name: string, timeoutMs: number): string {
  return `Waiting for ${name} (this can take a few minutes; timeout after ${formatDuration(timeoutMs)})`;
}

/**
 * Spawns a process, optionally writes to stdin, and resolves with stdout.
 * Generic runner for health checks, version probes, and non-streaming output.
 */
export function runProcess(
  cmd: string,
  args: string[],
  input: string,
  timeoutMs: number,
  /** If true, show a waiting spinner and stream output to the terminal. */
  streamOutput = false,
  cwd?: string,
  /** If true, show a spinner even when output is captured silently. */
  showSpinner = streamOutput,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let receivedFirstOutput = false;

    const spinner = showSpinner ? startSpinner(waitingMessage(cmd, timeoutMs)) : null;

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
        reject(new Error(`${cmd} timed out after ${formatDuration(timeoutMs)}`));
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
