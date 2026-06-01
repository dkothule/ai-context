import type { CLIConfig, StreamEvent } from '../types.js';
import { toolLabel } from '../format.js';

// ---------------------------------------------------------------------------
// Claude Code (`claude`) — stdin prompt delivery, stream-json output.
//
// Verified against Claude Code 2.1.x.
// ---------------------------------------------------------------------------

// Read-only Bash patterns the setup/drift prompts commonly use (diff, find,
// cat, ls, git diff/log/status, rg, tree). Pre-approving them keeps
// non-interactive runs from hitting permission_denials while investigating.
const ALLOWED_TOOLS = [
  'Bash(diff:*)', 'Bash(find:*)', 'Bash(cat:*)', 'Bash(ls:*)',
  'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git status:*)',
  'Bash(rg:*)', 'Bash(tree:*)',
];

/** Replace the value following `--permission-mode` in an arg list, if present. */
export function applyClaudePermissionMode(args: string[], mode: string): string[] {
  const out = [...args];
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i] === '--permission-mode') out[i + 1] = mode;
  }
  return out;
}

export function claudeExtractText(event: StreamEvent): string | null {
  if (event.type === 'assistant') {
    const message = event.message as Record<string, unknown> | undefined;
    const content = message?.content as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(content)) return null;

    const lines = content
      .filter((block) => block.type === 'tool_use')
      .map((block) => `  → ${toolLabel(block.name, block.input)}\n`);

    return lines.length > 0 ? `\n${lines.join('')}` : null;
  }

  if (event.type === 'user' && event.tool_use_result) {
    return '  ✓ Tool completed\n';
  }

  return null;
}

export function claudeExtractResult(event: StreamEvent): string | null {
  if (event.type === 'result' && typeof event.result === 'string') {
    return event.result;
  }
  return null;
}

export function claudeHasPermissionDenials(event: StreamEvent): boolean {
  if (event.type === 'result') {
    const denials = event.permission_denials as unknown[] | undefined;
    return Array.isArray(denials) && denials.length > 0;
  }
  return false;
}

export const claudeConfig: CLIConfig = {
  name: 'claude',
  bin: 'claude',
  // `--permission-mode acceptEdits` pre-grants file-edit permissions so
  // non-interactive runs don't stall on per-Edit prompts. Users can override
  // via `ai-context <cmd> --permission-mode <mode>` (see applyPermissionMode).
  pingArgs: ['-p', 'respond ok'],
  runArgs: [
    '-p',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', ...ALLOWED_TOOLS,
    '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
    '-',
  ],
  parsers: {
    extractText: claudeExtractText,
    extractResult: claudeExtractResult,
    hasPermissionDenials: claudeHasPermissionDenials,
  },
  applyPermissionMode: applyClaudePermissionMode,
};
