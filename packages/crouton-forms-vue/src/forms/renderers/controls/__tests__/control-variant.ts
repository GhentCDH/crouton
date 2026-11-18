import type { ErrorMode } from '../../../errorMode';

/** One isolated form used by a control's browser spec and its screenshots. */
export type ControlVariant = {
  id: string;
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  formData?: Record<string, unknown>;
  form?: { errorMode?: ErrorMode; readonly?: boolean; optionalPropertiesNullable?: boolean };
};

type Options = Record<string, unknown>;

const control = (scope: string, options: Options = {}) => ({
  type: 'Control',
  scope,
  options,
});

/** Variant with a single `value` property rendered by one control. */
export const singleControl = (
  id: string,
  {
    property = { type: 'string' },
    options = {},
    required = false,
    formData,
    form,
  }: {
    property?: Record<string, unknown>;
    options?: Options;
    required?: boolean;
    formData?: Record<string, unknown>;
    form?: ControlVariant['form'];
  } = {},
): ControlVariant => ({
  id,
  schema: {
    type: 'object',
    properties: { value: property },
    ...(required ? { required: ['value'] } : {}),
  },
  uiSchema: { type: 'VerticalLayout', elements: [control('#/properties/value', options)] },
  formData,
  form,
});

/** Variant with several top-level controls, for options that depend on another field. */
export const multiControl = (
  id: string,
  properties: Record<string, Record<string, unknown>>,
  options: Record<string, Options> = {},
): ControlVariant => ({
  id,
  schema: { type: 'object', properties },
  uiSchema: {
    type: 'VerticalLayout',
    elements: Object.keys(properties).map((key) => control(`#/properties/${key}`, options[key])),
  },
});

/** Variant with a control bound to a nested object path (`#/properties/<parent>/properties/<child>`). */
export const nestedControl = (
  id: string,
  parent: string,
  child: string,
  property: Record<string, unknown> = { type: 'string' },
): ControlVariant => ({
  id,
  schema: {
    type: 'object',
    properties: { [parent]: { type: 'object', properties: { [child]: property } } },
  },
  uiSchema: {
    type: 'VerticalLayout',
    elements: [control(`#/properties/${parent}/properties/${child}`)],
  },
});

/** Every option key a list of variants exercises, for option-coverage checks. */
export const usedOptionKeys = (variants: ControlVariant[]): Set<string> => {
  const keys = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const { options, elements } = node as { options?: Options; elements?: unknown[] };
    Object.keys(options ?? {}).forEach((k) => keys.add(k));
    elements?.forEach(visit);
  };
  variants.forEach((v) => visit(v.uiSchema));
  return keys;
};
