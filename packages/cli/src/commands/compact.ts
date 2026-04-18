import { Command } from 'commander';
import { resolve, join, basename } from 'path';
import { existsSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import { getRegisteredCLIs } from '../core/agentCLI.js';
import { executeOrCopy } from '../core/clipboardFallback.js';
import { writeCommandLog, isoStamp } from '../core/logWriter.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

const VALID_PERMISSION_MODES = ['default', 'acceptEdits', 'plan', 'auto', 'dontAsk', 'bypassPermissions'];

interface CompactOptions {
  olderThan: string;
  keep: string;
  dryRun?: boolean;
  print?: boolean;
  copy?: boolean;
  cli?: string;
  permissionMode?: string;
}

export function compactCommand(): Command {
  return new Command('compact')
    .description('Archive old session logs into a rollup to reduce context bloat')
    .argument('[path]', 'Target project directory', process.cwd())
    .option('--older-than <days>', 'Archive sessions older than this many days', '30')
    .option('--keep <n>', 'Always keep the N most recent sessions regardless of age', '10')
    .option('-n, --dry-run', 'Print what would be archived; no execution or clipboard')
    .option('--print', 'Print the rollup prompt to stdout (bypass execution and clipboard)')
    .option('--copy', 'Copy the prompt to the clipboard (skip CLI execution)')
    .option('--cli <name>', 'Force a specific CLI (e.g. claude, codex)')
    .option('--permission-mode <mode>', `Override claude --permission-mode (${VALID_PERMISSION_MODES.join('|')})`)
    .action(async (pathArg: string, opts: CompactOptions) => {
      const targetDir = resolve(pathArg);
      const sessionsDir = join(targetDir, '.ai-context', 'sessions');

      if (!existsSync(sessionsDir)) {
        log.error(`Sessions directory not found: ${sessionsDir}`);
        log.info(`Is AI Context installed in ${pc.bold(targetDir)}? Run ${pc.bold('ai-context init')} first.`);
        process.exit(1);
      }

      const olderThanDays = Number(opts.olderThan);
      const keepCount = Number(opts.keep);
      if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
        log.error(`--older-than must be a non-negative number, got: ${opts.olderThan}`);
        process.exit(1);
      }
      if (!Number.isFinite(keepCount) || keepCount < 0) {
        log.error(`--keep must be a non-negative number, got: ${opts.keep}`);
        process.exit(1);
      }
      if (opts.permissionMode && !VALID_PERMISSION_MODES.includes(opts.permissionMode)) {
        log.error(`Invalid --permission-mode: ${opts.permissionMode}. Valid: ${VALID_PERMISSION_MODES.join(', ')}`);
        process.exit(1);
      }
      if (opts.cli && !getRegisteredCLIs().includes(opts.cli)) {
        log.error(`Unknown CLI: ${opts.cli}. Valid: ${getRegisteredCLIs().join(', ')}`);
        process.exit(1);
      }

      const toArchive = await selectSessionsToArchive(sessionsDir, olderThanDays, keepCount);

      if (toArchive.length === 0) {
        log.heading('AI Context — compact');
        log.done(`Nothing to archive: no session logs older than ${olderThanDays} days (keeping latest ${keepCount}).`);
        return;
      }

      const prompt = buildRollupPrompt(toArchive, sessionsDir, olderThanDays, keepCount);

      if (opts.dryRun) {
        log.heading('AI Context — compact (dry run)');
        log.info(`Would archive ${pc.bold(String(toArchive.length))} session(s):`);
        for (const s of toArchive) {
          log.step(`${s.relPath} — ${daysAgo(s.mtime)} day(s) old`);
        }
        log.blank();
        log.info(`Writing rollup to: ${pc.dim(proposedRollupPath(toArchive))}`);
        log.blank();
        log.rule();
        console.log(prompt);
        log.rule();
        return;
      }

      const mode = opts.print ? 'print' : opts.copy ? 'copy' : 'auto';

      if (mode !== 'print') {
        log.heading('AI Context — compact');
        log.info(`Archiving ${pc.bold(String(toArchive.length))} session log(s) via ${mode === 'copy' ? 'clipboard' : 'agent CLI'}...`);
      }

      const result = await executeOrCopy({
        prompt,
        mode,
        preferredCLI: opts.cli,
        permissionMode: opts.permissionMode,
        commandName: 'compact',
        pasteHint: 'the agent will read, summarize, and archive the listed session files.',
      });

      // Persist a compact log regardless of outcome.
      const logContent = [
        '---',
        `command: ai-context compact`,
        `outcome: ${result.outcome}`,
        `older_than_days: ${olderThanDays}`,
        `keep: ${keepCount}`,
        `source_count: ${toArchive.length}`,
        `finished_at: ${isoStamp()}`,
        '---',
        '',
        '# Compact log',
        '',
        `- **Outcome**: ${result.outcome}`,
        `- **CLI**: ${result.cli ?? 'n/a'}`,
        `- **Older-than threshold**: ${olderThanDays} days`,
        `- **Keep count**: ${keepCount}`,
        `- **Selected for archive**: ${toArchive.length} file(s)`,
        '',
        '## Sessions submitted for archival',
        '',
        ...toArchive.map((s) => `- \`${s.relPath}\``),
        '',
        '## Agent output',
        '',
        result.stdout && result.stdout.trim().length > 0
          ? result.stdout
          : '(no agent output — outcome was not "executed")',
        '',
      ].join('\n');

      const logPath = await writeCommandLog({ targetDir, category: 'compact', content: logContent });
      log.info(`Compact log: ${pc.dim(logPath)}`);

      if (result.outcome === 'failed') {
        process.exit(1);
      }
    });
}

