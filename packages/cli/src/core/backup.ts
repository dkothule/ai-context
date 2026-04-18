import { cp, mkdir } from 'fs/promises';
import { basename, join } from 'path';
import { existsSync } from 'fs';

/**
 * Filter for fs.cp that skips any `.git` entry (directory or file).
 * `.ai-context/` can be its own git repo in some projects; we must never
 * copy its `.git/` into the backup tree or the sub-repo's history could be
 * corrupted on restore.
 */
export function skipDotGit(src: string): boolean {
  return basename(src) !== '.git';
}

/**
 * Generates a timestamp-based backup directory name.
 * Format: YYYYMMDD-HHmmss-<pid>  (NTFS-safe: no colons)
 */
export function makeBackupDirName(): string {
  const now = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join('') + '-' + [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('') + '-' + process.pid;
  return timestamp;
}

/**
 * Creates the backup root directory and returns its path.
 * e.g. <targetDir>/.ai-context-backups/20260317-142200-12345/
 */
export async function createBackupDir(targetDir: string): Promise<string> {
  const backupRoot = join(targetDir, '.ai-context-backups', makeBackupDirName());
  await mkdir(backupRoot, { recursive: true });
  return backupRoot;
}

/**
 * Copies a path (file or directory) from targetDir into backupDir, preserving relative structure.
 * Silently skips if the source path does not exist.
 *
 * @param targetDir  The project root being backed up.
 * @param relPath    Relative path within targetDir (e.g. '.ai-context').
 * @param backupDir  The backup destination root.
 * @returns true if the path existed and was backed up, false if it was missing.
 */
export async function backupPath(
  targetDir: string,
  relPath: string,
  backupDir: string,
): Promise<boolean> {
  const src = join(targetDir, relPath);
  const dst = join(backupDir, relPath);

  if (!existsSync(src)) return false;

  await mkdir(join(dst, '..'), { recursive: true });
  // preserveTimestamps keeps file mtimes intact through backup. Important for
  // `ai-context compact` which filters session logs by age: without this, every
  // upgrade would reset all session mtimes to "now" and compact would never
  // find anything older than `--older-than <days>`.
  await cp(src, dst, { recursive: true, filter: skipDotGit, preserveTimestamps: true });
  return true;
}
