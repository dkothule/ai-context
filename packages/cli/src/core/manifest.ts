import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export type ApplyMode =
  | 'fresh-install'
  | 'upgrade'
  | 'legacy-upgrade'
  | 'reapply'
  | 'source-tree';

/** Shape of manifest.json — schema v5 (ai-context v1.0.0+) */
export interface Manifest {
  name: 'ai-context';
  version: string;
  schema_version: number;
  managed_by: string;
  installed_at: string | null;
  apply_mode: ApplyMode;
  agents_installed: string[] | null;
  previous_version: string | null;
  previous_schema_version: number | null;
}

/** Partial shape read from older schema versions (v1–v4). */
interface LegacyManifest {
  name?: string;
  version?: string;
  schema_version?: number;
  managed_by?: string;
  installed_at?: string | null;
  apply_mode?: string;
  previous_version?: string | null;
  previous_schema_version?: number | null;
  // v4 and earlier did not have agents_installed
}

/**
 * Returns the manifest file path inside a .ai-context/ directory.
 * Prefers manifest.json; falls back to legacy template.manifest.json.
 */
export async function detectManifestPath(contextDir: string): Promise<string | null> {
  const primary = join(contextDir, 'manifest.json');
  const legacy = join(contextDir, 'template.manifest.json');

  try {
    await readFile(primary);
    return primary;
  } catch {
    // primary not found, try legacy
  }

  try {
    await readFile(legacy);
    return legacy;
  } catch {
    return null;
  }
}

/**
 * Reads and parses the manifest from a .ai-context/ directory.
 * Returns null if no manifest file exists.
 */
export async function readManifest(contextDir: string): Promise<Manifest | null> {
  const manifestPath = await detectManifestPath(contextDir);
  if (!manifestPath) return null;

  const raw = await readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as LegacyManifest;

  // Normalize to current schema shape
  return {
    name: 'ai-context',
    version: parsed.version ?? '0.0.0',
    schema_version: parsed.schema_version ?? 1,
    managed_by: parsed.managed_by ?? 'unknown',
    installed_at: parsed.installed_at ?? null,
    apply_mode: (parsed.apply_mode as ApplyMode) ?? 'fresh-install',
    agents_installed: (parsed as Manifest).agents_installed ?? null,
    previous_version: parsed.previous_version ?? null,
    previous_schema_version: parsed.previous_schema_version ?? null,
  };
}

/**
 * Writes a manifest.json to the given .ai-context/ directory.
 */
export async function writeManifest(contextDir: string, data: Manifest): Promise<void> {
  const manifestPath = join(contextDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Reads the source-tree manifest (bundled in this package) to get the current template version.
 */
export async function readSourceManifest(templatesDir: string): Promise<Manifest> {
  const manifestPath = join(templatesDir, 'ai-context', 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  return JSON.parse(raw) as Manifest;
}
