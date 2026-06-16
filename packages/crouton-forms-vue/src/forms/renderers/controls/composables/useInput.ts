import type { ControlElement, JsonSchema } from '@jsonforms/core';
import type { FieldContext } from 'vee-validate';
import { computed, inject, ref } from 'vue';

import { type MyStyles, mergeStyles } from '@ghentcdh/ui';

import { formatError } from '../../../errorMessages';
import { ERROR_MODE_KEY, FORM_READONLY_KEY, FORM_SUBMITTED_KEY } from '../../../errorMode';
import { resolveSchema, scopeToPath } from '../../../scope';

export interface InputProps {
  id: string;
  placeholder?: string;
  description?: string;
  errors?: string;
  label: string;
  visible: boolean;
  required: boolean;
  enabled: boolean;
  isFocused: boolean;
  isTouched: boolean;
  hideLabel: boolean;
  styles: MyStyles;
  width: string;
  type: string;
}

export interface UseInputOptions {
  overrides?: Partial<InputProps>;
  defaultType?: string;
}

// Given "#/properties/foo/properties/bar", get the parent schema ("#/properties/foo")
// and check if "bar" is in its required array.
const checkRequired = (
  rootSchema: JsonSchema,
  scope: string,
  fieldName: string,
): boolean => {
  const segments = scope.replace(/^#\//, '').split('/');
  // Remove last two segments ("properties" + fieldName) to get parent path
  const parentSegments = segments.slice(0, -2);
  if (parentSegments.length === 0) {
    // Field is at root level — check root schema's required
    const req = (rootSchema as any)?.required;
    return Array.isArray(req) && req.includes(fieldName);
  }
  const parentScope = `#/${parentSegments.join('/')}`;
  const parentSchema = resolveSchema(rootSchema, parentScope);
  const req = (parentSchema as any)?.required;
  return Array.isArray(req) && req.includes(fieldName);
};

export const useInputProps = (
  uischema: ControlElement,
  schema: JsonSchema,
  field: FieldContext,
  options: UseInputOptions = {},
) => {
  const rootSchema = inject<JsonSchema>('rootSchema');
  const path = scopeToPath(uischema.scope);
  const { errorMessage, meta } = field;

  const opts = (uischema.options ?? {}) as Record<string, any>;
  const labelFromScope = path.split('.').pop() ?? '';

  const isRequired = rootSchema
    ? checkRequired(rootSchema, uischema.scope, labelFromScope)
    : false;

  const s = (schema ?? {}) as Record<string, any>;

  const inferredType = (() => {
    if (opts.format === 'text') return 'text';
    if (s.format === 'email') return 'email';
    if (s.format === 'uri') return 'url';
    if (s.type === 'number' || s.type === 'integer') return 'number';
    return options.defaultType ?? 'text';
  })();

  const styles = mergeStyles(opts.styles) as any;

  const errorMode = inject(ERROR_MODE_KEY, ref('onBlur'));
  const submitted = inject(FORM_SUBMITTED_KEY, ref(false));
  const formReadonly = inject(FORM_READONLY_KEY, ref(false));

  const shouldShowError = computed(() => {
    if (!errorMessage.value) return false;
    switch (errorMode.value) {
      case 'always':
        return true;
      case 'onChange':
        return meta.dirty;
      case 'onSubmit':
        return submitted.value;
      case 'onBlur':
      default:
        return meta.touched;
    }
  });

  const width =
    opts.colspan || styles?.width === 'full'
      ? 'w-full'
      : (opts.width ?? 'min-w-input');

  return computed<InputProps>(() => ({
    id: path,
    placeholder: opts.placeholder,
    description: s.description,
    errors: shouldShowError.value
      ? (opts.errorMessage ?? formatError(errorMessage.value))
      : undefined,
    label:
      opts.label ??
      labelFromScope.charAt(0).toUpperCase() + labelFromScope.slice(1),
    visible: opts.visible ?? true,
    required: isRequired,
    enabled: opts.readonly !== true && !formReadonly.value,
    isFocused: false,
    isTouched: shouldShowError.value,
    hideLabel: opts.hideLabel ?? false,
    styles: styles,
    width,
    type: inferredType,
    ...options.overrides,
  }));
};
