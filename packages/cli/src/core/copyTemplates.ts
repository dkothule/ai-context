import { cp, mkdir, readdir } from 'fs/promises';
import { join } from 'path';

export type AgentId = 'claude' | 'cursor' | 'codex' | 'antigravity';

export const ALL_AGENTS: AgentId[] = ['claude', 'cursor', 'codex', 'antigravity'];

/**
 * Maps an agent ID to the files/dirs it requires from the template.
 */
const AGENT_FILES: Record<AgentId, string[]> = {
  // Note: claude/ hooks are installed separately by installClaudeHooks().
  // Here we only copy the adapter file. settings.json is user-owned and must not be overwritten.
  claude: ['CLAUDE.md'],
  cursor: ['cursor/'],
  codex: ['AGENTS.md'],
  antigravity: ['agent/'],
};

export interface CopyOptions {
  /** Bundled templates root (e.g. path.join(__dirname, '../templates')) */
  templatesDir: string;
  /** Target project root. */
  targetDir: string;
  /** Which agents to install. Defaults to all. */
  agents?: AgentId[];
  /** If true, log actions but write nothing. */
  dryRun?: boolean;
  /** Callback called for each copied path (for logging). */
  onCopy?: (rel: string) => void;
}

/**
 * Maps template directory/file names (without leading dots) to their
 * target paths (with leading dots where appropriate).
 */
const TEMPLATE_TO_TARGET: Record<string, string> = {
  'ai-context/': '.ai-context/',
  'claude/': '.claude/',
  'cursor/': '.cursor/',
  'agent/': '.agent/',
  'AGENTS.md': 'AGENTS.md',
  'CLAUDE.md': 'CLAUDE.md',
};

/**
 * Copies AI Context template files into the target project.
 *
 * Always copies .ai-context/ (the shared context dir) regardless of agent selection.
 * Agent-specific files are copied only if the corresponding agent is selected.
 *
 * For .ai-context/, session logs are NOT copied (only _template.md is kept).
 */
export async function copyTemplates(options: CopyOptions): Promise<string[]> {
  const { templatesDir, targetDir, agents = ALL_AGENTS, dryRun = false, onCopy } = options;
  const copied: string[] = [];

  // Always copy .ai-context/ (excluding historical session and plan logs)
  await copyAiContextDir(templatesDir, targetDir, dryRun, onCopy, copied);

  // Copy agent-specific files
  const filesToCopy = new Set<string>();
  for (const agent of agents) {
    for (const file of AGENT_FILES[agent]) {
      filesToCopy.add(file);
    }
  }

  for (const templateRel of filesToCopy) {
    const src = join(templatesDir, templateRel.replace(/\/$/, ''));
    const targetRel = TEMPLATE_TO_TARGET[templateRel] ?? templateRel;
    const dst = join(targetDir, targetRel.replace(/\/$/, ''));

    if (!dryRun) {
      await mkdir(join(dst, '..'), { recursive: true });
      await cp(src, dst, { recursive: true });
    }
    onCopy?.(targetRel);
    copied.push(targetRel);
  }

  return copied;
}

/**
 * Copies .ai-context/ template into target, excluding historical session logs and plan files.
 * Only sessions/_template.md and plans/_template.md are copied.
 */
async function copyAiContextDir(
  templatesDir: string,
  targetDir: string,
  dryRun: boolean,
  onCopy: ((rel: string) => void) | undefined,
  copied: string[],
): Promise<void> {
  const src = join(templatesDir, 'ai-context');
  const dst = join(targetDir, '.ai-context');

  if (!dryRun) {
    // Copy the whole directory first
    await mkdir(dst, { recursive: true });
    await cp(src, dst, { recursive: true });

    // Remove historical session logs (keep _template.md)
    await removeHistoricalLogs(join(dst, 'sessions'));
    // Remove historical plan files (keep _template.md)
    await removeHistoricalLogs(join(dst, 'plans'));
  }

  onCopy?.('.ai-context/');
  copied.push('.ai-context/');
}

/**
 * Removes all .md files in a directory except _template.md.
 */
async function removeHistoricalLogs(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const { unlink } = await import('fs/promises');
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_template.md') {
        await unlink(join(dir, entry.name));
      }
    }
  } catch {
    // Directory may not exist in templates; that's fine
  }
}
