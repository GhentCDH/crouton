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
export * from '@ghentcdh/crouton-core';
