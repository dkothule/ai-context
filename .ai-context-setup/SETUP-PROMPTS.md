# AI Context — Setup Prompts

Use these prompts with your coding agent **after** running `ai-context.sh`.

This file ships with AI Context and is installed into your project at `.ai-context-setup/SETUP-PROMPTS.md`
so it is available in the target project immediately after install or upgrade.

The installer already:
- copied the AI Context files,
- restored project-owned `.ai-context` files where appropriate,
- installed `.claude/hooks/` and merged the Stop hook into `.claude/settings.json`,
- and wrote `.ai-context/manifest.json`.

Your agent should verify and minimally repair `.ai-context/**`. It should not try to re-run installer logic by rewriting unrelated files.

## Shared Execution Rules

```text
STRICT SCOPE:
- Modify ONLY files under .ai-context/**.
- Do NOT modify any non-.ai-context files, including README.md, source files, tests, AGENTS.md, CLAUDE.md, .cursor/**, .agent/**, or .github/**.

OWNERSHIP:
- Treat these as AI Context-owned / installer-managed and keep the CURRENT versions:
  - .ai-context/README.md
  - .ai-context/manifest.json
  - .ai-context/project.overview.md.template
  - .ai-context/standards/project.rules.base.md
  - .ai-context/standards/project.workflow.base.md
  - .ai-context/sessions/_template.md
- Treat these as project-owned and preserve/merge carefully:
  - .ai-context/project.overview.md
  - .ai-context/project.structure.md
  - .ai-context/project.tasks.md
  - .ai-context/project.decisions.md
  - .ai-context/project.changelog.md
  - .ai-context/project.backlog.md
  - .ai-context/sessions/*.md except _template.md
  - .ai-context/standards/project.rules.md
  - .ai-context/standards/project.workflow.md
  - other language/team-specific standards under .ai-context/standards/
  - any other custom file or directory under .ai-context/** not listed as AI Context-owned above
- Never restore AI Context-owned files from backup over the current installed version.

EDITING STYLE:
- Compare first, then edit.
- Prefer minimal diffs. If a file already satisfies the requirement, leave it unchanged.
- Do NOT rewrite whole files unless the current file is clearly wrong or missing.
- Do NOT invent project facts.

PLACEHOLDER SAFETY:
- Do NOT replace "TBD", "[To be filled]", or other placeholders unless explicitly asked by the user in this session.
- Exception: during First-Time Apply, replace placeholders and obvious template defaults when the repository provides enough evidence to do so safely.

FAIL-SAFE:
- If an upgrade prompt depends on backup or version metadata and it is missing, say that explicitly and stop instead of guessing.
- If something outside .ai-context seems necessary, stop and ask before doing it.

OUTPUT:
- Start by stating the detected installed AI Context version from .ai-context/manifest.json.
- For upgrades, also report the previous version if it can be read from backup; otherwise report "legacy-unversioned".
- At the end, list exactly which .ai-context files were changed.
- If there were conflicts or assumptions, list them briefly. Otherwise say "No conflicts".
```

---

## 1) First-Time Apply

Use only when `.ai-context/manifest.json` reports `apply_mode` = `fresh-install`.
If `apply_mode` is `legacy-upgrade`, `upgrade`, or `reapply`, stop and use the Upgrade Or Reapply runbook instead.

