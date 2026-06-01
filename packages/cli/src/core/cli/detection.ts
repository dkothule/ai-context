import { startSpinner } from '../../ui/spinner.js';
import { CLI_REGISTRY } from './registry.js';
import { runProcess } from './process.js';
import type { CLICheckResult, CLIConfig, CLIStatus, KnownCLI } from './types.js';

// ---------------------------------------------------------------------------
// Detection — which CLIs are installed, authenticated, and responsive.
// ---------------------------------------------------------------------------

/**
 * Detects which coding-agent CLIs are available, authenticated, and responsive.
 *
 * @param filter      If provided, only check these CLIs.
 * @param onStatus    Optional callback to report per-CLI status.
 * @param stopOnFirst If true, return as soon as the first ready CLI is found.
 */
export async function detectAvailableCLIs(
  filter?: string[],
  onStatus?: (result: CLICheckResult) => void,
  stopOnFirst = false,
): Promise<KnownCLI[]> {
  const allCLIs = Object.keys(CLI_REGISTRY);
  const candidates = filter ? allCLIs.filter((cli) => filter.includes(cli)) : allCLIs;

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
 * Resolves which binary name is actually on PATH for a CLI config: returns
 * `bin` if installed, otherwise `binFallback` if installed, otherwise null.
 */
export async function resolveBinary(config: CLIConfig): Promise<string | null> {
  const candidates = [config.bin, config.binFallback].filter(
    (b): b is string => typeof b === 'string' && b.length > 0,
  );
  for (const candidate of candidates) {
    try {
      // `--version` is universal across our supported CLIs; even cursor's
      // `agent` (which doesn't document --version) exits 0 on unrecognised
      // flags rather than ENOENT, so this still distinguishes "installed"
      // from "not on PATH".
      await runProcess(candidate, ['--version'], '', 5_000);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

/**
 * Checks whether a CLI binary is on PATH, authenticated, and can execute prompts.
 */
export async function checkCLIStatus(
  cli: KnownCLI,
  options: { cwd?: string } = {},
): Promise<CLIStatus> {
  const config = CLI_REGISTRY[cli];
  if (!config) return 'not-found';

  const spinner = startSpinner(`Checking ${config.name}`);

  // Step 1: binary exists (try primary then fallback)?
  const resolvedBin = await resolveBinary(config);
  if (!resolvedBin) {
    spinner.stop();
    return 'not-found';
  }

  // Step 2: can it execute a trivial prompt? (proves auth + connectivity)
  try {
    await runProcess(resolvedBin, config.pingArgs, '', 15_000, false, options.cwd);
    spinner.stop();
    return 'ready';
  } catch (err) {
    spinner.stop();
    return isAuthenticationFailure(err) ? 'not-authenticated' : 'unavailable';
  }
}

export function isAuthenticationFailure(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    message.includes('not authenticated') ||
    message.includes('not logged in') ||
    message.includes('authentication required') ||
    message.includes('login required') ||
    message.includes('please log in') ||
    message.includes('api key')
  );
}
