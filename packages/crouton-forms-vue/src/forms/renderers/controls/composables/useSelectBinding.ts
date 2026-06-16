import type { ControlElement, JsonSchema } from '@jsonforms/core';
import type { FieldContext } from 'vee-validate';
import { computed } from 'vue';

import type { AutocompleteAllOptions, SelectOptions } from '@ghentcdh/crouton-core';

import { useCustomControlBinding } from './useControlBinding';

const loadDisplayValue = (options: SelectOptions, value: any) => {
  const values = options.values;
  if (!values) return value;
  const valueKey = options.valueKey as string;
  const id = value?.[valueKey] ?? value;
  const findValue = values.find((o: any) => o[valueKey] === id);

  return findValue;
};

const useSelectInput =
  (...fields: string[]) =>
  (uischema: ControlElement, schema: JsonSchema, field: FieldContext) => {
    const opts = (uischema.options ?? {}) as Record<string, any>;
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

export const useSelectBinding = useCustomControlBinding<SelectOptions>({
  useProps: useSelectInput(
    'options',
    'values',
    'uri',
    'resource',
    'dataField',
    'labelKey',
    'valueKey',
    'clearable',
    'storeValue',
  ),
});

export const useAutocompleteBinding =
  useCustomControlBinding<AutocompleteAllOptions>({
    useProps: useSelectInput(
      'options',
      'labelKey',
      'valueKey',
      'uri',
      'freeText',
      'enableCreate',
      'dataField',
      'skipAuth',
    ),
  });
