import type { CLIConfig, CLICommandSpec, KnownCLI, StreamEvent } from './types.js';
import { claudeConfig } from './vendors/claude.js';
import { codexConfig } from './vendors/codex.js';
import { cursorConfig } from './vendors/cursor.js';

// ---------------------------------------------------------------------------
// CLI registry — the single place that lists supported coding-agent CLIs.
// To add a vendor: create `cli/vendors/<name>.ts` exporting a CLIConfig and add
// it here. Nothing else needs to change.
//
// Note: `gemini` was registered speculatively but never tested; it was removed
// in v1.2. To add it back, verify ping/run args against the current Gemini CLI
// and add parser fixture tests.
// ---------------------------------------------------------------------------

export const CLI_REGISTRY: Record<string, CLIConfig> = {
  claude: claudeConfig,
  codex: codexConfig,
  cursor: cursorConfig,
};

/** Returns the list of all registered CLI IDs (registration order). */
export function getRegisteredCLIs(): string[] {
  return Object.keys(CLI_REGISTRY);
}

/** Look up a vendor config by id, or undefined. */
export function getCLIConfig(cli: KnownCLI): CLIConfig | undefined {
  return CLI_REGISTRY[cli];
}

/**
 * Returns the concise streaming-progress text for an event, or null.
 * Thin pass-through to the vendor's `extractText` parser.
 */
export function getCLIStreamingProgressText(cli: KnownCLI, event: StreamEvent): string | null {
  return CLI_REGISTRY[cli]?.parsers.extractText(event) ?? null;
}

/**
 * Returns the command shapes AI Context will use for each registered CLI.
 * Useful for tests and diagnostics; the function-valued parsers are
 * intentionally omitted.
 */
export function getCLICommandSpecs(): Record<string, CLICommandSpec> {
  return Object.fromEntries(
    Object.entries(CLI_REGISTRY).map(([id, config]) => [
      id,
      {
        bin: config.bin,
        binFallback: config.binFallback,
        promptStyle: config.promptStyle,
        pingArgs: [...config.pingArgs],
        runArgs: [...config.runArgs],
      },
    ]),
  );
}
