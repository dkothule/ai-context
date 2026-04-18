import { Command } from 'commander';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import { getRegisteredCLIs } from '../core/agentCLI.js';
import { executeOrCopy } from '../core/clipboardFallback.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

const VALID_PERMISSION_MODES = ['default', 'acceptEdits', 'plan', 'auto', 'dontAsk', 'bypassPermissions'];

interface CheckDriftOptions {
  staticOnly?: boolean;
  llmOnly?: boolean;
  dryRun?: boolean;
  print?: boolean;
  copy?: boolean;
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
    .description('Detect drift between .ai-context/ and the actual codebase')
    .argument('[path]', 'Target project directory', process.cwd())
    .option('--static-only', 'Run only local checks; skip the LLM prompt')
    .option('--llm-only', 'Skip local checks; only build the LLM prompt')
    .option('-n, --dry-run', 'Print what would happen; no execution or clipboard')
    .option('--print', 'Print the LLM prompt to stdout (bypass execution/clipboard)')
    .option('--copy', 'Copy the prompt to the clipboard (skip CLI execution)')
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

      // Static checks
      let findings: DriftFinding[] = [];
      if (!opts.llmOnly) {
        log.heading('AI Context — check-drift');
        findings = await runStaticChecks(targetDir);
        if (findings.length === 0) {
          log.done('Static checks: no drift detected.');
        } else {
          log.warn(`Static checks: ${findings.length} finding(s)`);
          for (const f of findings) {
            log.step(`[${f.kind}] ${f.message} (${pc.dim(f.source)})`);
          }
        }
        log.blank();
      }

      // LLM prompt
      if (opts.staticOnly) {
        return;
      }

      const prompt = await buildDriftPrompt(targetDir, findings);

      if (opts.dryRun) {
        log.info(`(dry run) Would invoke the agent with a drift report prompt.`);
        log.rule();
        console.log(prompt);
        log.rule();
        return;
      }

      const mode = opts.print ? 'print' : opts.copy ? 'copy' : 'auto';
      const result = await executeOrCopy({
        prompt,
        mode,
        preferredCLI: opts.cli,
        permissionMode: opts.permissionMode,
        commandName: 'check-drift',
        pasteHint: 'the agent will analyze the repo, report drift, and propose edits.',
      });

      if (result.outcome === 'failed') {
        process.exit(1);
      }
    });
}

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
      const abs = join(targetDir, ref);
      if (!existsSync(abs)) {
        findings.push({
          kind: 'broken-ref',
          message: `project.structure.md references missing path: ${ref}`,
          source: 'project.structure.md',
        });
      }
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

  // Backlog items older than 90 days — heuristic: look for date patterns before bullet items
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

async function extractBackticksPaths(filePath: string): Promise<string[]> {
  const raw = await readFile(filePath, 'utf8');
  const set = new Set<string>();
  // Grab `inline/paths/like/this.ts` inside backticks — common in structure docs.
  const re = /`([^`\n]+?)`/g;
  for (const m of raw.matchAll(re)) {
    const p = m[1].trim();
    // Filter to things that look like repo paths (contain / or common source extensions)
    if (!p) continue;
    if (p.startsWith('http')) continue;
    if (p.includes(' ')) continue;
    if (p.startsWith('--') || p.startsWith('-')) continue; // CLI flags
    if (/^[A-Za-z_][A-Za-z0-9_]*\(\)$/.test(p)) continue; // function() syntax
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

async function buildDriftPrompt(targetDir: string, findings: DriftFinding[]): Promise<string> {
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

  // Git log + tree summary
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

  return `# AI Context — drift check

You are auditing whether \`.ai-context/\` still accurately describes the current repository. Identify drift and propose edits — DO NOT apply them without the user approving.

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
4. Produce a **concise drift report** with severity tags (\`[minor]\`, \`[moderate]\`, \`[significant]\`).
5. For each significant drift item, propose a minimal patch (before/after excerpt) — but do NOT apply it yet. Wait for the user to approve or run \`ai-context setup\` if the drift is broad.
6. If no drift is found, say so and stop.
`;
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
