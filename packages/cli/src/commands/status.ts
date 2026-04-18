import { Command } from 'commander';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { readManifest } from '../core/manifest.js';
import { log } from '../ui/logger.js';
import pc from 'picocolors';

/** Agent files to check for presence. */
const AGENT_FILES: Array<{ label: string; path: string }> = [
  { label: 'CLAUDE.md', path: 'CLAUDE.md' },
  { label: 'AGENTS.md', path: 'AGENTS.md' },
  { label: '.cursor/rules/main.mdc', path: '.cursor/rules/main.mdc' },
  { label: '.agent/rules/rules.md', path: '.agent/rules/rules.md' },
];

export function statusCommand(): Command {
  return new Command('status')
    .description('Show AI Context installation status')
    .argument('[path]', 'Target project directory', process.cwd())
    .action(async (pathArg: string) => {
      const targetDir = resolve(pathArg);
      const contextDir = join(targetDir, '.ai-context');

      if (!existsSync(contextDir)) {
        log.error('AI Context is not installed in this directory.');
        log.info(`  Run: ${pc.bold('ai-context init')} to install.`);
        process.exit(1);
      }

      const manifest = await readManifest(contextDir);

      log.heading('AI Context Status');
      log.rule();

      if (manifest) {
        log.info(`Installed version:  ${pc.bold(manifest.version)}`);
        log.info(`Schema version:     ${manifest.schema_version}`);
        log.info(`Applied at:         ${manifest.installed_at ?? pc.dim('(source tree)')}`);
        log.info(`Apply mode:         ${manifest.apply_mode}`);
        if (manifest.previous_version) {
          log.info(`Previous version:   ${manifest.previous_version}`);
        }
        if (manifest.agents_installed) {
          log.info(`Agents installed:   ${manifest.agents_installed.join(', ')}`);
        }
      } else {
        log.warn('No manifest found — AI Context may have been partially installed.');
      }

      log.blank();
      log.info('Agent adapter files:');
      for (const agent of AGENT_FILES) {
        const present = existsSync(join(targetDir, agent.path));
        if (present) {
          log.info(`  ${pc.green('✓')} ${agent.label}`);
        } else {
          log.info(`  ${pc.dim('⊘')} ${agent.label}  ${pc.dim('(not installed)')}`);
        }
      }

      log.rule();
    });
}
