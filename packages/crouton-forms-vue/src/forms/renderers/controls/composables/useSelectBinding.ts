import type { ControlElement, JsonSchema } from '@jsonforms/core';
import type { FieldContext } from 'vee-validate';
import { computed } from 'vue';

import type { AutocompleteAllOptions, SelectOptions } from '@ghentcdh/crouton-core';

import { useCustomControlBinding } from './useControlBinding';

const loadDisplayValue = (options: SelectOptions, value: unknown) => {
  const values = options.values;
  if (!values) return value;
  const valueKey = options.valueKey as string;
  const id = (value as Record<string, unknown>)?.[valueKey] ?? value;
  const findValue = values.find((o) => (o as Record<string, unknown>)[valueKey] === id);

  return findValue;
};

const useSelectInput =
  (...fields: string[]) =>
  (uischema: ControlElement, schema: JsonSchema, field: FieldContext) => {
    const opts = (uischema.options ?? {}) as Record<string, unknown>;
    return computed(() => {
      const options = Object.fromEntries(
        fields.filter((f) => f in opts).map((f) => [f, opts[f]]),
      );

      if (!options.labelKey) options.labelKey = 'label';
      if (!options.valueKey) options.valueKey = 'value';

      options.displayValue = loadDisplayValue(
        options as SelectOptions,
        field.value.value,
      );

      return options;
    });
  };

/** @internal test seam — drift tests assert against these key lists. */
export const SELECT_OPTION_KEYS = [
  'options',
  'values',
  'uri',
  'resource',
  'dataField',
  'labelKey',
  'valueKey',
  'clearable',
  'storeValue',
] as const;

/** @internal test seam — drift tests assert against these key lists. */
export const AUTOCOMPLETE_OPTION_KEYS = [
  'options',
  'labelKey',
  'valueKey',
  'uri',
  'freeText',
  'enableCreate',
  'dataField',
  'skipAuth',
] as const;

export const useSelectBinding = useCustomControlBinding<SelectOptions>({
  useProps: useSelectInput(...SELECT_OPTION_KEYS),
});

export const useAutocompleteBinding =
  useCustomControlBinding<AutocompleteAllOptions>({
    useProps: useSelectInput(...AUTOCOMPLETE_OPTION_KEYS),
  });
