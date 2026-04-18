---
archived: true
---

# `.ai-context/sessions/_archive/`

This folder holds compacted rollups of older session logs, created by `ai-context compact`. Each rollup summarizes a batch of archived sessions into a single file and the original session files are deleted.

## For agents: do NOT read this folder at session start

These rollups are not part of the "recent sessions" context. Reading them unconditionally would bloat your context window with historical noise.

- **Don't** include `_archive/` in your "Read First" scan.
- **Do** `grep` this folder only when you need specific historical context (e.g., "why was feature X designed this way months ago?").

The `archived: true` frontmatter on each rollup file marks the intent: treat as reference, not orientation.

## Rollup format

Each rollup file looks roughly like:

```markdown
---
archived: true
range_start: 2025-11-20
range_end: 2026-01-15
source_count: 12
---

# Archived sessions 2025-11-20 → 2026-01-15

## Decisions carried forward
- ...

## Open threads at end of range
- ...

## Archived sessions (one-liners)
- 2025-11-20-initial-setup.md — ...
- ...
```
