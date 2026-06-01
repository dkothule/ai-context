// ---------------------------------------------------------------------------
// Public entry point for the agent-CLI subsystem.
//
// This file is a thin barrel so existing imports (`./agentCLI.js`) stay stable.
// The implementation is split by concern under `cli/`:
//   cli/types.ts      — CLIConfig, parsers, result/status types
//   cli/format.ts     — shared progress-label helpers
//   cli/vendors/*     — one module per CLI (command shape + stream parsers)
//   cli/registry.ts   — the CLI registry + spec/progress accessors
//   cli/detection.ts  — binary resolution, health checks, auto-detection
//   cli/process.ts    — generic spawn helper (health checks, version probes)
//   cli/runner.ts     — streaming prompt execution
//
// To add or fix a vendor, edit `cli/vendors/<name>.ts` (and register it in
// cli/registry.ts) — detection and execution code stays untouched.
// ---------------------------------------------------------------------------

export type {
  CLIConfig,
  VendorParsers,
  StreamEvent,
  KnownCLI,
  CLIStatus,
  CLICheckResult,
  CLICommandSpec,
  RunPromptResult,
  RunPromptOptions,
} from './cli/types.js';

export {
  CLI_REGISTRY,
  getRegisteredCLIs,
  getCLIConfig,
  getCLIStreamingProgressText,
  getCLICommandSpecs,
} from './cli/registry.js';

export {
  detectAvailableCLIs,
  resolveBinary,
  checkCLIStatus,
  isAuthenticationFailure,
} from './cli/detection.js';

export { runPromptContentViaCLI, runPromptViaCLI } from './cli/runner.js';
