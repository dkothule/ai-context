import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function versionCommand(): Command {
  return new Command('version')
    .description('Print the AI Context CLI version')
    .action(() => {
      const pkg = JSON.parse(
        readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
      ) as { version: string };

      const manifest = JSON.parse(
        readFileSync(
          join(__dirname, '..', '..', 'src', 'templates', 'ai-context', 'manifest.json'),
          'utf8',
        ),
      ) as { version: string; schema_version: number };

      console.log(`ai-context ${pkg.version}  (template v${manifest.version}, schema v${manifest.schema_version})`);
    });
}
