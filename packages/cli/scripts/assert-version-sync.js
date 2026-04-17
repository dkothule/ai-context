#!/usr/bin/env node
// Asserts that package.json version matches the bundled manifest.json version.
// Run as part of prepublishOnly.
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(
  readFileSync(join(root, 'src', 'templates', 'ai-context', 'manifest.json'), 'utf8')
);

if (pkg.version !== manifest.version) {
  console.error(
    `Version mismatch: package.json has ${pkg.version} but src/templates/ai-context/manifest.json has ${manifest.version}`
  );
  console.error('Run scripts/sync-templates.sh and update package.json to match.');
  process.exit(1);
}

console.log(`Version sync OK: ${pkg.version}`);
