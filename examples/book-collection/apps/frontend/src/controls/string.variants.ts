import { type ControlVariant, multiControl, singleControl } from './control-variant';

export const stringVariants: ControlVariant[] = [
  singleControl('default', 'Default'),
  singleControl('initial-value', 'Initial value', { formData: { value: 'Hello' } }),
  singleControl('label', 'Custom label', { options: { label: 'Custom label' } }),
  singleControl('schema-title', 'Label from schema title', {
    property: { type: 'string', title: 'Schema title' },
  }),
  singleControl('hide-label', 'Hidden label', { options: { hideLabel: true } }),
  singleControl('placeholder', 'Placeholder', { options: { placeholder: 'Type here…' } }),
  singleControl('required', 'Required', { required: true, formData: { value: 'Filled' } }),
  singleControl('error-message', 'Custom error message', {
    required: true,
    formData: { value: 'Filled' },
    options: { errorMessage: 'Please fill this in' },
  }),
  singleControl('readonly', 'Readonly', {
    options: { readonly: true },
    formData: { value: 'Read only' },
  }),
  singleControl('disabled', 'Disabled', {
    options: { disabled: true },
    formData: { value: 'Disabled' },
  }),
  multiControl(
    'disabled-when',
    'Disabled when another field has a value',
    { lock: { type: 'string' }, value: { type: 'string' } },
    { value: { disabledWhen: { field: 'lock', exists: true } } },
  ),
  singleControl('email', 'Email format', { property: { type: 'string', format: 'email' } }),
  singleControl('uri', 'URI format', { property: { type: 'string', format: 'uri' } }),
];
