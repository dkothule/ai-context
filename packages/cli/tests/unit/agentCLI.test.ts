import { describe, expect, it } from 'vitest';
import {
  getCLICommandSpecs,
  getCLIStreamingProgressText,
  getRegisteredCLIs,
} from '../../src/core/agentCLI.js';

describe('agentCLI registry', () => {
  it('registers claude, codex, and cursor', () => {
    const registered = getRegisteredCLIs();
    expect(registered).toEqual(expect.arrayContaining(['claude', 'codex', 'cursor']));
  });

  it('does not register removed agents (gemini)', () => {
    expect(getRegisteredCLIs()).not.toContain('gemini');
  });

  it('uses current Codex exec syntax instead of stale -q/-p flags', () => {
    const codex = getCLICommandSpecs().codex;

    expect(codex.bin).toBe('codex');
    expect(codex.pingArgs[0]).toBe('exec');
    expect(codex.runArgs[0]).toBe('exec');
    expect(codex.runArgs).toContain('-');
    expect(codex.runArgs).toEqual(expect.arrayContaining([
      '--sandbox',
      'workspace-write',
      '--skip-git-repo-check',
      '--disable',
      'hooks',
      '--json',
    ]));
    expect(codex.pingArgs).not.toContain('-q');
    expect(codex.runArgs).not.toContain('-q');
    expect(codex.runArgs).not.toContain('-p');
  });

  it('keeps CLI-specific prompt delivery modes explicit', () => {
    const specs = getCLICommandSpecs();

    expect(specs.claude.promptStyle).toBeUndefined();
    expect(specs.claude.runArgs).toContain('-');
    expect(specs.claude.runArgs).toEqual(expect.arrayContaining(['--permission-mode', 'acceptEdits']));
    // Streaming is the single execution path.
    expect(specs.claude.runArgs).toEqual(expect.arrayContaining(['--output-format', 'stream-json']));

    expect(specs.cursor.promptStyle).toBe('positional');
    expect(specs.cursor.bin).toBe('agent');
    expect(specs.cursor.binFallback).toBe('cursor-agent');
    expect(specs.cursor.runArgs).toEqual(expect.arrayContaining([
      '--print',
      '--force',
      '--trust',
      '{PROMPT}',
    ]));
  });
});

describe('agentCLI streaming progress labels', () => {
  it('labels Claude tool-use events with tool names and useful details', () => {
    const text = getCLIStreamingProgressText('claude', {
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            name: 'Write',
            input: { file_path: '/tmp/project/.ai-context/project.tasks.md' },
          },
        ],
      },
    });

    expect(text).toContain('→ Write: /tmp/project/.ai-context/project.tasks.md');
  });

  it('labels Cursor nested shellToolCall events instead of generic Tool', () => {
    const text = getCLIStreamingProgressText('cursor', {
      type: 'tool_call',
      subtype: 'started',
      tool_call: {
        shellToolCall: {
          args: {
            command: 'ls -la /tmp/project',
            description: 'List files in workspace directory',
          },
        },
      },
    });

    expect(text).toBe('\n  → Shell: List files in workspace directory\n');
  });

  it('keeps Codex command output concise', () => {
    const started = getCLIStreamingProgressText('codex', {
      type: 'item.started',
      item: {
        type: 'command_execution',
        command: '/bin/zsh -lc ls',
        aggregated_output: '',
      },
    });
    const completed = getCLIStreamingProgressText('codex', {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: '/bin/zsh -lc ls',
        aggregated_output: 'large output that should not be printed',
        exit_code: 0,
      },
    });

    expect(started).toBe('\n  → Running: /bin/zsh -lc ls\n');
    expect(completed).toBe('  ✓ Completed: /bin/zsh -lc ls\n');
    expect(completed).not.toContain('large output');
  });
});
