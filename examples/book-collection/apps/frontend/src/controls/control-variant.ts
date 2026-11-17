/**
 * One isolated form on the /controls/:control test page.
 * `id` becomes the `data-testid` of the section, so e2e tests can target it.
 */
export type ControlVariant = {
  id: string;
  title: string;
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

const control = (scope: string, options: Record<string, unknown> = {}) => ({
  type: 'Control',
  scope: `#/properties/${scope}`,
  options,
});

/** Variant with a single `value` property rendered by one control. */
export const singleControl = (
  id: string,
  title: string,
  {
    property = { type: 'string' },
    options = {},
    required = false,
    formData,
  }: {
    property?: Record<string, unknown>;
    options?: Record<string, unknown>;
    required?: boolean;
    formData?: Record<string, unknown>;
  } = {},
): ControlVariant => ({
  id,
  title,
  schema: {
    type: 'object',
    properties: { value: property },
    ...(required ? { required: ['value'] } : {}),
  },
  uiSchema: { type: 'VerticalLayout', elements: [control('value', options)] },
  formData,
});

/** Variant with several controls, for options that depend on another field. */
export const multiControl = (
  id: string,
  title: string,
  properties: Record<string, Record<string, unknown>>,
  options: Record<string, Record<string, unknown>> = {},
): ControlVariant => ({
  id,
  title,
  schema: { type: 'object', properties },
  uiSchema: {
    type: 'VerticalLayout',
    elements: Object.keys(properties).map((key) => control(key, options[key])),
  },
});
