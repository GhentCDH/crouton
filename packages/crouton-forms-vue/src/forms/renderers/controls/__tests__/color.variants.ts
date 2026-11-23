import { type ControlVariant, multiControl, singleControl } from './control-variant';

/** The color renderer is selected by `format: 'color'`. */
const color = (options: Record<string, unknown> = {}) => ({ format: 'color', ...options });

export const colorVariants: ControlVariant[] = [
  singleControl('default', { options: color() }),
  singleControl('initial-value', { options: color(), formData: { value: '#ff0000' } }),
  singleControl('label', { options: color({ label: 'Custom label' }) }),
  singleControl('hide-label', { options: color({ hideLabel: true }) }),
  singleControl('placeholder', { options: color({ placeholder: 'Pick a color' }) }),
  singleControl('width', { options: color({ width: 'w-48' }) }),
  singleControl('colspan', { options: color({ colspan: 6 }) }),
  singleControl('styles', { options: color({ styles: { control: { input: 'input input-primary' } } }) }),
  singleControl('error-message', {
    required: true,
    formData: { value: '#ff0000' },
    options: color({ errorMessage: 'Please pick a color' }),
  }),
  singleControl('readonly', { options: color({ readonly: true }), formData: { value: '#00ff00' } }),
  singleControl('form-readonly', {
    options: color(),
    formData: { value: '#0000ff' },
    form: { readonly: true },
  }),
  singleControl('disabled', { options: color({ disabled: true }), formData: { value: '#00ff00' } }),
  multiControl(
    'disabled-when',
    { lock: { type: 'string' }, value: { type: 'string' } },
    { value: color({ disabledWhen: { field: 'lock', exists: true } }) },
  ),
];
