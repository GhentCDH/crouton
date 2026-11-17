import { type ControlVariant, multiControl, singleControl } from './control-variant';

const number = { type: 'number' };
const integer = { type: 'integer' };

export const numberVariants: ControlVariant[] = [
  singleControl('default', { property: number }),
  singleControl('integer', { property: integer }),
  singleControl('initial-value', { property: number, formData: { value: 42 } }),
  singleControl('decimal', { property: number, formData: { value: 3.14 } }),
  singleControl('zero', { property: number, formData: { value: 0 } }),
  singleControl('negative', { property: number, formData: { value: -5 } }),
  singleControl('null-value', { property: number, formData: { value: null } }),
  singleControl('label', { property: number, options: { label: 'Custom label' } }),
  singleControl('schema-title', { property: { ...number, title: 'Schema title' } }),
  singleControl('description', { property: { ...number, description: 'Shown below the input' } }),
  singleControl('hide-label', { property: number, options: { hideLabel: true } }),
  singleControl('placeholder', { property: number, options: { placeholder: 'Enter a number' } }),
  singleControl('width', { property: number, options: { width: 'w-48' } }),
  singleControl('colspan', { property: number, options: { colspan: 6 } }),
  singleControl('styles', {
    property: number,
    options: { styles: { control: { input: 'input input-primary' } } },
  }),
  singleControl('required', { property: number, required: true, formData: { value: 7 } }),
  singleControl('error-message', {
    property: number,
    required: true,
    formData: { value: 7 },
    options: { errorMessage: 'Please enter a number' },
  }),
  singleControl('minimum', { property: { ...number, minimum: 10 } }),
  singleControl('maximum', { property: { ...number, maximum: 100 } }),
  singleControl('integer-decimal', { property: integer }),
  singleControl('error-mode-always', {
    property: number,
    required: true,
    form: { errorMode: 'always' },
  }),
  singleControl('readonly', { property: number, options: { readonly: true }, formData: { value: 12 } }),
  singleControl('form-readonly', { property: number, formData: { value: 13 }, form: { readonly: true } }),
  singleControl('disabled', { property: number, options: { disabled: true }, formData: { value: 14 } }),
  multiControl(
    'disabled-when',
    { lock: { type: 'string' }, value: number },
    { value: { disabledWhen: { field: 'lock', exists: true } } },
  ),
];
