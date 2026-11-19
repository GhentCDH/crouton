import { type ControlVariant, multiControl, singleControl } from './control-variant';

/** The markdown renderer is selected by `format: 'markdown'`. */
const md = (options: Record<string, unknown> = {}) => ({ format: 'markdown', ...options });
const string = { type: 'string' };

export const markdownVariants: ControlVariant[] = [
  singleControl('default', { property: string, options: md() }),
  singleControl('initial-value', { property: string, options: md(), formData: { value: 'Hello **world**' } }),
  singleControl('null-value', { property: string, options: md(), formData: { value: null } }),
  singleControl('min-height', { property: string, options: md({ minHeight: '240px' }) }),
  singleControl('label', { property: string, options: md({ label: 'Custom label' }) }),
  singleControl('schema-title', { property: { ...string, title: 'Schema title' }, options: md() }),
  singleControl('description', { property: { ...string, description: 'Supports **bold** and _italic_' }, options: md() }),
  singleControl('hide-label', { property: string, options: md({ hideLabel: true }) }),
  singleControl('width', { property: string, options: md({ width: 'w-96' }) }),
  singleControl('colspan', { property: string, options: md({ colspan: 6 }) }),
  singleControl('required', { property: string, required: true, options: md(), formData: { value: 'Filled' } }),
  singleControl('error-message', {
    property: string,
    required: true,
    options: md({ errorMessage: 'Please write something' }),
    formData: { value: 'Filled' },
  }),
  singleControl('readonly', { property: string, options: md({ readonly: true }), formData: { value: 'Read only' } }),
  singleControl('form-readonly', { property: string, options: md(), formData: { value: '**Bold** text' }, form: { readonly: true } }),
  singleControl('disabled', { property: string, options: md({ disabled: true }), formData: { value: 'Disabled' } }),
  multiControl(
    'disabled-when',
    { lock: string, value: string },
    { value: md({ disabledWhen: { field: 'lock', exists: true } }) },
  ),
];
