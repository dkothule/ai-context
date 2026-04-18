import { Command } from 'commander';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import { getRegisteredCLIs } from '../core/agentCLI.js';
import { executeOrCopy } from '../core/clipboardFallback.js';
import { writeCommandLog, isoStamp } from '../core/logWriter.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

const VALID_PERMISSION_MODES = ['default', 'acceptEdits', 'plan', 'auto', 'dontAsk', 'bypassPermissions'];
const VALID_FIX_LEVELS = ['significant', 'moderate', 'minor', 'all'];

interface CheckDriftOptions {
  staticOnly?: boolean;
  dryRun?: boolean;
  print?: boolean;
  copy?: boolean;
  fix?: string | boolean; // '' | 'significant' | 'moderate' | 'minor' | 'all' | true
  cli?: string;
  permissionMode?: string;
}

export interface DriftFinding {
  kind: 'broken-ref' | 'stale-overview' | 'stale-task' | 'stale-backlog';
  message: string;
  source: string;
}

export function checkDriftCommand(): Command {
  return new Command('check-drift')
    .description('Detect drift between .ai-context/ and the actual codebase; optionally apply patches')
    .argument('[path]', 'Target project directory', process.cwd())
    .option('--static-only', 'Run only local checks; skip the LLM analysis + report file')
    .option('-n, --dry-run', 'Print what would happen; write nothing')
    .option('--print', 'Print the LLM prompt to stdout (bypass execution/clipboard/file)')
    .option('--copy', 'Write the drift report file AND copy a follow-up prompt to clipboard')
    .option('--fix [severity]', `Write the report AND apply patches at or above this severity (${VALID_FIX_LEVELS.join('|')}; default: significant)`)
    .option('--cli <name>', 'Force a specific CLI (e.g. claude, codex)')
    .option('--permission-mode <mode>', `Override claude --permission-mode (${VALID_PERMISSION_MODES.join('|')})`)
    .action(async (pathArg: string, opts: CheckDriftOptions) => {
      const targetDir = resolve(pathArg);
      const contextDir = join(targetDir, '.ai-context');

      if (!existsSync(contextDir)) {
        log.error(`.ai-context/ not found at ${contextDir}`);
        log.info(`Run: ${pc.bold('ai-context init')} first.`);
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

      const fixSeverity = resolveFixSeverity(opts.fix);
      if (opts.fix !== undefined && !fixSeverity) {
        log.error(`Invalid --fix value: ${String(opts.fix)}. Valid: ${VALID_FIX_LEVELS.join(', ')}`);
        process.exit(1);
      }

      log.heading('AI Context — check-drift');

      // === Phase 0: Static checks (always; skippable with --static-only to mean ONLY static) ===
      const findings = await runStaticChecks(targetDir);
      if (findings.length === 0) {
        log.done('Static checks: no drift detected.');
      } else {
        log.warn(`Static checks: ${findings.length} finding(s)`);
        for (const f of findings) {
          log.step(`[${f.kind}] ${f.message} (${pc.dim(f.source)})`);
        }
      }
      log.blank();

      if (opts.staticOnly) {
        return;
      }

      // === Phase 1: LLM analysis → written to .ai-context/logs/drift/<ts>-drift.md ===
      const analysisPrompt = await buildAnalysisPrompt(targetDir, findings);

      if (opts.print) {
        process.stdout.write(analysisPrompt);
        if (!analysisPrompt.endsWith('\n')) process.stdout.write('\n');
        return;
      }

      if (opts.dryRun) {
        log.info('(dry run) Would generate a drift report and write it to .ai-context/logs/drift/.');
        if (fixSeverity) log.info(`(dry run) Would then apply patches at severity: ${fixSeverity}+.`);
        log.rule();
        console.log(analysisPrompt.slice(0, 2000) + (analysisPrompt.length > 2000 ? '\n... (truncated) ...\n' : ''));
        log.rule();
        return;
      }

      const mode = opts.copy ? 'copy' : 'auto';
      log.info(`Generating drift report${mode === 'copy' ? ' (clipboard)' : ` via ${pc.bold(opts.cli ?? 'claude')}`}...`);

      const analysisResult = await executeOrCopy({
        prompt: analysisPrompt,
        mode,
        preferredCLI: opts.cli,
        permissionMode: opts.permissionMode,
        commandName: 'check-drift',
        pasteHint: 'the agent will analyze the repo and output a drift report to stdout; copy it into a new drift report file.',
      });

      // Write the drift report (frontmatter + static findings + agent output) regardless of outcome.
      const reportContent = buildReportFile(findings, analysisResult.stdout ?? '', targetDir);
      const reportPath = await writeCommandLog({
        targetDir,
        category: 'drift',
        suffix: 'drift',
        content: reportContent,
      });
      log.info(`Drift report: ${pc.dim(reportPath)}`);

      if (analysisResult.outcome === 'failed') {
        process.exit(1);
      }

      // Clipboard mode: rewrite the clipboard content to be a short follow-up that
      // references the report file (instead of the huge analysis prompt).
      if (mode === 'copy') {
        try {
          const { default: clipboard } = await import('clipboardy');
          const followup = buildClipboardFollowup(reportPath, fixSeverity);
          await clipboard.write(followup);
          log.done(`Clipboard updated: short prompt referencing ${pc.dim(reportPath)}.`);
        } catch {
          // ignore clipboard errors; the longer prompt is already there
        }
        return;
      }

      // === Phase 2: --fix flow — apply patches by reading the report ===
      if (fixSeverity) {
        log.blank();
        log.info(`Applying ${pc.bold(fixSeverity === 'all' ? 'ALL' : fixSeverity + '+')} patches from the drift report...`);
        const applyPrompt = buildApplyPrompt(reportPath, fixSeverity);
        const applyResult = await executeOrCopy({
          prompt: applyPrompt,
          mode: 'auto',
          preferredCLI: opts.cli,
          permissionMode: opts.permissionMode ?? 'acceptEdits',
          commandName: 'check-drift --fix',
          pasteHint: `the agent will read ${reportPath} and apply patches.`,
        });
        if (applyResult.outcome === 'failed') process.exit(1);
      }
    });
}

// ---------------------------------------------------------------------------
// Static checks
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_OVERVIEW_DAYS = 30;
const STALE_TASK_DAYS = 14;
const STALE_BACKLOG_DAYS = 90;

export async function runStaticChecks(targetDir: string): Promise<DriftFinding[]> {
  const findings: DriftFinding[] = [];
  const contextDir = join(targetDir, '.ai-context');

  // Broken refs in project.structure.md
  const structurePath = join(contextDir, 'project.structure.md');
  if (existsSync(structurePath)) {
    const refs = await extractBackticksPaths(structurePath);
    for (const ref of refs) {
      if (refResolvesSomewhere(targetDir, ref)) continue;
      findings.push({
        kind: 'broken-ref',
        message: `project.structure.md references missing path: ${ref}`,
        source: 'project.structure.md',
      });
    }
  }

  // Stale overview: last_updated older than 30 days AND git has recent commits
  const overviewPath = join(contextDir, 'project.overview.md');
  if (existsSync(overviewPath)) {
    const lastUpdated = await extractLastUpdated(overviewPath);
    if (lastUpdated !== null) {
      const ageDays = Math.floor((Date.now() - lastUpdated.getTime()) / DAY_MS);
      if (ageDays >= STALE_OVERVIEW_DAYS) {
        const recentCommits = await countCommitsSinceDays(targetDir, STALE_OVERVIEW_DAYS);
        if (recentCommits > 0) {
          findings.push({
            kind: 'stale-overview',
            message: `project.overview.md last_updated is ${ageDays}d old but ${recentCommits} commits in the last ${STALE_OVERVIEW_DAYS}d`,
            source: 'project.overview.md',
          });
        }
      }
    }
  }

  // Stale tasks marked "In Progress" with no commits in last 14 days
  const tasksPath = join(contextDir, 'project.tasks.md');
  if (existsSync(tasksPath)) {
    const raw = await readFile(tasksPath, 'utf8');
    const inProgressBlock = extractSection(raw, 'In Progress');
    if (inProgressBlock && inProgressBlock.trim().length > 0 && !/\(No .* tasks currently\)/i.test(inProgressBlock)) {
      const commits = await countCommitsSinceDays(targetDir, STALE_TASK_DAYS);
      if (commits === 0) {
        findings.push({
          kind: 'stale-task',
          message: `project.tasks.md has "In Progress" items but no commits in ${STALE_TASK_DAYS}d`,
          source: 'project.tasks.md',
        });
      }
    }
  }

  // Backlog items older than 90 days
  const backlogPath = join(contextDir, 'project.backlog.md');
  if (existsSync(backlogPath)) {
    const raw = await readFile(backlogPath, 'utf8');
    const oldEntries = extractBacklogEntriesOlderThan(raw, STALE_BACKLOG_DAYS);
    for (const e of oldEntries) {
      findings.push({
        kind: 'stale-backlog',
        message: `backlog item older than ${STALE_BACKLOG_DAYS}d: ${e}`,
        source: 'project.backlog.md',
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Path resolution for backticked refs
// ---------------------------------------------------------------------------

function refResolvesSomewhere(targetDir: string, ref: string): boolean {
  if (existsSync(join(targetDir, ref))) return true;
  const implicitRoots = [
    '.ai-context',
    '.ai-context/standards',
    '.ai-context/sessions',
    '.ai-context/plans',
    '.claude',
    '.claude/hooks',
    '.cursor',
    '.cursor/rules',
    '.agent',
    '.agent/rules',
    '.github',
  ];
  for (const root of implicitRoots) {
    if (existsSync(join(targetDir, root, ref))) return true;
  }
  return false;
}

async function extractBackticksPaths(filePath: string): Promise<string[]> {
  const raw = await readFile(filePath, 'utf8');
  const set = new Set<string>();
  const re = /`([^`\n]+?)`/g;
  for (const m of raw.matchAll(re)) {
    const p = m[1].trim();
    if (!p) continue;
    if (p.startsWith('http')) continue;
    if (p.includes(' ')) continue;
    if (p.startsWith('--') || p.startsWith('-')) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*\(\)$/.test(p)) continue;
    if (p.includes('/') || /\.(ts|tsx|js|jsx|py|go|rs|rb|java|md|json|yml|yaml|toml|sh|mdc)$/.test(p)) {
      set.add(p);
    }
  }
  return [...set];
}

async function extractLastUpdated(filePath: string): Promise<Date | null> {
  const raw = await readFile(filePath, 'utf8');
  const m = raw.match(/last_updated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  if (!m) return null;
  const d = new Date(m[1] + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

function extractSection(raw: string, heading: string): string | null {
  const lines = raw.split('\n');
  let inSection = false;
  const out: string[] = [];
  for (const line of lines) {
    if (/^##+\s/.test(line)) {
      if (inSection) break;
      if (new RegExp(`^##+\\s+${heading}\\s*$`, 'i').test(line)) {
        inSection = true;
        continue;
      }
    }
    if (inSection) out.push(line);
  }
  return out.length ? out.join('\n') : null;
}

function extractBacklogEntriesOlderThan(raw: string, cutoffDays: number): string[] {
  const cutoffMs = Date.now() - cutoffDays * DAY_MS;
  const out: string[] = [];
  const re = /^\s*[-*]\s+.*?(\d{4}-\d{2}-\d{2}).*$/gm;
  for (const m of raw.matchAll(re)) {
    const d = new Date(m[1] + 'T00:00:00Z');
    if (isNaN(d.getTime())) continue;
    if (d.getTime() < cutoffMs) {
      out.push(m[0].trim().slice(0, 80));
    }
  }
  return out;
}

async function countCommitsSinceDays(targetDir: string, days: number): Promise<number> {
  try {
    const out = await runGit(targetDir, ['log', `--since=${days}.days`, '--oneline']);
    return out.split('\n').filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}

function runGit(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout?.on('data', (c) => (stdout += c.toString()));
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code !== 0) rejectPromise(new Error(`git exited ${code}`));
      else resolvePromise(stdout);
    });
  });
}

