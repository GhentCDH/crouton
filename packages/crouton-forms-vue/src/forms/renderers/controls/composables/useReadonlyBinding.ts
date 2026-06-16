import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { type FieldContext, useField, useFormContext } from 'vee-validate';
import { computed, inject } from 'vue';

import { type ControlOption } from '@ghentcdh/crouton-core';

import { type useCustomProps } from './useControlBinding';
import { type UseInputOptions, useInputProps } from './useInput';
import { isIntegerFormat, isMarkdownControl, isNumberFormat } from '../../../../testers/tester';
import { scopeToPath } from '../../../scope';
import BooleanValue from '../readonly/displayValue/BooleanValue.vue';
import DateValue from '../readonly/displayValue/DateValue.vue';
import LinkValue from '../readonly/displayValue/LinkValue.vue';
import MarkdownValue from '../readonly/displayValue/MarkdownValue.vue';
import NotSetValue from '../readonly/displayValue/NotSetValue.vue';
import NumberValue from '../readonly/displayValue/NumberValue.vue';
import ObjectValue from '../readonly/displayValue/ObjectValue.vue';
import { default as StringValue } from '../readonly/displayValue/StringValue.vue';
import ViewDetailValue from '../readonly/displayValue/ViewDetailValue.vue';
import { isDate } from '../readonly/displayValue/formatDate';

export const isLink = (value: string) => value?.startsWith?.('http');

const getDirection = (options: any, formValues: any) => {
  const pathPrefix = inject<string>('pathPrefix', '');
  const opts = options ?? {};
  if (!opts.directionField) return (opts.direction as 'ltr' | 'rtl') ?? 'ltr';
  const key = pathPrefix
    ? `${pathPrefix}.${opts.directionField}`
    : opts.directionField;
  const val = key.split('.').reduce((o: any, k: string) => o?.[k], formValues);
  return (val as 'ltr' | 'rtl') ?? 'ltr';
};

const getSelectValue = (value: any, opts: any) => {
  const labelKey = opts.labelKey ?? 'label';
  const valueKey = opts.valueKey ?? 'value';
  const resolvedKey = value?.[valueKey] ?? value;

  if (typeof resolvedKey === 'string' && opts.values)
    return (
      opts.values?.find((o: any) => o[valueKey] === resolvedKey)?.[labelKey] ??
      resolvedKey
    );

  const resolved =
    value && typeof value === 'object'
      ? (value?.[labelKey] ?? value[valueKey])
      : value;

  if (!resolved) return null;
  return resolved;
};

export const getNestedValue = (value: any, opts: any, formValues: any) => {
  // Traverse the dotted dataPath in formValues (e.g. "bibliography" → formValues.bibliography)

  if (opts.dataPath) {
    // Traverse the dotted dataPath in formValues (e.g. "bibliography" → formValues.bibliography)
    const nested = opts.dataPath
      .split('.')
      .reduce((o: any, k: string) => o?.[k], formValues);
    if (opts.key && nested && typeof nested === 'object')
      return (nested as any)[opts.key] ?? null;
    return nested ?? null;
  }
  if (value !== null && typeof value === 'object' && opts.key) {
    return (value as any)[opts.key] ?? null;
  }
  return value ?? null;
};

const getDisplayValue = (value: any, formValues: any, opts: any) => {
  const format = opts.format ?? 'date';

  if (format === 'select') return getSelectValue(value, opts);
  if (format === 'autocomplete') return getSelectValue(value, opts);

  if (typeof value !== 'object') {
    return value ?? null;
  }
  return getNestedValue(value, opts, formValues);
};

const _getComponent = (value: any, options: any, schema: any, uiSchema: any) => {
  if (isNumberFormat(uiSchema, schema)) return NumberValue;
  if (isIntegerFormat(uiSchema, schema)) return NumberValue;
  if (isMarkdownControl(uiSchema, schema)) return MarkdownValue;
  if (value === null || value === undefined) return NotSetValue;
  if (options.resource) return ViewDetailValue;
  if (isDate(value)) return DateValue;
  if (isLink(value)) return LinkValue;
  if (typeof value === 'boolean') return BooleanValue;
  if (typeof value === 'object') return ObjectValue;

  return StringValue;
};

const getComponent = (
  path: string,
  uischema: ControlElement,
  schema: JsonSchema,
  field: FieldContext,
  formValues: any,
) => {
  return computed(() => {
    const value = field.value?.value;

    const options = uischema.options ?? {};
    const displayValue = getDisplayValue(value, formValues, options);

    return {
      component: _getComponent(value, options, schema, uischema),
      value: {
        value,
        path,
        displayValue,
        options,
        direction: getDirection(options, formValues),
      },
    };
  });
};

export const useCustomReadonlyControlBinding = <
  CONTROL_OPTION extends ControlOption = ControlOption,
>({
  useProps,
  setDefaultValue,
}: {
  useProps?: useCustomProps;
  additionalProps?: useCustomProps;
  setDefaultValue?: (field: FieldContext) => void;
} = {}) => {
  return (uischema: ControlElement, schema: JsonSchema, options = {}) => {
    const { values: formValues } = useFormContext();
    const pathPrefix = inject<string>('pathPrefix', '');
    const scopePath = scopeToPath(uischema.scope);
    const path = pathPrefix ? `${pathPrefix}.${scopePath}` : scopePath;
    const field = useField<unknown>(() => path);
    const wrapper = useInputProps(uischema, schema, field, options);
    const customWrapper = useProps?.(uischema, schema, field, options) ?? {
      value: {},
    };

    return {
      wrapper: computed(() => ({ ...wrapper.value, ...customWrapper.value })),
      appliedOptions: computed(
        () => uischema.options ?? ({} as CONTROL_OPTION),
      ),
      displayWrapper: getComponent(path, uischema, schema, field, formValues),
    };
  };
};

export const useReadonlyControlBinding = (
  uischema: ControlElement,
  schema: JsonSchema,
  options: UseInputOptions = {},
) => {
  return useCustomReadonlyControlBinding()(uischema, schema, options);
};
