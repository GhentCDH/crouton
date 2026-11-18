import { type ControlVariant, multiControl, singleControl } from './control-variant';

const date = { type: 'string', format: 'date' };
const dateTime = { type: 'string', format: 'date-time' };
const MAY_15 = '2024-05-15T00:00:00.000Z';

export const dateVariants: ControlVariant[] = [
  singleControl('default', { property: date }),
  singleControl('initial-value', { property: date, formData: { value: MAY_15 } }),
  singleControl('null-value', { property: date, formData: { value: null } }),
  singleControl('date-time', { property: dateTime, formData: { value: '2024-05-15T10:30:00.000Z' } }),
  singleControl('with-time', { property: date, options: { withTime: true } }),
  singleControl('without-time', { property: dateTime, options: { withTime: false } }),
  singleControl('format-date-time', { property: { type: 'string' }, options: { format: 'dateTime' } }),
  singleControl('min-max', {
    property: date,
    options: { min: '2024-05-10', max: '2024-05-20' },
    formData: { value: MAY_15 },
  }),
  singleControl('locale', { property: date, options: { locale: 'nl-BE' }, formData: { value: MAY_15 } }),
  singleControl('first-day-sunday', { property: date, options: { firstDayOfWeek: 0 }, formData: { value: MAY_15 } }),
  singleControl('label', { property: date, options: { label: 'Custom label' } }),
  singleControl('schema-title', { property: { ...date, title: 'Schema title' } }),
  singleControl('description', { property: { ...date, description: 'Pick a day' } }),
  singleControl('hide-label', { property: date, options: { hideLabel: true } }),
  singleControl('width', { property: date, options: { width: 'w-48' } }),
  singleControl('colspan', { property: date, options: { colspan: 6 } }),
  singleControl('styles', { property: date, options: { styles: { control: { input: 'input input-primary' } } } }),
  singleControl('required', { property: date, required: true, formData: { value: MAY_15 } }),
  singleControl('error-message', {
    property: date,
    required: true,
    options: { errorMessage: 'Please pick a date' },
    formData: { value: MAY_15 },
  }),
  singleControl('readonly', { property: date, options: { readonly: true }, formData: { value: MAY_15 } }),
  singleControl('form-readonly', { property: date, formData: { value: MAY_15 }, form: { readonly: true } }),
  singleControl('disabled', { property: date, options: { disabled: true }, formData: { value: MAY_15 } }),
  multiControl(
    'disabled-when',
    { lock: { type: 'string' }, value: date },
    { value: { disabledWhen: { field: 'lock', exists: true } } },
  ),
];
