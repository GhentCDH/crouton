export interface DatabaseStatus {
  name: string;
  connected: boolean;
  error?: string;
}

export interface ResourceStatus {
  name: string;
  path: string;
  valid: boolean;
  /**
   * Where the resource's data comes from. `prisma` is backed by a model;
   * `custom` is served by the resource's own `repository.ts`.
   */
  kind?: 'prisma' | 'custom';
  /** Operations a custom resource serves from its repository.ts. */
  customOperations?: string[];
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

export interface I18nLanguageStatus {
  language: string;
  keyCount: number;
  emptyKeys: number;
}

export interface I18nStatus {
  active: boolean;
  defaultLanguage: string;
  languages: string[];
  bundles: I18nLanguageStatus[];
}

export interface CroutonStatus {
  version: string;
  croutonVersion: string;
  environment: string;
  summary: StatusSummary;
  databases: DatabaseStatus[];
  resources: ResourceStatus[];
  enums?: EnumSections;
  i18n?: I18nStatus;
}
