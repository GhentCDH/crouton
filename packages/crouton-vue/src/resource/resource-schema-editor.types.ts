/**
 * Re-export all types from `@ghentcdh/crouton-editor-vue` for backwards
 * compatibility — these types originated here but now live in the
 * standalone editor package.
 */
export {
  COLSPAN_OPTIONS,
  type ColumnPatch,
  type EditableColumn,
  type EditableFieldVariant,
  FIRST_CLASS_OPTION_KEYS,
  type FieldVariant,
  type FieldVariantPatch,
  HIDDEN_FLAG,
  TABS,
  type Tab,
  type VariantDraft,
  colspanLabel,
  toDraft,
  visibleTabs,
} from '@ghentcdh/crouton-editor-vue';
