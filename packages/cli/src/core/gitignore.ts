import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SECTION_MARKER = '# ai-context';
const ENTRIES = ['.ai-context/sessions/', '.ai-context-backups/'];

/**
 * Appends AI Context entries to .gitignore in the target directory.
 * Idempotent: skips if the section marker already exists.
 *
 * @param targetDir  The project root.
 * @param dryRun     If true, do not write anything.
 * @returns true if entries were added, false if already present or dry-run.
 */
export async function appendGitignoreEntries(
  targetDir: string,
  dryRun = false,
): Promise<boolean> {
  const gitignorePath = join(targetDir, '.gitignore');

  let existing = '';
  if (existsSync(gitignorePath)) {
    existing = await readFile(gitignorePath, 'utf8');
  }

  // Already has our marker — idempotent
  if (existing.includes(SECTION_MARKER)) {
    return false;
  }

  const block =
    (existing.length > 0 && !existing.endsWith('\n') ? '\n' : '') +
    '\n' +
    SECTION_MARKER +
    '\n' +
    ENTRIES.join('\n') +
    '\n';

  if (!dryRun) {
    await writeFile(gitignorePath, existing + block, 'utf8');
  }

  return true;
}