```text
AI Context was just installed in this repository.

AI Context is the shared working memory and governance layer for this repository. The goal of this first-time apply is to replace generic template text with project-specific context derived from the actual codebase, documentation, and configuration.

Apply the Shared Execution Rules above.

Important:
- Analyze the repository before editing `.ai-context/**`.
- Prefer evidence from root documentation, package/build manifests, CI config, deployment config, source tree, tests, scripts, and inline docs/comments.
- Populate `.ai-context` with facts supported by the repository. If something is uncertain, use cautious wording or leave a placeholder instead of guessing.
- Do NOT edit non-`.ai-context` files during this bootstrap.

Please do only this:
1. Read .ai-context/manifest.json and report:
   - version
   - schema_version
   - apply_mode
   If apply_mode is not `fresh-install`, stop and switch to the Upgrade Or Reapply runbook.
2. Inspect the repository outside `.ai-context/` to understand:
   - what the project does
   - primary language(s), framework(s), runtime(s), and tooling
   - key apps/services/packages and important entry points
   - test/lint/build workflows
   - notable integrations, infra, or operational constraints that are clearly documented in the repo
3. Ensure required files/directories exist:
   - .ai-context/README.md
   - .ai-context/manifest.json
   - .ai-context/project.overview.md OR .ai-context/project.overview.md.template
   - .ai-context/project.structure.md
   - .ai-context/project.tasks.md
   - .ai-context/project.decisions.md
   - .ai-context/project.changelog.md
   - .ai-context/project.backlog.md
   - .ai-context/standards/project.rules.base.md
   - .ai-context/standards/project.rules.md
   - .ai-context/standards/project.workflow.base.md
   - .ai-context/standards/project.workflow.md
   - .ai-context/sessions/_template.md
4. If .ai-context/project.overview.md is missing, create it from .ai-context/project.overview.md.template before editing it.
5. Populate or update .ai-context/project.overview.md using repository evidence:
   - project name
   - short mission / purpose
   - current scope or major components
   - primary tech stack and tooling
   - notable constraints or integrations when clearly supported by the repo
   Do NOT leave obvious default template text in place if the repository already provides enough information to replace it accurately.
6. Populate or update .ai-context/project.structure.md so it reflects the actual repository layout, major directories, important config/manifests, and key entry points.
7. Review project-owned context files and replace generic AI Context template/default content with repository-relevant baseline context where evidence exists:
   - .ai-context/project.tasks.md
   - .ai-context/project.backlog.md
   - .ai-context/project.decisions.md
   - .ai-context/project.changelog.md
   Rules:
   - Replace content copied from the AI Context source repository if it describes AI Context itself rather than the target repository.
   - Do NOT invent historical decisions, roadmaps, or active work.
   - If active tasks cannot be inferred reliably, say so plainly instead of fabricating them.
   - Add a short note in project.tasks.md or project.changelog.md that AI Context was initialized/bootstrapped for this repository.
8. Ensure local override files exist but stay lightweight:
   - .ai-context/standards/project.rules.md
   - .ai-context/standards/project.workflow.md
9. Leave unknown placeholders/TBD text only where the repository does not provide enough evidence to fill them safely.

Done when:
- project.overview.md and project.structure.md reflect the actual repository,
- obvious template/default AI Context content has been replaced where repository evidence exists,
- required files exist,
- no non-.ai-context files were edited,
- and your summary lists changed .ai-context files only, plus any assumptions or unresolved unknowns.
```

---

## 2) Upgrade Or Reapply

Use when the repository already had `.ai-context` and the installer created `.ai-context-backups/<timestamp-with-suffix>/` directories.

```text
AI Context was reapplied to this repository. Previous state is backed up under .ai-context-backups/, in directories whose names start with a timestamp like YYYYMMDD-HHMMSS followed by a suffix (for example: 20250101-120000-12345).

Apply the Shared Execution Rules above.

Important:
- The installer already restored likely project-owned files.
- Your job is compare-and-repair, not blind copy-back from backup.

Please do only this:
1. Read the CURRENT .ai-context/manifest.json and report:
   - version
   - schema_version
   - apply_mode
2. Identify the latest backup directory under .ai-context-backups/ by selecting the directory whose name has the greatest leading timestamp in YYYYMMDD-HHMMSS format, ignoring any suffix.
3. Read previous version data from backup in this order:
   - backup/.ai-context/manifest.json
   - backup/.ai-context/template.manifest.json
   If neither exists, report previous version as "legacy-unversioned".
4. Compare backup/.ai-context with current .ai-context.
5. Keep CURRENT AI Context-owned files:
   - .ai-context/README.md
   - .ai-context/manifest.json
   - .ai-context/project.overview.md.template
   - .ai-context/standards/project.rules.base.md
   - .ai-context/standards/project.workflow.base.md
   - .ai-context/sessions/_template.md
6. Restore or merge ONLY project-owned paths under .ai-context/** if current content is missing, regressed, or accidentally replaced. This includes custom files/directories whose names are not known in advance. At minimum review:
   - project.overview.md
   - project.structure.md
   - project.tasks.md
   - project.decisions.md
   - project.changelog.md
   - project.backlog.md
   - historical sessions in .ai-context/sessions/*.md (except _template.md)
   - standards customizations in .ai-context/standards/*.md except *.base.md
   - any other custom .ai-context/** file or directory not listed as AI Context-owned
7. If legacy monolithic standards are found in backup, preserve them as:
   - .ai-context/standards/project.rules.legacy.md
   - .ai-context/standards/project.workflow.legacy.md
   Keep active local files focused on project-specific deltas.
8. Add a short upgrade note to .ai-context/project.tasks.md or .ai-context/project.changelog.md.
9. Do NOT replace placeholders/TBD text unless explicitly requested.

Done when:
- current AI Context-owned files remain current,
- project-owned context/history/customizations are preserved,
- and your summary includes installed version, previous version, changed files, and any conflicts/assumptions.
```

---

## Backup Notes

- Backups are in `.ai-context-backups/<YYYYMMDD-HHMMSS-suffix>/` (timestamp plus a unique suffix).
- Installer backs up managed paths before apply:
  - `.ai-context/`, `.cursor/`, `.agent/`, `.github/`, `.ai-context-setup/`
  - root instruction files (`AGENTS.md`, `CLAUDE.md`, legacy `CODEX.md`)
  - `.claude/settings.json` (backed up before hook merge)
- Installer restores project-owned `.ai-context/**` paths from backup after apply and keeps AI Context-owned files current.
- Installer writes the current install state to `.ai-context/manifest.json` and removes legacy `.ai-context/template.manifest.json`.
- Installer installs `.claude/hooks/session-log-check.sh` and merges the Stop hook into `.claude/settings.json`.
