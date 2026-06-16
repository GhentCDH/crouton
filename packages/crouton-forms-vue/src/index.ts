// Types
export { default as ReadonlyLabel } from './forms/renderers/controls/readonly/ReadonlyLabel.vue';

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

// Components
export { default as JsonForm } from './forms/FormComponent.vue';
export { default as JsonFormModal } from './forms/modal/FormModal.vue';
export {
  FormModalEmits,
  FormModalProperties,
} from './forms/modal/FormModal.properties';

// Services
export { JsonFormModalService } from './forms/modal/FormModalService';

// Renderers & testers
export { customRenderers, readonlyRenderers } from './forms/renderers';
export { optionIsIgnoreCase } from './testers/tester';
// Error handling
export { formatError, registerZodErrorMap } from './forms/errorMessages';

// Repository & table
export * from './repository';
export * from './table';
export * from './forms/renderers/controls/readonly/displayValue';
