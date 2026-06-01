// ---------------------------------------------------------------------------
// Shared types for the agent-CLI subsystem.
//
// The design is a registry/strategy pattern: each supported coding-agent CLI
// (claude, codex, cursor, …) is described by a single `CLIConfig` data object
// in `cli/vendors/<name>.ts`. Vendor-specific behavior (command shape + how to
// parse its streaming JSON events) lives entirely in that one module, so adding
// or fixing a vendor never touches detection or process-I/O code.
// ---------------------------------------------------------------------------

/** A streaming JSON event emitted by a CLI in `--output-format stream-json`/`--json` mode. */
export type StreamEvent = Record<string, unknown>;

/**
 * Vendor-specific parsers for a CLI's streaming JSON output. These are the most
 * volatile part of any integration (frontier CLIs change event schemas often),
 * so each vendor exports them as named functions that are unit-tested against
 * captured/representative event fixtures in `tests/unit/cli/<vendor>-parser.test.ts`.
 */
export interface VendorParsers {
  /** Return concise progress text to display for an event, or null to ignore it. */
  extractText: (event: StreamEvent) => string | null;
  /** Return the final result text from an event, or null. */
  extractResult: (event: StreamEvent) => string | null;
  /** Return true if the event indicates permission denials occurred. */
  hasPermissionDenials: (event: StreamEvent) => boolean;
}

/**
 * Declarative description of one coding-agent CLI. To add a vendor, create
 * `cli/vendors/<name>.ts` exporting a `CLIConfig` and register it in
 * `cli/registry.ts` — no other code changes needed.
 */
export interface CLIConfig {
  /** Display name for user-facing messages. */
  name: string;
  /** Binary name on PATH. */
  bin: string;
  /** Optional secondary binary name to try if `bin` isn't on PATH. */
  binFallback?: string;
  /**
   * How the prompt content is delivered to the CLI:
   * - `'stdin'` (default): prompt is piped on stdin; `runArgs` should end with
   *   `-` (or otherwise instruct the CLI to read stdin).
   * - `'positional'`: prompt is substituted at the `{PROMPT}` placeholder inside
   *   `runArgs` and the CLI is invoked with empty stdin.
   */
  promptStyle?: 'stdin' | 'positional';
  /** Args for a health-check ping (should produce output and exit quickly). */
  pingArgs: string[];
  /**
   * Args for a streaming prompt run. The prompt is delivered per `promptStyle`.
   * This is the single execution path — there is intentionally no separate
   * non-streaming arg list (it was dead code). A future CLI that only supports
   * non-streaming output would add an explicit mode here + a runner branch.
   */
  runArgs: string[];
  /** Parsers for this vendor's streaming JSON events. */
  parsers: VendorParsers;
  /**
   * Optional, vendor-specific: apply an explicit permission/auto-accept mode
   * override to the run args (e.g. claude's `--permission-mode <mode>`). Omit
   * for vendors that have no such concept — the override is then ignored for
   * them. Modeling this as a per-vendor hook avoids leaking one vendor's flag
   * name into generic code.
   */
  applyPermissionMode?: (args: string[], mode: string) => string[];
}

export type KnownCLI = string;

export type CLIStatus = 'ready' | 'not-found' | 'not-authenticated' | 'unavailable';

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

export interface RunPromptOptions {
  /** CLI to use; if unset, auto-detect the first ready one. */
  preferredCLI?: KnownCLI;
  /** Working directory for the agent CLI process. */
  cwd?: string;
  /**
   * Override the CLI's permission/auto-accept mode (vendors that implement
   * `applyPermissionMode`, i.e. claude). Ignored by vendors without it.
   */
  permissionMode?: string;
}

/** Shape returned by `getCLICommandSpecs()` — useful for tests and diagnostics. */
export interface CLICommandSpec {
  bin: string;
  binFallback?: string;
  promptStyle?: 'stdin' | 'positional';
  pingArgs: string[];
  runArgs: string[];
}
