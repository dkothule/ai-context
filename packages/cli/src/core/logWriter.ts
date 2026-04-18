import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Command categories that write audit logs to `.ai-context/logs/<category>/`.
 * Each category owns its subdirectory; logs are append-only (the installer never
 * deletes past logs across upgrades).
 */
export type CommandCategory = 'install' | 'setup' | 'drift' | 'compact';

export interface CommandLogOptions {
  /** Target project root (the one that contains .ai-context/). */
  targetDir: string;
  /** Which command produced the log. */
  category: CommandCategory;
  /** Markdown content to write (include your own frontmatter if desired). */
  content: string;
  /** Optional filename suffix, e.g. 'drift-report' → `<ts>-drift-report.md`. */
  suffix?: string;
}

/**
 * Writes a markdown log to `.ai-context/logs/<category>/<ISO-ts>[-suffix].md`.
 * Creates the directory if needed. Returns the absolute path written.
 *
 * Safe to call even if the outer `.ai-context/` is missing — `mkdir(..., recursive)`
 * will create the full path.
 */
export async function writeCommandLog(opts: CommandLogOptions): Promise<string> {
  const logsDir = join(opts.targetDir, '.ai-context', 'logs', opts.category);
  await mkdir(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const suffix = opts.suffix ? `-${opts.suffix}` : '';
  const logPath = join(logsDir, `${ts}${suffix}.md`);
  const finalContent = opts.content.endsWith('\n') ? opts.content : opts.content + '\n';
  await writeFile(logPath, finalContent, 'utf8');
  return logPath;
}

/**
 * Renders a timestamp as `YYYY-MM-DD HH:MM:SS UTC` for log frontmatter.
 */
export function isoStamp(d: Date = new Date()): string {
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}
