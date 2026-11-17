import { type ControlVariant, multiControl, nestedControl, singleControl } from './control-variant';

export const stringVariants: ControlVariant[] = [
  singleControl('default'),
  singleControl('initial-value', { formData: { value: 'Hello' } }),
  singleControl('null-value', { formData: { value: null } }),
  singleControl('label', { options: { label: 'Custom label' } }),
  singleControl('schema-title', { property: { type: 'string', title: 'Schema title' } }),
  singleControl('description', {
    property: { type: 'string', description: 'Shown below the input' },
  }),
  singleControl('hide-label', { options: { hideLabel: true } }),
  singleControl('placeholder', { options: { placeholder: 'Type here…' } }),
  singleControl('clearable', { options: { clearable: true }, formData: { value: 'Clear me' } }),
  singleControl('not-clearable', { options: { clearable: false }, formData: { value: 'Keep me' } }),
  singleControl('width', { options: { width: 'w-48' } }),
  singleControl('colspan', { options: { colspan: 6 } }),
  singleControl('styles', { options: { styles: { control: { input: 'input input-primary' } } } }),
  singleControl('required', { required: true, formData: { value: 'Filled' } }),
  singleControl('error-message', {
    required: true,
    formData: { value: 'Filled' },
    options: { errorMessage: 'Please fill this in' },
  }),
  singleControl('min-length', { property: { type: 'string', minLength: 3 } }),
  singleControl('max-length', { property: { type: 'string', maxLength: 5 } }),
  singleControl('pattern', { property: { type: 'string', pattern: '^[a-z]+$' } }),
  singleControl('error-mode-always', {
    required: true,
    formData: { value: '' },
    form: { errorMode: 'always' },
  }),
  singleControl('error-mode-on-change', {
    required: true,
    formData: { value: 'Filled' },
    form: { errorMode: 'onChange' },
  }),
  singleControl('error-mode-on-submit', {
    required: true,
    formData: { value: 'Filled' },
    form: { errorMode: 'onSubmit' },
  }),
  singleControl('readonly', { options: { readonly: true }, formData: { value: 'Read only' } }),
  singleControl('form-readonly', { formData: { value: 'Form read only' }, form: { readonly: true } }),
  singleControl('disabled', { options: { disabled: true }, formData: { value: 'Disabled' } }),
  multiControl(
    'disabled-when',
    { lock: { type: 'string' }, value: { type: 'string' } },
    { value: { disabledWhen: { field: 'lock', exists: true } } },
  ),
  singleControl('email', { property: { type: 'string', format: 'email' } }),
  singleControl('uri', { property: { type: 'string', format: 'uri' } }),
  singleControl('format-text', {
    property: { type: 'string', format: 'email' },
    options: { format: 'text' },
  }),
  singleControl('unique', {
    options: { unique: { enabled: true, message: 'Name already taken' } },
  }),
  nestedControl('nested', 'person', 'name'),
];