function runTree(cwd: string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      'find',
      ['.', '-maxdepth', '3', '-not', '-path', './node_modules/*', '-not', '-path', './dist/*', '-not', '-path', './.git/*'],
      { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    child.stdout?.on('data', (c) => (stdout += c.toString()));
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code !== 0) rejectPromise(new Error(`find exited ${code}`));
      else resolvePromise(stdout);
    });
  });
}

// ---------------------------------------------------------------------------
// Prompt + report building
// ---------------------------------------------------------------------------

async function buildAnalysisPrompt(targetDir: string, findings: DriftFinding[]): Promise<string> {
  const contextDir = join(targetDir, '.ai-context');
  const files = ['project.overview.md', 'project.structure.md', 'project.decisions.md'];
  const sections: string[] = [];

  for (const f of files) {
    const p = join(contextDir, f);
    if (existsSync(p)) {
      const content = await readFile(p, 'utf8');
      sections.push(`### \`.ai-context/${f}\`\n\n\`\`\`markdown\n${content}\n\`\`\``);
    }
  }

  let gitLog = '';
  try {
    gitLog = await runGit(targetDir, ['log', '--stat', '-n', '50']);
  } catch {
    gitLog = '(git log unavailable)';
  }

  let tree = '';
  try {
    tree = await runTree(targetDir);
  } catch {
    tree = '(tree unavailable)';
  }

  const findingsText = findings.length
    ? findings.map((f) => `- [${f.kind}] ${f.message} (${f.source})`).join('\n')
    : '- (none — static checks passed)';

  return `# AI Context — drift analysis

You are auditing whether \`.ai-context/\` still accurately describes the current repository. Produce a drift report as your stdout response. DO NOT apply any patches — this run is analysis-only. A separate \`--fix\` command will apply approved patches by reading this report file.

## Static-check findings

${findingsText}

## Current \`.ai-context/\` content

${sections.join('\n\n')}

## Recent git activity (last 50 commits)

\`\`\`
${gitLog.slice(0, 8000)}
\`\`\`

## Repository tree (depth 3, no node_modules/dist/.git)

\`\`\`
${tree.slice(0, 4000)}
\`\`\`

## Task

1. Compare \`project.overview.md\` against the current mission/scope implied by recent commits and the tree. Flag drift.
2. Compare \`project.structure.md\` against the current tree. Flag removed, renamed, or added top-level areas.
3. Compare \`project.decisions.md\` against the kinds of decisions implied by recent commits (new infra, auth, data flow). Flag missing or stale entries.
4. Produce a **concise drift report** formatted like this:

\`\`\`markdown
# Drift findings

## [significant] <title>
**File**: \`<path>\`
**Issue**: <one sentence>
**Proposed patch**:
\`\`\`diff
- old
+ new
\`\`\`

## [moderate] <title>
...

## [minor] <title>
...
\`\`\`

5. Use exact severity tags in brackets: \`[significant]\`, \`[moderate]\`, or \`[minor]\`. These are machine-parsed by \`--fix\`.
6. If no drift is found, output only: "No drift detected." and stop.
`;
}

