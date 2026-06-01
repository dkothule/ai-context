# `src/prompts/` — single home for all LLM prompts

Every prompt sent to a coding-agent CLI lives here, so prompt copy is maintained in one
place rather than scattered across command files. There are two conventions, chosen by
whether the prompt needs runtime data:

## 1. Static prompts → `.md` files
Prompts that contain no runtime interpolation (the agent reads the repo / `.ai-context/`
itself). Stored as plain Markdown and read at runtime.

- `setup/fresh-install.md`, `setup/upgrade.md` — used by `ai-context setup` / `init`
  (loaded via `core/setupFlow.ts` → `promptFileForMode()`).

These `.md` files ship in the npm package (see the `files` field in `package.json`).

## 2. Dynamic prompts → pure builder functions (`.ts`)
Prompts that interpolate runtime data (findings, git log, repo tree, file lists, paths).
Exposed as **pure functions** that take already-gathered data and return a string — they do
no I/O. The command gathers the data and calls the builder.

- `drift.ts` — `driftAnalysisPrompt`, `driftApplyPrompt`, `driftClipboardFollowup`
  (used by `commands/checkDrift.ts`).
- `compact.ts` — `compactRollupPrompt` (used by `commands/compact.ts`).

Import builders from the barrel: `import { driftAnalysisPrompt } from '../prompts/index.js'`.

## What does NOT belong here
Interactive **CLI** prompts (inquirer `select`/`confirm`/`input`) are UI, not LLM prompts —
they live in `src/ui/` (`agentSelector.ts`, `targetDir.ts`).
