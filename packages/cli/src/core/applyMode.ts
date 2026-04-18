import type { ApplyMode } from './manifest.js';

interface ApplyModeInput {
  /** True if a .ai-context/ directory already exists in the target. */
  hasExistingContext: boolean;
  /** The version string from the existing manifest, or null if none. */
  existingVersion: string | null;
  /** The schema_version from the existing manifest, or null if none. */
  existingSchemaVersion: number | null;
  /** The version being installed. */
  incomingVersion: string;
  /** The schema_version being installed. */
  incomingSchemaVersion: number;
}

/**
 * Determines the apply mode for the current installation.
 *
 * - fresh-install:   No existing .ai-context/ directory.
 * - legacy-upgrade:  Existing .ai-context/ with no manifest (pre-versioned).
 * - upgrade:         Existing manifest but version or schema differs from incoming.
 * - reapply:         Existing manifest with same version and schema as incoming.
 */
export function detectApplyMode(input: ApplyModeInput): ApplyMode {
  const {
    hasExistingContext,
    existingVersion,
    existingSchemaVersion,
    incomingVersion,
    incomingSchemaVersion,
  } = input;

  if (!hasExistingContext) {
    return 'fresh-install';
  }

  if (existingVersion === null) {
    return 'legacy-upgrade';
  }

  if (
    existingVersion !== incomingVersion ||
    existingSchemaVersion !== incomingSchemaVersion
  ) {
    return 'upgrade';
  }

  return 'reapply';
}
