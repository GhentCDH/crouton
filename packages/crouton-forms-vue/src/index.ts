import './styles.css';

// Types
export { default as FormComponent } from './forms/FormComponent.vue';

export { default as ReadonlyLabel } from './forms/renderers/controls/readonly/ReadonlyLabel.vue';
export { default as ControlLabel } from './forms/renderers/controls/ControlLabel.vue';

export type { ErrorMode } from './forms/errorMode';
export type { HttpClient } from './http-client';
export type {
  FormModalProp,
  FormModalResult,
} from './forms/modal/FormModal.properties';

// Composables
export {
  useControlBinding,
  useCustomControlBinding,
} from './forms/renderers/controls/composables/useControlBinding';
export * from './forms/renderers/controls/composables/useReadonlyBinding';
export { useDisplayValue } from './forms/renderers/controls/readonly/useDisplayValue';
export * from './composables/useFormEvents';
export { provideHttpClient, useHttpClient } from './composables/useHttpClient';
export { useAutoSave } from './composables/useAutoSave';
export type {
  AutoSaveStatus,
  UseAutoSaveOptions,
  UseAutoSaveReturn,
} from './composables/useAutoSave';

// Components
export { default as JsonForm } from './forms/FormComponent.vue';
export { default as JsonFormModal } from './forms/modal/FormModal.vue';
export { default as FormModal } from './forms/modal/FormModal.vue';
export { default as AutoSaveForm } from './forms/AutoSaveForm.vue';
export {
  FormModalEmits,
  FormModalProperties,
} from './forms/modal/FormModal.properties';

// Services
export { JsonFormModalService } from './forms/modal/FormModalService';

// Renderers & testers
export * from './forms/renderers';
export { isCustomControlRender, optionIsIgnoreCase } from './testers/tester';
// Error handling
export { formatError, registerZodErrorMap } from './forms/errorMessages';

// Repository & table
export * from './repository';
export * from './table';
export * from './forms/renderers/controls/readonly/displayValue';
// Re-export crouton-core (explicit to support rollupTypes)
// filter
export {
  Operator,
  OperatorLabel,
  OperatorNoValue,
  OperatorOptions,
  OperatorsByType,
  buildFilter,
  buildSort,
  buildSortKey,
  extractFilters,
  filterToString,
  stringToFilter,
} from '@ghentcdh/crouton-core';
export type { FieldType, Filter, OperatorType } from '@ghentcdh/crouton-core';

// request & response models
export {
  RequestSchema,
  RequestSchemaWithOffset,
  ResponseRequestSchema,
  ResponseSchema,
  SortDirEnum,
} from '@ghentcdh/crouton-core';
export type {
  ListRequest,
  ResponseData,
  SortDir,
} from '@ghentcdh/crouton-core';

// zod types
export { PositiveRequestNumber, StringOrArray } from '@ghentcdh/crouton-core';

// schema
export {
  ModalSize,
  createSchema,
  enforceRequiredStringMinLength,
  findProperty,
} from '@ghentcdh/crouton-core';
export { ModalSize as Size } from '@ghentcdh/crouton-core';
export type {
  FormSchemaModel,
  JsonFormsLayout,
  ModalSizeType,
} from '@ghentcdh/crouton-core';
export type { ModalSizeType as SizeType } from '@ghentcdh/crouton-core';

// from-json builder
export { uiFromJsonSchema } from '@ghentcdh/crouton-core';

// relation types
export type { RelationType } from '@ghentcdh/crouton-core';

// json-config types
export { labelFromId } from '@ghentcdh/crouton-core';
export type {
  CalculatedColumn,
  DetailConfig,
  DetailControl,
  FieldInput,
  JsonAction,
  JsonActionCondition,
  JsonColumn,
  JsonColumnsMap,
  JsonDisplay,
  JsonIncludeEntry,
  JsonProcedureAction,
  RelationFieldInputOptions,
  SidebarGroupConfig,
} from '@ghentcdh/crouton-core';

// value-label
export { fromValueLabel, toValueLabel } from '@ghentcdh/crouton-core';
export type { ValueLabel, ValueLabelOption } from '@ghentcdh/crouton-core';

// layout builders
export {
  Builder,
  BuilderWithElements,
  CategoryBuilder,
  ControlBuilder,
  ControlType,
  GroupBuilder,
  LayoutBuilder,
  LayoutTypes,
} from '@ghentcdh/crouton-core';
export type {
  ArrayAction,
  ArrayActionType,
  AutocompleteAllOptions,
  AutocompleteOptions,
  AutocompleteRemoteOptions,
  AutocompleteResourceOptions,
  CategoryType,
  ControlOption,
  ControlTypes,
  DateRangeOptions,
  DetailOptions,
  ElementBuilder,
  GroupType,
  MarkdownOptions,
  SelectOptions,
  TextAreaOptions,
} from '@ghentcdh/crouton-core';

// table
export {
  BooleanCellBuilder,
  TableBuilder,
  TextCellBuilder,
  findColumnDef,
} from '@ghentcdh/crouton-core';
export type {
  ColumnDef,
  KeyValueOption,
  TextCellOption,
  TextCellType,
} from '@ghentcdh/crouton-core';
