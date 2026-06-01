import type { CLIConfig, StreamEvent } from '../types.js';
import { compactLine } from '../format.js';

// ---------------------------------------------------------------------------
// Codex (`codex exec`) — stdin prompt delivery, JSONL output.
//
// Verified against Codex CLI 0.135.x. Non-interactive execution lives under
// `codex exec` (older `-q`/`-p` usage is rejected). `--disable hooks` avoids
// invoking the project's own session hooks during AI Context automation;
// `--ephemeral` + `--skip-git-repo-check` keep runs self-contained.
// ---------------------------------------------------------------------------

// Common `codex exec` flags shared by ping and run; only the sandbox value and
// prompt delivery differ between them, so those are spelled out per use.
const COMMON = [
  '--skip-git-repo-check',
  '--disable', 'hooks',
  '--color', 'never',
  '--ephemeral',
];

// Codex JSONL events wrap items: `{ type: 'item.started'|'item.completed',
// item: { type, command?, exit_code?, ... } }`. We print concise activity
// summaries only; verbose aggregated command output stays in the command log.
export function codexExtractText(event: StreamEvent): string | null {
  const item = event.item as Record<string, unknown> | undefined;
  if (!item || typeof item.type !== 'string') return null;
  if (item.type === 'agent_message' || item.type === 'error') return null;

  if (item.type !== 'command_execution') {
    const label = item.type.replace(/_/g, ' ');
    if (event.type === 'item.started') return `\n  → ${label}\n`;
    if (event.type === 'item.completed') return `  ✓ ${label}\n`;
    return null;
  }

  const command = typeof item.command === 'string' ? compactLine(item.command) : 'command';

  if (event.type === 'item.started') {
    return `\n  → Running: ${command}\n`;
  }

  if (event.type === 'item.completed') {
    const exitCode = item.exit_code;
    if (exitCode === 0) return `  ✓ Completed: ${command}\n`;
    if (typeof exitCode === 'number') return `  ! Failed (${exitCode}): ${command}\n`;
  }

  return null;
}

export function codexExtractResult(event: StreamEvent): string | null {
  const item = event.item as Record<string, unknown> | undefined;
  if (
    event.type === 'item.completed' &&
    item?.type === 'agent_message' &&
    typeof item.text === 'string'
  ) {
    return item.text;
  }
  return null;
}

// Codex doesn't surface a permission-denials signal in JSONL today.
export function codexHasPermissionDenials(): boolean {
  return false;
}

export const codexConfig: CLIConfig = {
  name: 'codex',
  bin: 'codex',
  // ping is read-only and passes its prompt positionally.
  pingArgs: ['exec', '--sandbox', 'read-only', ...COMMON, 'respond ok'],
  // run is workspace-write, JSONL, prompt on stdin (`-`).
  runArgs: ['exec', '--sandbox', 'workspace-write', ...COMMON, '--json', '-'],
  parsers: {
    extractText: codexExtractText,
    extractResult: codexExtractResult,
    hasPermissionDenials: codexHasPermissionDenials,
  },
};
