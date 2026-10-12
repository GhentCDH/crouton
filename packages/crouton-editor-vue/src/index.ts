import './styles.css';

export { default as ResourceJsonEditor } from './components/ResourceJsonEditor.vue';
export { ResourceJsonEditorProperties } from './components/ResourceJsonEditor.properties';
export {
  COLSPAN_OPTIONS,
  FIRST_CLASS_OPTION_KEYS,
  HIDDEN_FLAG,
  TABS,
  colspanLabel,
  toDraft,
  visibleTabs,
} from '@ghentcdh/crouton-frontend-core';
export type {
  ColumnPatch,
  EditableColumn,
  EditableFieldVariant,
  FieldVariant,
  FieldVariantPatch,
  Tab,
  VariantDraft,
} from '@ghentcdh/crouton-frontend-core';
