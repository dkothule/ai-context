import { describe, it, expect } from 'vitest';
import { detectApplyMode } from '../../src/core/applyMode.js';

const base = { incomingVersion: '1.0.0', incomingSchemaVersion: 5 };

describe('detectApplyMode', () => {
  it('returns fresh-install when no existing context', () => {
    expect(
      detectApplyMode({ ...base, hasExistingContext: false, existingVersion: null, existingSchemaVersion: null }),
    ).toBe('fresh-install');
  });

  it('returns legacy-upgrade when existing context has no manifest', () => {
    expect(
      detectApplyMode({ ...base, hasExistingContext: true, existingVersion: null, existingSchemaVersion: null }),
    ).toBe('legacy-upgrade');
  });

  it('returns upgrade when version differs', () => {
    expect(
      detectApplyMode({ ...base, hasExistingContext: true, existingVersion: '0.5.0', existingSchemaVersion: 5 }),
    ).toBe('upgrade');
  });

  it('returns upgrade when schema_version differs', () => {
    expect(
      detectApplyMode({ ...base, hasExistingContext: true, existingVersion: '1.0.0', existingSchemaVersion: 4 }),
    ).toBe('upgrade');
  });

  it('returns reapply when version and schema match', () => {
    expect(
      detectApplyMode({ ...base, hasExistingContext: true, existingVersion: '1.0.0', existingSchemaVersion: 5 }),
    ).toBe('reapply');
  });
});
