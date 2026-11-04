// Status types are owned by `crouton-core` (the published package), so that
// there is exactly one definition. `@crouton/status` re-exports them for the
// admin UI and API; this package is private, so depending on core is fine.
export type {
  CroutonStatus,
  DatabaseStatus,
  EnumGroup,
  EnumSections,
  EnumValue,
  I18nLanguageStatus,
  I18nStatus,
  ResourceStatus,
  StatusSummary,
  SubResourceStatus,
} from '@ghentcdh/crouton-core';
