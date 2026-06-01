import { describe, expect, it } from 'vitest';
import {
  applyClaudePermissionMode,
  claudeConfig,
  claudeExtractResult,
  claudeExtractText,
  claudeHasPermissionDenials,
} from '../../../src/core/cli/vendors/claude.js';

// Fixtures are authored from Claude Code's documented stream-json schema
// (assistant.message.content[].tool_use, user.tool_use_result, result events).
// Replace with captured real events if the schema changes.

describe('claude parser', () => {
  describe('extractText', () => {
    it('labels a tool_use block with name + detail', () => {
      const text = claudeExtractText({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'a/b.ts' } }] },
      });
      expect(text).toBe('\n  → Edit: a/b.ts\n');
    });

    it('joins multiple tool_use blocks', () => {
      const text = claudeExtractText({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', name: 'Read', input: { file_path: 'x.ts' } },
            { type: 'text', text: 'ignored' },
            { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
          ],
        },
      });
      expect(text).toBe('\n  → Read: x.ts\n  → Bash: ls\n');
    });

    it('returns null for an assistant message with no tool_use', () => {
      expect(
        claudeExtractText({ type: 'assistant', message: { content: [{ type: 'text', text: 'hi' }] } }),
      ).toBeNull();
    });

    it('marks tool completion on user tool_use_result', () => {
      expect(claudeExtractText({ type: 'user', tool_use_result: {} })).toBe('  ✓ Tool completed\n');
    });

    it('ignores unrelated events', () => {
      expect(claudeExtractText({ type: 'system' })).toBeNull();
    });
  });

  describe('extractResult', () => {
    it('returns the final result string', () => {
      expect(claudeExtractResult({ type: 'result', result: 'done' })).toBe('done');
    });
    it('returns null for non-result events', () => {
      expect(claudeExtractResult({ type: 'assistant' })).toBeNull();
    });
  });

  describe('hasPermissionDenials', () => {
    it('is true when a result lists denials', () => {
      expect(claudeHasPermissionDenials({ type: 'result', permission_denials: [{ tool: 'Bash' }] })).toBe(true);
    });
    it('is false for an empty denial list', () => {
      expect(claudeHasPermissionDenials({ type: 'result', permission_denials: [] })).toBe(false);
    });
    it('is false for non-result events', () => {
      expect(claudeHasPermissionDenials({ type: 'assistant' })).toBe(false);
    });
  });

  describe('applyPermissionMode', () => {
    it('replaces the value after --permission-mode', () => {
      const out = applyClaudePermissionMode(['-p', '--permission-mode', 'acceptEdits', '-'], 'plan');
      expect(out).toEqual(['-p', '--permission-mode', 'plan', '-']);
    });
    it('leaves args unchanged when the flag is absent', () => {
      expect(applyClaudePermissionMode(['-p', '-'], 'plan')).toEqual(['-p', '-']);
    });
    it('is wired into the config', () => {
      expect(claudeConfig.applyPermissionMode).toBe(applyClaudePermissionMode);
    });
  });
});
