import type { ControlElement, JsonSchema } from '@jsonforms/core';
import type { FieldContext } from 'vee-validate';
import { useField, useFormContext } from 'vee-validate';
import type { Ref } from 'vue';
import { computed, inject } from 'vue';

import type { ControlOption } from '@ghentcdh/crouton-core';

import type { UseInputOptions } from './useInput';
import { useInputProps } from './useInput';
import { scopeToPath } from '../../../scope';

export type useCustomProps = (
  uischema: ControlElement,
  schema: JsonSchema,
  field: FieldContext,
  options: any,
) => Ref<any>;

export const useCustomControlBinding = <
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
    setDefaultValue?.(field);
    const wrapper = useInputProps(uischema, schema, field, options);
    const customWrapper = useProps?.(uischema, schema, field, options) ?? {
      value: {},
    };

    const onBlur = () => field.handleBlur(new Event('blur'));
    const onChange = () => field.handleChange(field.value.value);

    return {
      formValues,
      uischema,
      schema,
      wrapper: computed(() => ({ ...wrapper.value, ...customWrapper.value })),
      value: field.value,
      field,
      onBlur,
      onChange,
      appliedOptions: computed(
        () => uischema.options ?? ({} as CONTROL_OPTION),
      ),
    };
  };
};

export const useControlBinding = (
  uischema: ControlElement,
  schema: JsonSchema,
  options: UseInputOptions = {},
) => {
  return useCustomControlBinding()(uischema, schema, options);
};
