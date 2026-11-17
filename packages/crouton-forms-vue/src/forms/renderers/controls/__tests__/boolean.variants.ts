import { type ControlVariant, multiControl, singleControl } from './control-variant';

const boolean = { type: 'boolean' };

export const booleanVariants: ControlVariant[] = [
  singleControl('default', { property: boolean }),
  singleControl('checked', { property: boolean, formData: { value: true } }),
  singleControl('unchecked', { property: boolean, formData: { value: false } }),
  singleControl('null-value', { property: boolean, formData: { value: null } }),
  singleControl('format-option', { property: { type: 'string' }, options: { format: 'boolean' } }),
  singleControl('label', { property: boolean, options: { label: 'Custom label' } }),
  singleControl('schema-title', { property: { ...boolean, title: 'Schema title' } }),
  singleControl('description', { property: { ...boolean, description: 'Shown below the checkbox' } }),
  singleControl('hide-label', { property: boolean, options: { hideLabel: true } }),
  singleControl('width', { property: boolean, options: { width: 'w-48' } }),
  singleControl('colspan', { property: boolean, options: { colspan: 6 } }),
  singleControl('styles', {
    property: boolean,
    options: { styles: { control: { checkbox: 'checkbox checkbox-primary' } } },
  }),
  singleControl('required', { property: boolean, required: true }),
  singleControl('error-message', {
    property: { ...boolean, const: true },
    options: { errorMessage: 'Please accept' },
    form: { errorMode: 'always' },
  }),
  singleControl('readonly', { property: boolean, options: { readonly: true }, formData: { value: true } }),
  singleControl('form-readonly', { property: boolean, formData: { value: true }, form: { readonly: true } }),
  singleControl('disabled', { property: boolean, options: { disabled: true }, formData: { value: true } }),
  multiControl(
    'disabled-when',
    { lock: { type: 'string' }, value: boolean },
    { value: { disabledWhen: { field: 'lock', exists: true } } },
  ),
];
