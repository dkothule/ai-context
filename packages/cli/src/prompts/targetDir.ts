import { confirm, input } from '@inquirer/prompts';
import { resolve } from 'path';
import { existsSync, statSync } from 'fs';

/**
 * Confirms with the user that they want to install into the given directory.
 * Returns the confirmed absolute path.
 */
export async function confirmTargetDir(dir: string): Promise<string> {
  const abs = resolve(dir);
  const confirmed = await confirm({
    message: `Install AI Context into ${abs}?`,
    default: true,
  });

  if (!confirmed) {
    process.exit(0);
  }

  return abs;
}

/**
 * Asks the user to provide a target directory path.
 * Returns the resolved absolute path.
 */
export async function askTargetDir(): Promise<string> {
  const answer = await input({
    message: 'Target directory path:',
    default: process.cwd(),
    validate: (val) => {
      const abs = resolve(val);
      if (!existsSync(abs)) return `Directory not found: ${abs}`;
      if (!statSync(abs).isDirectory()) return `Not a directory: ${abs}`;
      return true;
    },
  });

  return resolve(answer);
}