function buildReportFile(findings: DriftFinding[], agentAnalysis: string, targetDir: string): string {
  const staticFindingsMd = findings.length
    ? findings.map((f) => `- \`[${f.kind}]\` ${f.message} — _${f.source}_`).join('\n')
    : '_No static findings._';

  const analysisBody = agentAnalysis.trim().length > 0
    ? agentAnalysis
    : '_No agent analysis captured — LLM phase may have failed or been skipped._';

  return [
    '---',
    'command: ai-context check-drift',
    `generated_at: ${isoStamp()}`,
    `static_findings_count: ${findings.length}`,
    `target: ${targetDir}`,
    '---',
    '',
    '# Drift report',
    '',
    '## Static findings',
    '',
    staticFindingsMd,
    '',
    '## LLM analysis',
    '',
    analysisBody,
    '',
  ].join('\n');
}

function buildClipboardFollowup(reportPath: string, fixSeverity: string | null): string {
  const sev = fixSeverity ?? 'significant';
  const severityLabel = sev === 'all'
    ? 'all severity levels'
    : `\`[${sev}]\` (and higher) patches`;
  return `Read ${reportPath} and apply ${severityLabel} per the "Proposed patch" diffs in each finding. Report which files you edited. If a patch's "before" context no longer matches the current file, skip that patch and note it in your response.\n`;
}