export interface SessionFile {
  relPath: string;
  absPath: string;
  mtime: Date;
}

export async function selectSessionsToArchive(
  sessionsDir: string,
  olderThanDays: number,
  keepCount: number,
): Promise<SessionFile[]> {
  const entries = await readdir(sessionsDir, { withFileTypes: true });
  const candidates: SessionFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;
    if (entry.name === '_template.md') continue;
    if (entry.name.endsWith('-precompact-autosave.md')) continue; // don't archive autosaves — they're user-pending

    const absPath = join(sessionsDir, entry.name);
    const s = await stat(absPath);
    candidates.push({ relPath: `.ai-context/sessions/${entry.name}`, absPath, mtime: s.mtime });
  }

  // Sort newest → oldest
  candidates.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  // Drop the newest `keepCount` unconditionally
  const agedOut = candidates.slice(keepCount);

  // Of the rest, keep only those older than the threshold
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  return agedOut.filter((f) => f.mtime.getTime() < cutoff);
}

function daysAgo(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function proposedRollupPath(toArchive: SessionFile[]): string {
  const ym = monthKey(toArchive[toArchive.length - 1].mtime);
  return `.ai-context/sessions/_archive/${ym}-rollup.md`;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildRollupPrompt(
  toArchive: SessionFile[],
  sessionsDir: string,
  olderThanDays: number,
  keepCount: number,
): string {
  const oldest = toArchive[toArchive.length - 1];
  const newest = toArchive[0];
  const rangeStart = isoDate(oldest.mtime);
  const rangeEnd = isoDate(newest.mtime);
  const rollupRel = proposedRollupPath(toArchive);

  const fileList = toArchive
    .map((s) => `- ${s.relPath} (${isoDate(s.mtime)})`)
    .join('\n');

  return `# AI Context — session compaction

You are compressing \`.ai-context/sessions/\` to prevent context bloat. Read the listed session files, extract what still matters, write a single rollup, then delete the source files.

## Parameters
- Older-than threshold: ${olderThanDays} days
- Keep count (newest preserved): ${keepCount}
- Source count: ${toArchive.length}
- Rollup target: \`${rollupRel}\`

## Source files to archive (${toArchive.length}):

${fileList}

## Task

1. **Read each source file above.**
2. **Extract into the rollup**:
   - Decisions carried forward (choices still in effect)
   - Open threads / TODOs still relevant today
   - Non-obvious file/area knowledge (context about specific files that isn't discoverable from code alone)
3. **Write the rollup** to \`${rollupRel}\` using this exact template (fill in the content, keep the frontmatter keys and section headings):

\`\`\`markdown
---
archived: true
range_start: ${rangeStart}
range_end: ${rangeEnd}
source_count: ${toArchive.length}
---

# Archived sessions ${rangeStart} → ${rangeEnd}

## Decisions carried forward
- <short decision> — rationale; source: <filename>

## Open threads at end of range
- <thread> — last status; source: <filename>

## File/area knowledge
- <path/to/file or area>: <what you need to know>

## Archived sessions
${toArchive.map((s) => `- ${basename(s.relPath)} — one-line summary`).join('\n')}
\`\`\`

4. **After the rollup is written and you've verified it captures each source file's essence, DELETE the source files** (${toArchive.map((s) => `\`${s.relPath}\``).join(', ')}).
5. If any source file has uniquely important details that don't fit the schema above, preserve them verbatim in the rollup under a \`## Verbatim preserved from <filename>\` section rather than losing them.
6. Briefly report which source files were archived and confirm the rollup path.

Sessions directory: \`${sessionsDir}\`
`;
}
