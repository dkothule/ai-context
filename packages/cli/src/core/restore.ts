import { cp, mkdir, readdir } from 'fs/promises';
import { join, relative } from 'path';
import { existsSync } from 'fs';
import { isAiContextOwned } from './ownership.js';

/**
 * After the installer copies fresh .ai-context/ template files into the target,
 * this function restores project-owned files from the backup so they are not lost.
 *
 * It walks the backed-up .ai-context/ tree, skips any file that isAiContextOwned(),
 * and copies the remaining (project-owned) files back to the target — but only if they
 * are not already present (i.e., the installer did not restore them automatically).
 *
 * @param backupContextDir  Path to the .ai-context/ snapshot inside the backup dir.
 * @param targetContextDir  Path to the .ai-context/ directory in the target project.
 * @returns Number of files restored.
 */
export async function restoreProjectOwnedFiles(
  backupContextDir: string,
  targetContextDir: string,
): Promise<number> {
  if (!existsSync(backupContextDir)) return 0;

  let count = 0;
  const entries = await readdir(backupContextDir, { recursive: true, withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) continue;

    // Build the relative path within .ai-context/
    const absPath = join(entry.parentPath ?? (entry as { path?: string }).path ?? backupContextDir, entry.name);
    const relPath = relative(backupContextDir, absPath).replace(/\\/g, '/');

    // Skip AI Context-owned files — they should stay as freshly installed
    if (isAiContextOwned(relPath)) continue;

    const targetFile = join(targetContextDir, relPath);

    // Always restore project-owned files — they may have been overwritten by
    // the fresh template copy. This is intentional: template files for
    // project-owned paths (e.g. project.overview.md) are replaced with the
    // project's actual content from backup.
    await mkdir(join(targetFile, '..'), { recursive: true });
    await cp(absPath, targetFile);
    count++;
  }

  return count;
}
