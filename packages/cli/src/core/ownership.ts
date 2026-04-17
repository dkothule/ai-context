/**
 * Defines which paths inside .ai-context/ are owned by AI Context (installer-managed)
 * versus project-owned (preserved on upgrade).
 *
 * AI Context-owned files are overwritten on every install/upgrade.
 * Project-owned files are backed up and restored after the installer copies templates.
 */

/** Relative paths within .ai-context/ that are owned by AI Context. */
const AI_CONTEXT_OWNED = new Set([
  'README.md',
  'manifest.json',
  'template.manifest.json', // legacy name, also owned
  'project.overview.md.template',
  'sessions/_template.md',
  'plans/_template.md',
  'standards/project.rules.base.md',
  'standards/project.workflow.base.md',
]);

/**
 * Returns true if the given relative path (within .ai-context/) is owned by AI Context
 * and should NOT be preserved from the project's previous state.
 */
export function isAiContextOwned(relPath: string): boolean {
  // Normalize separators for cross-platform comparison
  const normalized = relPath.replace(/\\/g, '/');
  return AI_CONTEXT_OWNED.has(normalized);
}

/** All paths owned by AI Context (for reference/testing). */
export const AI_CONTEXT_OWNED_PATHS = Array.from(AI_CONTEXT_OWNED);
