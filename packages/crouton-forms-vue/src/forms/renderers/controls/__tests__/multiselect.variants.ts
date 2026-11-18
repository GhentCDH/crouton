import { type ControlVariant, multiControl, singleControl } from './control-variant';
import { STATUSES } from './select.variants';

/** The multi-select renderer is selected by `format: 'multiSelect'`. */
const multi = (options: Record<string, unknown> = {}) => ({
  format: 'multiSelect',
  options: STATUSES,
  ...options,
});

/** The example app stores the list as a JSON string column (Prisma `String?`). */
const string = { type: 'string' };
const array = { type: 'array', items: {} };

export const multiSelectVariants: ControlVariant[] = [
  singleControl('default', { property: string, options: multi() }),
  singleControl('store-value', { property: string, options: multi({ storeValue: true }) }),
  singleControl('initial-json-string', {
    property: string,
    options: multi({ storeValue: true }),
    formData: { value: '["draft","archived"]' },
  }),
  singleControl('array-schema', { property: array, options: multi({ storeValue: true }) }),
  singleControl('initial-array', {
    property: array,
    options: multi({ storeValue: true }),
    formData: { value: ['published'] },
  }),
  singleControl('values-alias', { property: string, options: { format: 'multiSelect', values: STATUSES, storeValue: true } }),
  singleControl('display-values', {
    property: string,
    options: {
      format: 'multiSelect',
      values: STATUSES.slice(0, 2),
      displayValues: STATUSES,
      storeValue: true,
    },
    formData: { value: '["draft","archived"]' },
  }),
  singleControl('custom-keys', {
    property: string,
    options: multi({
      options: [
        { name: 'Belgium', code: 'BE' },
        { name: 'France', code: 'FR' },
      ],
      labelKey: 'name',
      valueKey: 'code',
      storeValue: true,
    }),
  }),
  singleControl('clearable', {
    property: string,
    options: multi({ storeValue: true, clearable: true }),
    formData: { value: '["draft"]' },
  }),
  singleControl('not-clearable', {
    property: string,
    options: multi({ storeValue: true, clearable: false }),
    formData: { value: '["draft"]' },
  }),
  singleControl('remote-uri', {
    property: string,
    options: { format: 'multiSelect', uri: '/api/countries?q=', storeValue: true, labelKey: 'name', valueKey: 'code' },
  }),
  singleControl('remote-data-field', {
    property: string,
    options: {
      format: 'multiSelect',
      uri: '/api/wrapped?q=',
      dataField: 'items',
      storeValue: true,
      labelKey: 'name',
      valueKey: 'code',
    },
  }),
  singleControl('remote-resource', {
    property: string,
    options: { format: 'multiSelect', resource: '/schemas/country', storeValue: true, labelKey: 'name', valueKey: 'code' },
  }),
  singleControl('label', { property: string, options: multi({ storeValue: true, label: 'Custom label' }) }),
  singleControl('schema-title', {
    property: { ...string, title: 'Schema title' },
    options: multi({ storeValue: true }),
  }),
  singleControl('description', {
    property: { ...string, description: 'Pick any statuses' },
    options: multi({ storeValue: true }),
  }),
  singleControl('hide-label', { property: string, options: multi({ storeValue: true, hideLabel: true }) }),
  singleControl('placeholder', {
    property: string,
    options: multi({ storeValue: true, placeholder: 'Choose statuses' }),
  }),
  singleControl('width', { property: string, options: multi({ storeValue: true, width: 'w-48' }) }),
  singleControl('colspan', { property: string, options: multi({ storeValue: true, colspan: 6 }) }),
  singleControl('styles', {
    property: string,
    options: multi({ storeValue: true, styles: { control: { select: 'input input-primary pr-14' } } }),
  }),
  singleControl('required', {
    property: { type: 'array', items: {}, minItems: 1 },
    required: true,
    options: multi({ storeValue: true, clearable: true }),
    formData: { value: ['draft'] },
  }),
  singleControl('error-message', {
    property: { type: 'array', items: {}, minItems: 1 },
    required: true,
    options: multi({ storeValue: true, clearable: true, errorMessage: 'Pick at least one status' }),
    formData: { value: ['draft'] },
  }),
  singleControl('readonly', {
    property: string,
    options: multi({ storeValue: true, readonly: true }),
    formData: { value: '["draft","published"]' },
  }),
  singleControl('form-readonly', {
    property: string,
    options: multi({ storeValue: true }),
    formData: { value: '["draft","published"]' },
    form: { readonly: true },
  }),
  singleControl('disabled', {
    property: string,
    options: multi({ storeValue: true, disabled: true }),
    formData: { value: '["draft","published"]' },
  }),
  multiControl(
    'disabled-when',
    { lock: { type: 'string' }, value: string },
    { value: multi({ storeValue: true, disabledWhen: { field: 'lock', exists: true } }) },
  ),
];
