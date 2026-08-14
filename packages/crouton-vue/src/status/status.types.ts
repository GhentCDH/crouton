export interface DatabaseStatus {
  name: string;
  connected: boolean;
  error?: string;
}

export interface ResourceStatus {
  name: string;
  path: string;
  valid: boolean;
  error?: string;
  /** Loaded/expected schema version (present on loaded, migration-failed, and draft rows). */
  version?: number;
  /** Version crouton expects, when it differs from `version` (schema-version failures). */
  expectedVersion?: number;
  /** Present in the repo but intentionally not loaded/served. Informational, not an error. */
  draft?: boolean;
  /** Loaded and served, but hidden from the admin sidebar menu. */
  hidden?: boolean;
}

export interface StatusSummary {
  ok: boolean;
  databaseErrors: number;
  resourceErrors: number;
}

export interface EnumValue {
  value: string | number | boolean;
  label: string;
}

export interface EnumGroup {
  name: string;
  category: string;
  values: EnumValue[];
}

export interface EnumSections {
  system: EnumGroup[];
  project: EnumGroup[];
}

export interface CroutonStatus {
  version: string;
  croutonVersion: string;
  environment: string;
  summary: StatusSummary;
  databases: DatabaseStatus[];
  resources: ResourceStatus[];
  enums?: EnumSections;
}
