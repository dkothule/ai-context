#!/usr/bin/env node
// Copies the repo-root README.md into packages/cli/ so `npm pack` can include it
// in the published tarball. Runs via the `prepack` npm lifecycle hook.
// Cross-platform (Node fs), unlike a shell `cp` command.
import { copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', '..', '..', 'README.md');
const dst = join(__dirname, '..', 'README.md');

copyFileSync(src, dst);
console.log(`Copied ${src} -> ${dst}`);
