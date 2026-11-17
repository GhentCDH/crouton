import { type ControlVariant, multiControl, singleControl } from './control-variant';

/** The textarea renderer is selected by `format: 'textarea'`. */
const textarea = (options: Record<string, unknown> = {}) => ({ format: 'textarea', ...options });
const LONG = 'Line one\nLine two\nLine three';

export const textareaVariants: ControlVariant[] = [
  singleControl('default', { options: textarea() }),
  singleControl('initial-value', { options: textarea(), formData: { value: LONG } }),
  singleControl('null-value', { options: textarea(), formData: { value: null } }),
  singleControl('label', { options: textarea({ label: 'Custom label' }) }),
  singleControl('schema-title', { property: { type: 'string', title: 'Schema title' }, options: textarea() }),
  singleControl('description', {
    property: { type: 'string', description: 'Shown below the textarea' },
    options: textarea(),
  }),
  singleControl('hide-label', { options: textarea({ hideLabel: true }) }),
  singleControl('placeholder', { options: textarea({ placeholder: 'Write something…' }) }),
  singleControl('width', { options: textarea({ width: 'w-48' }) }),
  singleControl('colspan', { options: textarea({ colspan: 6 }) }),
  singleControl('styles', {
    options: textarea({ styles: { control: { textarea: 'textarea textarea-primary h-32' } } }),
  }),
  singleControl('height', { options: textarea({ height: '200px' }) }),
  singleControl('height-number', { options: textarea({ height: 240 }) }),
  singleControl('min-height', { options: textarea({ minHeight: 160 }) }),
  singleControl('direction-rtl', {
    options: textarea({ direction: 'rtl' }),
    formData: { value: 'مرحبا بالعالم' },
  }),
  multiControl(
    'direction-field',
    { language: { type: 'string' }, value: { type: 'string' } },
    { value: textarea({ directionField: 'language' }) },
  ),
  // Dotted path whose parent object is missing → falls back to ltr.
  singleControl('direction-field-missing', { options: textarea({ directionField: 'meta.language' }) }),
  singleControl('required', { required: true, options: textarea(), formData: { value: 'Filled' } }),
  singleControl('error-message', {
    required: true,
    formData: { value: 'Filled' },
    options: textarea({ errorMessage: 'Please write something' }),
  }),
  singleControl('max-length', { property: { type: 'string', maxLength: 10 }, options: textarea() }),
  singleControl('readonly', { options: textarea({ readonly: true }), formData: { value: 'Read only' } }),
  singleControl('form-readonly', {
    options: textarea(),
    formData: { value: 'Form read only' },
    form: { readonly: true },
  }),
  singleControl('disabled', { options: textarea({ disabled: true }), formData: { value: 'Disabled' } }),
  multiControl(
    'disabled-when',
    { lock: { type: 'string' }, value: { type: 'string' } },
    { value: textarea({ disabledWhen: { field: 'lock', exists: true } }) },
  ),
];
