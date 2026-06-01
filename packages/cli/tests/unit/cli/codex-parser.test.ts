import { describe, expect, it } from 'vitest';
import {
  codexExtractResult,
  codexExtractText,
  codexHasPermissionDenials,
} from '../../../src/core/cli/vendors/codex.js';

// Fixtures authored from Codex CLI JSONL output (item.started/completed wrapping
// an item with a type; command_execution carries command + exit_code).

describe('codex parser', () => {
  describe('extractText', () => {
    it('shows a running command on item.started', () => {
      expect(
        codexExtractText({ type: 'item.started', item: { type: 'command_execution', command: 'ls -la' } }),
      ).toBe('\n  → Running: ls -la\n');
    });

    it('shows completion with exit 0', () => {
      expect(
        codexExtractText({
          type: 'item.completed',
          item: { type: 'command_execution', command: 'ls -la', exit_code: 0 },
        }),
      ).toBe('  ✓ Completed: ls -la\n');
    });

    it('shows a non-zero exit as failed', () => {
      expect(
        codexExtractText({
          type: 'item.completed',
          item: { type: 'command_execution', command: 'false', exit_code: 1 },
        }),
      ).toBe('  ! Failed (1): false\n');
    });

    it('never prints aggregated command output', () => {
      const text = codexExtractText({
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command: 'cat big',
          exit_code: 0,
          aggregated_output: 'SECRET LARGE OUTPUT',
        },
      });
      expect(text).not.toContain('SECRET LARGE OUTPUT');
    });

    it('labels non-command items generically', () => {
      expect(codexExtractText({ type: 'item.started', item: { type: 'file_change' } })).toBe('\n  → file change\n');
      expect(codexExtractText({ type: 'item.completed', item: { type: 'file_change' } })).toBe('  ✓ file change\n');
    });

    it('ignores agent_message and error items (kept for the log/result, not progress)', () => {
      expect(codexExtractText({ type: 'item.completed', item: { type: 'agent_message', text: 'hi' } })).toBeNull();
      expect(codexExtractText({ type: 'item.started', item: { type: 'error' } })).toBeNull();
    });
  });

  describe('extractResult', () => {
    it('returns the agent_message text on completion', () => {
      expect(
        codexExtractResult({ type: 'item.completed', item: { type: 'agent_message', text: 'final answer' } }),
      ).toBe('final answer');
    });
    it('returns null otherwise', () => {
      expect(codexExtractResult({ type: 'item.started', item: { type: 'agent_message', text: 'x' } })).toBeNull();
    });
  });

  it('reports no permission denials (Codex has no such signal today)', () => {
    expect(codexHasPermissionDenials()).toBe(false);
  });
});
