/**
 * Types for the resource.json migration engine.
 *
 * Migrations operate on the **raw** (pre-`ResourceJsonSchema.transform`) object so the
 * result can be written back byte-stably and validated with Zod afterwards — never on a
 * transformed config (which would normalize columns map→array and inject defaults, and
 * so explode diffs). Each step is a pure function returning a new object.
 */

export type RawResourceJson = Record<string, unknown>;

export interface ResourceMigration {
  /** Version this step upgrades FROM. */
  readonly from: number;
  /** Version this step upgrades TO — must equal `from + 1`. */
  readonly to: number;
  /** Human-readable summary, surfaced in logs. */
  readonly description: string;
  /** Pure transform: given a raw object at `from`, return a new raw object at `to`. */
  migrate(raw: RawResourceJson): RawResourceJson;
}

export interface MigrationResult {
  /** The migrated object, with `schemaVersion` set to `to`. */
  raw: RawResourceJson;
  /** Version the input was at. */
  from: number;
  /** Version the output is at (the requested target). */
  to: number;
  /** Descriptions of the steps applied, in order (empty when already current). */
  applied: string[];
}

/** No registered step bridges some gap in the chain (or the file is newer than crouton). */
export class MigrationPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationPathError';
  }
}

/** A migration step threw while transforming the object. */
export class MigrationStepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationStepError';
  }
}