function buildApplyPrompt(reportPath: string, severity: string): string {
  const severityClause = severity === 'all'
    ? 'all severity levels ([significant], [moderate], [minor])'
    : severity === 'significant'
      ? 'only [significant] findings'
      : severity === 'moderate'
        ? '[significant] and [moderate] findings'
        : 'all findings';

  return `# AI Context — apply drift patches

Read the drift report at \`${reportPath}\`. For each finding at or above ${severityClause}, apply the "Proposed patch" diff directly to the referenced file.

Rules:
1. Skip any patch whose "before" context no longer matches the current file exactly — don't force it.
2. After applying patches, update \`.ai-context/project.overview.md\` \`last_updated\` frontmatter to today's date.
3. Report which files you edited and which patches were skipped with reasons.
4. Do NOT edit anything outside of \`.ai-context/\` — all drift patches target files inside that directory.
`;
}

// ---------------------------------------------------------------------------
// Option parsing
// ---------------------------------------------------------------------------

/**
 * Resolve commander's --fix [severity] into a concrete severity level or null.
 * - Bare `--fix` → 'significant' (default)
 * - `--fix=all` / `--fix=moderate` etc. → that value
 * - undefined (flag not passed) → null
 */
function resolveFixSeverity(raw: string | boolean | undefined): string | null {
  if (raw === undefined) return null;
  if (raw === true || raw === '') return 'significant';
  if (typeof raw === 'string' && VALID_FIX_LEVELS.includes(raw)) return raw;
  return null;
}
