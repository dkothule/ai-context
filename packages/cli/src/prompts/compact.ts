// ---------------------------------------------------------------------------
// LLM prompt for `ai-context compact`.
//
// PURE string builder — the command (compact.ts) selects the sessions, computes
// paths/ranges, and renders the list strings; this module owns only the wording.
// See prompts/README.md for the static-vs-dynamic prompt convention.
// ---------------------------------------------------------------------------

export interface CompactRollupInput {
  olderThanDays: number;
  keepCount: number;
  sourceCount: number;
  /** Target rollup path, e.g. `.ai-context/sessions/_archive/2026-05-rollup.md`. */
  rollupRel: string;
  /** Bullet list of source files with dates (already formatted). */
  fileList: string;
  rangeStart: string;
  rangeEnd: string;
  /** Bullet list for the rollup's "Archived sessions" section (basename + placeholder). */
  archivedList: string;
  /** Comma-separated backticked source paths for the delete step. */
  deleteList: string;
  /** Absolute sessions directory path. */
  sessionsDir: string;
}

/** Prompt: read the listed sessions, write one rollup, then delete the sources. */
export function compactRollupPrompt(input: CompactRollupInput): string {
  const {
    olderThanDays,
    keepCount,
    sourceCount,
    rollupRel,
    fileList,
    rangeStart,
    rangeEnd,
    archivedList,
    deleteList,
    sessionsDir,
  } = input;

  return `# AI Context — session compaction

You are compressing \`.ai-context/sessions/\` to prevent context bloat. Read the listed session files, extract what still matters, write a single rollup, then delete the source files.

## Parameters
- Older-than threshold: ${olderThanDays} days
- Keep count (newest preserved): ${keepCount}
- Source count: ${sourceCount}
- Rollup target: \`${rollupRel}\`

## Source files to archive (${sourceCount}):

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
source_count: ${sourceCount}
---

# Archived sessions ${rangeStart} → ${rangeEnd}

## Decisions carried forward
- <short decision> — rationale; source: <filename>

## Open threads at end of range
- <thread> — last status; source: <filename>

## File/area knowledge
- <path/to/file or area>: <what you need to know>

## Archived sessions
${archivedList}
\`\`\`

4. **After the rollup is written and you've verified it captures each source file's essence, DELETE the source files** (${deleteList}).
5. If any source file has uniquely important details that don't fit the schema above, preserve them verbatim in the rollup under a \`## Verbatim preserved from <filename>\` section rather than losing them.
6. Briefly report which source files were archived and confirm the rollup path.

Sessions directory: \`${sessionsDir}\`
`;
}
