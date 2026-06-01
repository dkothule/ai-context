// ---------------------------------------------------------------------------
// Shared formatting helpers for streaming-progress labels.
//
// These are vendor-agnostic primitives used by the per-vendor parsers in
// `cli/vendors/*` to turn raw JSON tool-call events into concise one-line
// progress labels (e.g. "Write: .ai-context/project.tasks.md").
// ---------------------------------------------------------------------------

/** Collapse whitespace and truncate to `max` chars with an ellipsis. */
export function compactLine(value: string, max = 120): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

/** Return the first non-empty string among the arguments, or null. */
export function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

/** Narrow an unknown to a plain record, or undefined. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Turn a "shellToolCall" style key into a human label ("Shell"). */
export function humanizeToolKey(key: string): string {
  return key
    .replace(/ToolCall$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (ch) => ch.toUpperCase());
}

/**
 * Build a concise "ToolName: detail" label from a tool name + input object.
 * Used by both the claude and cursor parsers.
 */
export function toolLabel(name: unknown, input: unknown): string {
  const inputObj = asRecord(input);

  const toolName = firstString(name, inputObj?.tool, inputObj?.name) ?? 'Tool';
  const detail = firstString(
    inputObj?.description,
    inputObj?.command,
    inputObj?.file_path,
    inputObj?.target_file,
    inputObj?.targetFile,
    inputObj?.path,
    inputObj?.pattern,
    inputObj?.query,
    inputObj?.url,
  );

  return detail ? `${toolName}: ${compactLine(detail)}` : toolName;
}
