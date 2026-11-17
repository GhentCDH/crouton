import { type ControlVariant, multiControl, singleControl } from './control-variant';

/** The toggle renderer is selected by `format: 'toggle'`. */
const toggle = (options: Record<string, unknown> = {}) => ({
  format: 'toggle',
  options: SIZES,
  ...options,
});

const SIZES = [
  { label: 'Small', value: 's' },
  { label: 'Medium', value: 'm' },
  { label: 'Large', value: 'l' },
];
const YES_NO = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const string = { type: 'string' };
const any = {};

export const toggleVariants: ControlVariant[] = [
  // Without storeValue the whole option object is stored.
  singleControl('default', { property: any, options: toggle() }),
  singleControl('initial-object', { property: any, options: toggle(), formData: { value: SIZES[1] } }),
  singleControl('store-value', { property: string, options: toggle({ storeValue: true }) }),
  singleControl('initial-scalar', {
    property: string,
    options: toggle({ storeValue: true }),
    formData: { value: 'l' },
  }),
  singleControl('boolean-values', {
    property: { type: 'boolean' },
    options: toggle({ options: YES_NO, storeValue: true }),
    formData: { value: false },
  }),
  singleControl('scalar-options', {
    property: string,
    options: toggle({ options: ['Red', 'Green', 'Blue'], storeValue: true }),
  }),
  singleControl('values-alias', {
    property: string,
    options: { format: 'toggle', values: ['One', 'Two'], storeValue: true },
  }),
  singleControl('custom-keys', {
    property: string,
    options: toggle({
      options: [
        { name: 'Draft', code: 'D' },
        { name: 'Final', code: 'F' },
      ],
      labelKey: 'name',
      valueKey: 'code',
      storeValue: true,
    }),
  }),
  singleControl('not-clearable', {
    property: string,
    options: toggle({ storeValue: true, clearable: false }),
    formData: { value: 's' },
  }),
  singleControl('color', {
    property: string,
    options: toggle({ storeValue: true, color: 'secondary' }),
    formData: { value: 'm' },
  }),
  singleControl('size', { property: string, options: toggle({ storeValue: true, size: 'xs' }) }),
  singleControl('label', { property: string, options: toggle({ storeValue: true, label: 'Custom label' }) }),
  singleControl('schema-title', {
    property: { ...string, title: 'Schema title' },
    options: toggle({ storeValue: true }),
  }),
  singleControl('description', {
    property: { ...string, description: 'Pick one size' },
    options: toggle({ storeValue: true }),
  }),
  singleControl('hide-label', { property: string, options: toggle({ storeValue: true, hideLabel: true }) }),
  singleControl('width', { property: string, options: toggle({ storeValue: true, width: 'w-48' }) }),
  singleControl('colspan', { property: string, options: toggle({ storeValue: true, colspan: 6 }) }),
  singleControl('styles', {
    property: string,
    options: toggle({ storeValue: true, styles: { control: { label: 'fieldset-legend text-error' } } }),
  }),
  singleControl('required', {
    property: string,
    required: true,
    options: toggle({ storeValue: true }),
    formData: { value: 's' },
  }),
  singleControl('error-message', {
    property: string,
    required: true,
    options: toggle({ storeValue: true, errorMessage: 'Please pick a size' }),
    formData: { value: 's' },
  }),
  singleControl('readonly', {
    property: string,
    options: toggle({ storeValue: true, readonly: true }),
    formData: { value: 'm' },
  }),
  singleControl('form-readonly', {
    property: string,
    options: toggle({ storeValue: true }),
    formData: { value: 'm' },
    form: { readonly: true },
  }),
  singleControl('disabled', {
    property: string,
    options: toggle({ storeValue: true, disabled: true }),
    formData: { value: 'm' },
  }),
  multiControl(
    'disabled-when',
    { lock: string, value: string },
    { value: toggle({ storeValue: true, disabledWhen: { field: 'lock', exists: true } }) },
  ),
];
