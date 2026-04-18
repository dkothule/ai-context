import { readFile, rename } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Detects and renames legacy monolithic standards files in a target project.
 *
 * Pre-v0.5.0 installs had a single `project.rules.md` that contained both
 * the base rules and project overrides. From v0.5.0 onwards these are split
 * into `project.rules.base.md` (AI Context-owned) and `project.rules.md`
 * (project-owned, lightweight overrides only).
 *
 * If an existing `project.rules.md` contains the legacy "Project Rules (Authoritative)"
 * heading, it is renamed to `project.rules.legacy.md` so the new split can take effect.
 *
 * Same pattern for `project.workflow.md`.
 *
 * @returns Array of files that were renamed.
 */
export async function renameLegacyStandards(standardsDir: string): Promise<string[]> {
  const renamed: string[] = [];

  const candidates: Array<{ from: string; to: string; legacyPattern: RegExp }> = [
    {
      from: join(standardsDir, 'project.rules.md'),
      to: join(standardsDir, 'project.rules.legacy.md'),
      legacyPattern: /Project Rules \(Authoritative\)/,
    },
    {
      from: join(standardsDir, 'project.workflow.md'),
      to: join(standardsDir, 'project.workflow.legacy.md'),
      legacyPattern: /Project Workflow \(Authoritative\)/,
    },
  ];

  for (const { from, to, legacyPattern } of candidates) {
    if (!existsSync(from)) continue;
    // Don't overwrite an already-renamed legacy file
    if (existsSync(to)) continue;

    try {
      const content = await readFile(from, 'utf8');
      if (legacyPattern.test(content)) {
        await rename(from, to);
        renamed.push(from);
      }
    } catch {
      // Skip if we can't read the file
    }
  }

  return renamed;
}
