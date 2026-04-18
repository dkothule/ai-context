import { checkbox } from '@inquirer/prompts';
import type { AgentId } from '../core/copyTemplates.js';

interface AgentChoice {
  id: AgentId;
  label: string;
  detail: string;
  defaultChecked: boolean;
}

const AGENT_CHOICES: AgentChoice[] = [
  {
    id: 'claude',
    label: 'Claude',
    detail: 'CLAUDE.md + .claude/',
    defaultChecked: true,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    detail: '.cursor/rules/main.mdc',
    defaultChecked: true,
  },
  {
    id: 'codex',
    label: 'Codex',
    detail: 'AGENTS.md',
    defaultChecked: true,
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    detail: '.agent/rules/rules.md',
    defaultChecked: false,
  },
];

/**
 * Shows an interactive checkbox list for agent selection.
 * Returns the selected agent IDs.
 */
export async function selectAgents(): Promise<AgentId[]> {
  const selected = await checkbox<AgentId>({
    message: 'Which agent adapters should be installed? (space to select, enter to confirm)',
    choices: AGENT_CHOICES.map((a) => ({
      name: `${a.label.padEnd(20)} ${a.detail}`,
      value: a.id,
      checked: a.defaultChecked,
    })),
    validate: (values) =>
      values.length > 0 ? true : 'Select at least one agent.',
  });

  return selected;
}

/**
 * Parses a comma-separated agent list string into validated AgentId[].
 * Throws if any unknown agent name is given.
 */
export function parseAgentList(raw: string): AgentId[] {
  const validIds = new Set<AgentId>(AGENT_CHOICES.map((a) => a.id));
  const parts = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const invalid = parts.filter((p) => !validIds.has(p as AgentId));
  if (invalid.length > 0) {
    throw new Error(
      `Unknown agent(s): ${invalid.join(', ')}. Valid values: ${[...validIds].join(', ')}`,
    );
  }

  return parts as AgentId[];
}
