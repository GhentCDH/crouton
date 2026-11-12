import './styles.css';

export { default as ResourceJsonEditor } from './components/ResourceJsonEditor.vue';
export { ResourceJsonEditorProperties } from './components/ResourceJsonEditor.properties';
export {
  FIRST_CLASS_OPTION_KEYS,
  HIDDEN_FLAG,
  TABS,
  toDraft,
  visibleTabs,
} from './types/resource-schema-editor.types';
export type {
  ColumnPatch,
  EditableColumn,
  EditableFieldVariant,
  FieldVariant,
  FieldVariantPatch,
  Tab,
  VariantDraft,
} from './types/resource-schema-editor.types';
