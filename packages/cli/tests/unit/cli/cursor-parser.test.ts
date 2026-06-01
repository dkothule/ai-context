import { describe, expect, it } from 'vitest';
import {
  cursorExtractResult,
  cursorExtractText,
  cursorHasPermissionDenials,
  cursorToolLabel,
} from '../../../src/core/cli/vendors/cursor.js';

// Fixtures authored from Cursor's documented stream-json events
// (cursor.com/docs/cli/headless): tool_call events carry a nested
// `<kind>ToolCall.args` object; result events carry `result`.

describe('cursor parser', () => {
  describe('cursorToolLabel', () => {
    it('reads nested shellToolCall args for a useful label', () => {
      const label = cursorToolLabel({
        type: 'tool_call',
        tool_call: { shellToolCall: { args: { command: 'ls', description: 'List files' } } },
      });
      expect(label).toBe('Shell: List files');
    });

    it('humanizes the tool kind when no detail is present', () => {
      const label = cursorToolLabel({ type: 'tool_call', tool_call: { readToolCall: { args: {} } } });
      expect(label).toBe('Read');
    });
  });

  describe('extractText', () => {
    it('prefixes started events', () => {
      expect(
        cursorExtractText({
          type: 'tool_call',
          subtype: 'started',
          tool_call: { shellToolCall: { args: { description: 'Run build' } } },
        }),
      ).toBe('\n  → Shell: Run build\n');
    });

    it('checkmarks completed events', () => {
      expect(
        cursorExtractText({
          type: 'tool_call',
          subtype: 'completed',
          tool_call: { shellToolCall: { args: { description: 'Run build' } } },
        }),
      ).toBe('  ✓ Shell: Run build\n');
    });

    it('ignores non-tool_call events', () => {
      expect(cursorExtractText({ type: 'assistant', message: { content: [] } })).toBeNull();
    });
  });

  describe('extractResult', () => {
    it('returns the result string', () => {
      expect(cursorExtractResult({ type: 'result', result: 'all done' })).toBe('all done');
    });
    it('returns null otherwise', () => {
      expect(cursorExtractResult({ type: 'tool_call', subtype: 'completed' })).toBeNull();
    });
  });

  it('reports no permission denials (Cursor has no documented signal today)', () => {
    expect(cursorHasPermissionDenials()).toBe(false);
  });
});
