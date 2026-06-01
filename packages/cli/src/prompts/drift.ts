// ---------------------------------------------------------------------------
// LLM prompts for `ai-context check-drift`.
//
// These are PURE string builders — they take already-gathered data and return
// prompt text. Data gathering (reading .ai-context files, git log, repo tree)
// stays in the command (checkDrift.ts); this module owns only the wording.
// See prompts/README.md for the static-vs-dynamic prompt convention.
// ---------------------------------------------------------------------------

export interface DriftAnalysisInput {
  /** Markdown bullet list of static-check findings (already formatted). */
  findingsText: string;
  /** Rendered `.ai-context/*` file sections (already fenced). */
  sections: string[];
  /** Raw `git log --stat` output (truncated here for prompt size). */
  gitLog: string;
  /** Raw repository tree output (truncated here for prompt size). */
  tree: string;
}

/** Analysis-only prompt: audit `.ai-context/` vs. the repo and emit a drift report. */
export function driftAnalysisPrompt(input: DriftAnalysisInput): string {
  const { findingsText, sections, gitLog, tree } = input;
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

/** Phase-2 prompt: read the report file and apply patches at/above a severity. */
export function driftApplyPrompt(reportPath: string, severity: string): string {
  const severityClause =
    severity === 'all'
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

/** Short clipboard follow-up that points the agent at an already-written report. */
export function driftClipboardFollowup(reportPath: string, fixSeverity: string | null): string {
  const sev = fixSeverity ?? 'significant';
  const severityLabel = sev === 'all' ? 'all severity levels' : `\`[${sev}]\` (and higher) patches`;
  return `Read ${reportPath} and apply ${severityLabel} per the "Proposed patch" diffs in each finding. Report which files you edited. If a patch's "before" context no longer matches the current file, skip that patch and note it in your response.\n`;
}
