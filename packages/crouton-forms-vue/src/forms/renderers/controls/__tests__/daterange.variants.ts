import { type ControlVariant, multiControl, singleControl } from './control-variant';

/** The date-range renderer is selected by `format: 'dateRange'`. */
const range = (options: Record<string, unknown> = {}) => ({ format: 'dateRange', ...options });

/** The example app stores the range as a JSON string column (Prisma `String?`). */
const string = { type: 'string' };
const object = { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } };
const MAY = '{"from":"2024-05-01","to":"2024-05-15"}';

export const dateRangeVariants: ControlVariant[] = [
  singleControl('default', { property: string, options: range() }),
  singleControl('initial-json-string', { property: string, options: range(), formData: { value: MAY } }),
  singleControl('object-schema', { property: object, options: range() }),
  singleControl('initial-object', {
    property: object,
    options: range(),
    formData: { value: { from: '2024-06-01', to: '2024-06-30' } },
  }),
  singleControl('custom-fields', {
    property: string,
    options: range({ fromField: 'start', toField: 'end' }),
    formData: { value: '{"start":"2024-01-01","end":"2024-01-31"}' },
  }),
  singleControl('custom-labels', { property: string, options: range({ fromLabel: 'Start date', toLabel: 'End date' }) }),
  singleControl('year-only', { property: string, options: range({ yearOnly: true }) }),
  singleControl('year-only-placeholder', {
    property: string,
    options: range({ yearOnly: true, placeholder: 'e.g. 1200' }),
  }),
  singleControl('label', { property: string, options: range({ label: 'Rental period' }) }),
  singleControl('schema-title', { property: { ...string, title: 'Schema title' }, options: range() }),
  singleControl('description', { property: { ...string, description: 'Pick a period' }, options: range() }),
  singleControl('hide-label', { property: string, options: range({ hideLabel: true }) }),
  singleControl('width', { property: string, options: range({ width: 'w-96' }) }),
  singleControl('colspan', { property: string, options: range({ colspan: 6 }) }),
  singleControl('styles', { property: string, options: range({ styles: { control: { input: 'input input-primary' } } }) }),
  singleControl('required', { property: string, required: true, options: range(), formData: { value: MAY } }),
  singleControl('error-message', {
    property: string,
    required: true,
    options: range({ errorMessage: 'Please pick a period' }),
    formData: { value: MAY },
  }),
  singleControl('readonly', { property: string, options: range({ readonly: true }), formData: { value: MAY } }),
  singleControl('form-readonly', { property: string, options: range(), formData: { value: MAY }, form: { readonly: true } }),
  singleControl('disabled', { property: string, options: range({ disabled: true }), formData: { value: MAY } }),
  multiControl(
    'disabled-when',
    { lock: { type: 'string' }, value: string },
    { value: range({ disabledWhen: { field: 'lock', exists: true } }) },
  ),
];
