import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { type FieldContext } from 'vee-validate';
import { type Component, computed, inject } from 'vue';

import { type ControlOption, ControlType } from '@ghentcdh/crouton-core';

import {
  type useCustomProps,
  useResolvedControl,
} from './useControlBinding';
import { type UseInputOptions } from './useInput';
import {
  isDateControl,
  isDateRangeControl,
  isIntegerFormat,
  isMarkdownControl,
  isNumberFormat,
} from '../../../../testers/tester';
import { resolveWithTime } from '../date/useDateModel';
import BooleanValue from '../readonly/displayValue/BooleanValue.vue';
import DateRangeValue from '../readonly/displayValue/DateRangeValue.vue';
import DateValue from '../readonly/displayValue/DateValue.vue';
import LinkValue from '../readonly/displayValue/LinkValue.vue';
import MarkdownValue from '../readonly/displayValue/MarkdownValue.vue';
import NotSetValue from '../readonly/displayValue/NotSetValue.vue';
import NumberValue from '../readonly/displayValue/NumberValue.vue';
import ObjectValue from '../readonly/displayValue/ObjectValue.vue';
import { default as StringValue } from '../readonly/displayValue/StringValue.vue';
import ViewDetailValue from '../readonly/displayValue/ViewDetailValue.vue';
import { isDate } from '../readonly/displayValue/formatDate';

type ReadonlyOpts = ControlOption & {
  directionField?: string;
  direction?: 'ltr' | 'rtl';
  dataPath?: string;
  key?: string;
  resource?: boolean | string | Record<string, unknown>;
  values?: Array<Record<string, unknown>>;
} & Record<string, unknown>;

export const isLink = (value: string) => value?.startsWith?.('http');

const getDirection = (options: ReadonlyOpts, formValues: Record<string, unknown>): 'ltr' | 'rtl' => {
  const pathPrefix = inject<string>('pathPrefix', '');
  const opts = options ?? {};
  if (!opts.directionField) return opts.direction ?? 'ltr';
  const key = pathPrefix
    ? `${pathPrefix}.${opts.directionField}`
    : opts.directionField;
  const val = key.split('.').reduce<unknown>(
    (o, k) => o !== null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined,
    formValues,
  );
  return (val as 'ltr' | 'rtl') ?? 'ltr';
};

const getSelectValue = (value: unknown, opts: ReadonlyOpts): unknown => {
  const labelKey = opts.labelKey ?? 'label';
  const valueKey = opts.valueKey ?? 'value';
  const resolvedKey =
    value !== null && typeof value === 'object'
      ? ((value as Record<string, unknown>)[valueKey] ?? value)
      : value;

  if (typeof resolvedKey === 'string' && opts.values)
    return (
      opts.values?.find((o) => o[valueKey] === resolvedKey)?.[labelKey] ??
      resolvedKey
    );

  const resolved =
    value && typeof value === 'object'
      ? ((value as Record<string, unknown>)[labelKey] ?? (value as Record<string, unknown>)[valueKey])
      : value;

  if (!resolved) return null;
  return resolved;
};

export const getNestedValue = (value: unknown, opts: ReadonlyOpts, formValues: Record<string, unknown>): unknown => {
  // Traverse the dotted dataPath in formValues (e.g. "bibliography" → formValues.bibliography)

  if (opts.dataPath) {
    // Traverse the dotted dataPath in formValues (e.g. "bibliography" → formValues.bibliography)
    const nested = opts.dataPath
      .split('.')
      .reduce<unknown>(
        (o, k) => o !== null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined,
        formValues,
      );
    if (opts.key && nested && typeof nested === 'object')
      return (nested as Record<string, unknown>)[opts.key] ?? null;
    return nested ?? null;
  }
  if (value !== null && typeof value === 'object' && opts.key) {
    return (value as Record<string, unknown>)[opts.key] ?? null;
  }
  return value ?? null;
};

const getDisplayValue = (value: unknown, formValues: Record<string, unknown>, opts: ReadonlyOpts): unknown => {
  const format = opts.format ?? 'date';

  if (format === 'select') return getSelectValue(value, opts);
  if (format === 'autocomplete') return getSelectValue(value, opts);

  if (typeof value !== 'object') {
    return value ?? null;
  }
  return getNestedValue(value, opts, formValues);
};

export const getDisplayComponent = (value: unknown, options: ReadonlyOpts): Component => {
  const format = options.format;
  switch (format) {
    case 'date-range':
      return DateRangeValue as Component;
    case ControlType.number:
    case ControlType.integer:
      return NumberValue as Component;
  }

  if (value === null || value === undefined) return NotSetValue as Component;
  if (options.resource) return ViewDetailValue as Component;

  if (typeof value === 'string') {
    if (isDate(value)) return DateValue as Component;
    if (isLink(value)) return LinkValue as Component;
  }
  if (typeof value === 'boolean') return BooleanValue as Component;
  if (typeof value === 'object') return ObjectValue as Component;

  return StringValue as Component;
};

const _getComponent = (
  value: unknown,
  options: ReadonlyOpts,
  schema: JsonSchema,
  uiSchema: ControlElement,
): Component => {
  if (isDateRangeControl(uiSchema, schema)) return DateRangeValue as Component;
  // Ahead of getDisplayComponent's isDate(value) sniffing, which false-positives
  // on any string Date can parse (e.g. "2026 edition" -> a date).
  if (value !== null && value !== undefined && isDateControl(uiSchema, schema))
    return DateValue as Component;
  if (isNumberFormat(uiSchema, schema)) return NumberValue as Component;
  if (isIntegerFormat(uiSchema, schema)) return NumberValue as Component;
  if (isMarkdownControl(uiSchema, schema)) return MarkdownValue as Component;

  return getDisplayComponent(value, options);
};

const getComponent = (
  path: string,
  uischema: ControlElement,
  schema: JsonSchema,
  field: FieldContext,
  formValues: Record<string, unknown>,
) => {
  return computed(() => {
    const value: unknown = field.value?.value;

    const options = (uischema.options ?? {}) as ReadonlyOpts;
    const displayValue = getDisplayValue(value, formValues, options);

    return {
      component: _getComponent(value, options, schema, uischema),
      value: {
        value,
        path,
        displayValue,
        // withTime lets DateValue drop the ", 00:00" for day-only fields.
        options: { ...options, withTime: resolveWithTime(options as Record<string, unknown>, schema as Record<string, unknown>) },
        direction: getDirection(options, formValues),
      },
    };
  });
};

const useCustomReadonlyControlBinding = <
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
    const { formValues, field, path, wrapper } = useResolvedControl(
      uischema,
      schema,
      options,
      { useProps, setDefaultValue, warningLabel: 'useReadonlyBinding' },
    );

    return {
      wrapper,
      appliedOptions: computed(
        () => uischema.options ?? ({} as CONTROL_OPTION),
      ),
      displayWrapper: getComponent(path, uischema, schema, field, formValues as Record<string, unknown>),
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
