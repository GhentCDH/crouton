import type { ControlElement, JsonSchema } from '@jsonforms/core';
import type { FieldContext } from 'vee-validate';
import { useFormContext } from 'vee-validate';
import { computed, inject, ref } from 'vue';

import { evaluateWhen } from '@ghentcdh/crouton-core';
import { type MyStyles, mergeStyles, useUiTranslator } from '@ghentcdh/crouton-ui-vue';

import { formatError } from '../../../errorMessages';
import {
  ERROR_MODE_KEY,
  FORM_READONLY_KEY,
  FORM_SUBMITTED_KEY,
} from '../../../errorMode';
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
    const req = (rootSchema as Record<string, unknown>)?.['required'];
    return Array.isArray(req) && req.includes(fieldName);
  }
  const parentScope = `#/${parentSegments.join('/')}`;
  const parentSchema = resolveSchema(rootSchema, parentScope);
  const req = (parentSchema as Record<string, unknown>)?.['required'];
  return Array.isArray(req) && req.includes(fieldName);
};

const localizeError = (
  msg: string | undefined,
  t: (key: string, fallback: string) => string,
): string | undefined => {
  if (!msg) return undefined;
  if (msg === 'This field is required') return t('validation.required', msg);
  return msg;
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

  const opts = (uischema.options ?? {}) as Record<string, unknown>;
  const labelFromScope = path.split('.').pop() ?? '';

  const isRequired = rootSchema
    ? checkRequired(rootSchema, uischema.scope, labelFromScope)
    : false;

  const s = (schema ?? {}) as Record<string, unknown>;

  const inferredType = (() => {
    if (opts['format'] === 'text') return 'text';
    if (s['format'] === 'email') return 'email';
    if (s['format'] === 'uri') return 'url';
    if (s['type'] === 'number' || s['type'] === 'integer') return 'number';
    return options.defaultType ?? 'text';
  })();

  const styles = mergeStyles(opts['styles'] as Parameters<typeof mergeStyles>[0]) as MyStyles;
  const t = useUiTranslator();

  const errorMode = inject(ERROR_MODE_KEY, ref('onBlur'));
  const submitted = inject(FORM_SUBMITTED_KEY, ref(false));
  const formReadonly = inject(FORM_READONLY_KEY, ref(false));
  const pathPrefix = inject<string>('pathPrefix', '');
  const { values: formValues } = useFormContext();

  const conditionallyDisabled = computed(() => {
    if (!opts['disabledWhen']) return false;
    const fv = formValues as Record<string, unknown>;
    const scopedValues = (pathPrefix && fv[pathPrefix])
      ? fv[pathPrefix] as Record<string, unknown>
      : fv;
    return evaluateWhen(opts['disabledWhen'] as Parameters<typeof evaluateWhen>[0], scopedValues);
  });

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
        // Show when the user has blurred the field OR when they've already changed
        // it (dirty) — this covers auto-save flows where blur never fires.
        return meta.touched || meta.dirty;
    }
  });

  const width =
    opts['colspan'] || (styles as Record<string, unknown>)?.['width'] === 'full'
      ? 'w-full'
      : ((opts['width'] as string | undefined) ?? 'min-w-input');

  return computed<InputProps>(() => ({
    id: path,
    placeholder: opts['placeholder'] as string | undefined,
    description: s['description'] as string | undefined,
    errors: shouldShowError.value
      ? ((opts['errorMessage'] as string | undefined) ?? localizeError(formatError(errorMessage.value), t))
      : undefined,
    label:
      (opts['label'] as string | undefined) ??
      (s['title'] as string | undefined) ??
      labelFromScope.charAt(0).toUpperCase() + labelFromScope.slice(1),
    visible: (opts['visible'] as boolean | undefined) ?? true,
    required: isRequired,
    enabled: opts['readonly'] !== true && opts['disabled'] !== true && !conditionallyDisabled.value && !formReadonly.value,
    isFocused: false,
    isTouched: shouldShowError.value,
    hideLabel: (opts['hideLabel'] as boolean | undefined) ?? false,
    styles: styles,
    width,
    type: inferredType,
    ...options.overrides,
  }));
};
