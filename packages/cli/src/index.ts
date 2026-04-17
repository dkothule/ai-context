#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initCommand } from './commands/init.js';
import { applyCommand } from './commands/apply.js';
import { setupCommand } from './commands/setup.js';
import { uninstallCommand } from './commands/uninstall.js';
import { statusCommand } from './commands/status.js';
import { versionCommand } from './commands/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string; description: string };

const program = new Command();

program
  .name('ai-context')
  .description(pkg.description)
  .version(pkg.version, '-V, --version', 'Print version');

program.addCommand(initCommand(), { isDefault: true });
program.addCommand(applyCommand());
program.addCommand(setupCommand());
program.addCommand(uninstallCommand());
program.addCommand(statusCommand());
program.addCommand(versionCommand());

program.parse();
