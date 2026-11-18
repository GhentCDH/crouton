import { type ControlVariant, multiControl, singleControl } from './control-variant';
import { COUNTRIES } from './fake-http';

/** The autocomplete renderer is selected by `format: 'autocomplete'`. */
const ac = (options: Record<string, unknown> = {}) => ({
  format: 'autocomplete',
  labelKey: 'name',
  valueKey: 'code',
  ...options,
});
const inline = (options: Record<string, unknown> = {}) => ac({ options: COUNTRIES, ...options });
const remote = (options: Record<string, unknown> = {}) => ac({ uri: '/api/countries?q={q}', ...options });

const string = { type: 'string' };
const any = {};

export const autocompleteVariants: ControlVariant[] = [
  // Without storeValue the record (reduced to valueKey + labelKey) is stored.
  singleControl('inline', { property: any, options: inline() }),
  singleControl('inline-store-value', { property: string, options: inline({ storeValue: true }) }),
  singleControl('inline-initial-object', { property: any, options: inline(), formData: { value: COUNTRIES[0] } }),
  singleControl('inline-initial-scalar', {
    property: string,
    options: inline({ storeValue: true }),
    formData: { value: 'NL' },
  }),
  singleControl('values-alias', {
    property: string,
    options: ac({ values: COUNTRIES, storeValue: true }),
  }),
  singleControl('remote-uri', { property: string, options: remote({ storeValue: true }) }),
  singleControl('remote-data-field', {
    property: string,
    options: ac({ uri: '/api/wrapped?q={q}', dataField: 'items', storeValue: true }),
  }),
  singleControl('remote-resource', {
    property: string,
    options: ac({ resource: '/schemas/country', storeValue: true }),
  }),
  singleControl('resource-initial-scalar', {
    property: string,
    options: ac({ resource: '/schemas/country', storeValue: true }),
    formData: { value: 'FR' },
  }),
  singleControl('free-text', { property: string, options: inline({ freeText: true }) }),
  singleControl('enable-create', { property: string, options: inline({ storeValue: true, enableCreate: true }) }),
  singleControl('exclude-values', {
    property: string,
    options: remote({ storeValue: true, exclude: { values: ['BE'] } }),
  }),
  multiControl(
    'exclude-form-path',
    { other: string, value: string },
    { value: remote({ storeValue: true, exclude: { values: '{form.other}' } }) },
  ),
  singleControl('label', { property: string, options: inline({ storeValue: true, label: 'Custom label' }) }),
  singleControl('schema-title', {
    property: { ...string, title: 'Schema title' },
    options: inline({ storeValue: true }),
  }),
  singleControl('description', {
    property: { ...string, description: 'Start typing a country' },
    options: inline({ storeValue: true }),
  }),
  singleControl('hide-label', { property: string, options: inline({ storeValue: true, hideLabel: true }) }),
  singleControl('placeholder', {
    property: string,
    options: inline({ storeValue: true, placeholder: 'Search countries…' }),
  }),
  singleControl('width', { property: string, options: inline({ storeValue: true, width: 'w-48' }) }),
  singleControl('colspan', { property: string, options: inline({ storeValue: true, colspan: 6 }) }),
  singleControl('styles', {
    property: string,
    options: inline({ storeValue: true, styles: { control: { select: 'input input-primary pr-14' } } }),
  }),
  singleControl('required', {
    property: string,
    required: true,
    options: inline({ storeValue: true }),
    formData: { value: 'BE' },
  }),
  singleControl('error-message', {
    property: string,
    required: true,
    options: inline({ storeValue: true, errorMessage: 'Please pick a country' }),
    formData: { value: 'BE' },
  }),
  singleControl('readonly', {
    property: string,
    options: inline({ storeValue: true, readonly: true }),
    formData: { value: 'BE' },
  }),
  singleControl('form-readonly', {
    property: string,
    options: inline({ storeValue: true }),
    formData: { value: 'BE' },
    form: { readonly: true },
  }),
  singleControl('disabled', {
    property: string,
    options: inline({ storeValue: true, disabled: true }),
    formData: { value: 'BE' },
  }),
  multiControl(
    'disabled-when',
    { lock: string, value: string },
    { value: inline({ storeValue: true, disabledWhen: { field: 'lock', exists: true } }) },
  ),
];
