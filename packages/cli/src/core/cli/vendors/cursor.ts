import type { CLIConfig, StreamEvent } from '../types.js';
import { asRecord, firstString, humanizeToolKey, toolLabel } from '../format.js';

// ---------------------------------------------------------------------------
// Cursor (`agent`, fallback `cursor-agent`) — positional prompt, stream-json.
//
// Verified against Cursor Agent CLI. Unlike claude/codex, the prompt is a
// positional argument (see `promptStyle: 'positional'` + the `{PROMPT}`
// placeholder). `--force` auto-accepts edits; `--trust` avoids a headless
// workspace-trust prompt. Events follow cursor.com/docs/cli/headless:
//   { type: 'tool_call', subtype: 'started'|'completed', tool_call: {...} }
//   { type: 'result', result?: '...' }
// ---------------------------------------------------------------------------

/** Build a label from Cursor's nested `tool_call.<kind>ToolCall.args` shape. */
export function cursorToolLabel(event: StreamEvent): string {
  const toolCall = asRecord(event.tool_call);
  const nestedEntry = toolCall
    ? Object.entries(toolCall).find(
        ([key, value]) => key.endsWith('ToolCall') && value && typeof value === 'object',
      )
    : undefined;

  const nestedName = nestedEntry ? humanizeToolKey(nestedEntry[0]) : null;
  const nestedCall = asRecord(nestedEntry?.[1]);
  const nestedArgs = asRecord(nestedCall?.args);
  const input = nestedArgs ?? nestedCall ?? toolCall ?? event.input ?? event.args;

  return toolLabel(
    firstString(
      event.name,
      event.tool_name,
      toolCall?.name,
      toolCall?.tool_name,
      nestedCall?.name,
      nestedCall?.tool_name,
      nestedName,
    ),
    input,
  );
}

export function cursorExtractText(event: StreamEvent): string | null {
  if (event.type !== 'tool_call') return null;

  const label = cursorToolLabel(event);

  if (event.subtype === 'started') return `\n  → ${label}\n`;
  if (event.subtype === 'completed') return `  ✓ ${label}\n`;
  return null;
}

export function cursorExtractResult(event: StreamEvent): string | null {
  if (event.type === 'result' && typeof event.result === 'string') {
    return event.result;
  }
  return null;
}

// Cursor doesn't document a permission-denials event in stream-json today.
export function cursorHasPermissionDenials(): boolean {
  return false;
}

export const cursorConfig: CLIConfig = {
  name: 'cursor',
  // Newer install ships as `agent`; older builds shipped as `cursor-agent`.
  bin: 'agent',
  binFallback: 'cursor-agent',
  promptStyle: 'positional',
  // Text output for the ping so the throwaway response is plain text.
  pingArgs: ['--print', '--mode', 'ask', '--trust', '--output-format', 'text', 'respond ok'],
  runArgs: [
    '--print',
    '--force',
    '--trust',
    '--output-format', 'stream-json',
    '--stream-partial-output',
    '{PROMPT}',
  ],
  parsers: {
    extractText: cursorExtractText,
    extractResult: cursorExtractResult,
    hasPermissionDenials: cursorHasPermissionDenials,
  },
};
