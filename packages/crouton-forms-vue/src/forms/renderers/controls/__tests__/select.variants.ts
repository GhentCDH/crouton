import { type ControlVariant, multiControl, singleControl } from './control-variant';

/** The select renderer is selected by `format: 'select'`. */
const select = (options: Record<string, unknown> = {}) => ({
  format: 'select',
  options: STATUSES,
  ...options,
});

export const STATUSES = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
];

const string = { type: 'string' };
const any = {};

export const selectVariants: ControlVariant[] = [
  // Without storeValue the whole option object is stored.
  singleControl('default', { property: any, options: select() }),
  singleControl('initial-object', { property: any, options: select(), formData: { value: STATUSES[1] } }),
  singleControl('store-value', { property: string, options: select({ storeValue: true }) }),
  singleControl('initial-scalar', {
    property: string,
    options: select({ storeValue: true }),
    formData: { value: 'archived' },
  }),
  singleControl('falsy-value', {
    property: { type: 'number' },
    options: select({
      options: [
        { label: 'None', value: 0 },
        { label: 'One', value: 1 },
      ],
      storeValue: true,
    }),
    formData: { value: 0 },
  }),
  singleControl('values-alias', {
    property: string,
    options: { format: 'select', values: STATUSES, storeValue: true },
  }),
  // `values` restricts a shared enum; `displayValues` still resolves labels outside it.
  singleControl('display-values', {
    property: string,
    options: {
      format: 'select',
      values: STATUSES.slice(0, 2),
      displayValues: STATUSES,
      storeValue: true,
    },
    formData: { value: 'archived' },
  }),
  singleControl('custom-keys', {
    property: string,
    options: select({
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
    options: select({ storeValue: true, clearable: true }),
    formData: { value: 'draft' },
  }),
  singleControl('not-clearable', {
    property: string,
    options: select({ storeValue: true, clearable: false }),
    formData: { value: 'draft' },
  }),
  singleControl('remote-uri', {
    property: string,
    options: { format: 'select', uri: '/api/countries?q=', storeValue: true, labelKey: 'name', valueKey: 'code' },
  }),
  singleControl('remote-data-field', {
    property: string,
    options: {
      format: 'select',
      uri: '/api/wrapped?q=',
      dataField: 'items',
      storeValue: true,
      labelKey: 'name',
      valueKey: 'code',
    },
  }),
  singleControl('remote-error', {
    property: string,
    options: { format: 'select', uri: '/api/fail?q=', storeValue: true },
  }),
  singleControl('remote-resource', {
    property: string,
    options: { format: 'select', resource: '/schemas/country', storeValue: true, labelKey: 'name', valueKey: 'code' },
  }),
  singleControl('label', { property: string, options: select({ storeValue: true, label: 'Custom label' }) }),
  singleControl('schema-title', {
    property: { ...string, title: 'Schema title' },
    options: select({ storeValue: true }),
  }),
  singleControl('description', {
    property: { ...string, description: 'Pick a status' },
    options: select({ storeValue: true }),
  }),
  singleControl('hide-label', { property: string, options: select({ storeValue: true, hideLabel: true }) }),
  singleControl('placeholder', {
    property: string,
    options: select({ storeValue: true, placeholder: 'Choose a status' }),
  }),
  singleControl('width', { property: string, options: select({ storeValue: true, width: 'w-48' }) }),
  singleControl('colspan', { property: string, options: select({ storeValue: true, colspan: 6 }) }),
  singleControl('styles', {
    property: string,
    options: select({ storeValue: true, styles: { control: { select: 'input input-primary pr-14' } } }),
  }),
  singleControl('required', {
    property: string,
    required: true,
    options: select({ storeValue: true, clearable: true }),
    formData: { value: 'draft' },
  }),
  singleControl('error-message', {
    property: string,
    required: true,
    options: select({ storeValue: true, clearable: true, errorMessage: 'Please pick a status' }),
    formData: { value: 'draft' },
  }),
  singleControl('readonly', {
    property: string,
    options: select({ storeValue: true, readonly: true }),
    formData: { value: 'published' },
  }),
  singleControl('form-readonly', {
    property: string,
    options: select({ storeValue: true }),
    formData: { value: 'published' },
    form: { readonly: true },
  }),
  singleControl('disabled', {
    property: string,
    options: select({ storeValue: true, disabled: true }),
    formData: { value: 'published' },
  }),
  multiControl(
    'disabled-when',
    { lock: string, value: string },
    { value: select({ storeValue: true, disabledWhen: { field: 'lock', exists: true } }) },
  ),
];
