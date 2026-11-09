import type { ControlElement, JsonSchema } from '@jsonforms/core';
import type { FieldContext } from 'vee-validate';
import { useField, useFormContext } from 'vee-validate';
import type { Ref } from 'vue';
import { computed, inject } from 'vue';

import type { ControlOption } from '@ghentcdh/crouton-core';

import { scopeToPath } from '../../../scope';
import type { UseInputOptions } from './useInput';
import { useInputProps } from './useInput';

/**
 * Safely call `useField`. When the form data shape doesn't match the schema
 * (e.g. a primitive at a path where an object is expected), vee-validate's
 * `setInPath` throws. This wrapper catches the error and returns a fallback
 * field so the component still mounts and the form stays visible.
 */
const safeUseField = (path: string, label: string): FieldContext<unknown> => {
  try {
    return useField<unknown>(() => path);
  } catch (e) {
    console.warn(
      `[${label}] useField("${path}") failed – data/schema mismatch (parent path is a primitive). Field renders with undefined value.`,
      e,
    );
    // Register under a non-colliding flat key so the component can mount.
    return useField<unknown>(
      `__broken__${path.replace(/[.[\]]/g, '_')}`,
    );
  }
};

export type useCustomProps = (
  uischema: ControlElement,
  schema: JsonSchema,
  field: FieldContext,
  options: any,
) => Ref<any>;

interface ResolvedControlOptions {
  useProps?: useCustomProps;
  setDefaultValue?: (field: FieldContext) => void;
  /** Name used in the data/schema-mismatch warning, e.g. `useReadonlyBinding`. */
  warningLabel?: string;
}

/**
 * Resolve the vee-validate field, input props and custom props for a control.
 * Shared by the editable (`useControlBinding`) and readonly
 * (`useReadonlyControlBinding`) paths so the path/custom-prop plumbing exists
 * exactly once.
 */
export const useResolvedControl = (
  uischema: ControlElement,
  schema: JsonSchema,
  options: UseInputOptions = {},
  {
    useProps,
    setDefaultValue,
    warningLabel = 'useControlBinding',
  }: ResolvedControlOptions = {},
) => {
  const { values: formValues } = useFormContext();
  const pathPrefix = inject<string>('pathPrefix', '');
  const scopePath = scopeToPath(uischema.scope);
  const path = pathPrefix ? `${pathPrefix}.${scopePath}` : scopePath;

  const field = safeUseField(path, warningLabel);
  setDefaultValue?.(field);
  const wrapper = useInputProps(uischema, schema, field, options);
  const customWrapper = useProps?.(uischema, schema, field, options) ?? {
    value: {},
  };

  return {
    formValues,
    field,
    path,
    wrapper: computed(() => ({ ...wrapper.value, ...customWrapper.value })),
    appliedOptions: computed(() => uischema.options ?? {}),
  };
};

export const useCustomControlBinding = <
  CONTROL_OPTION extends object = ControlOption,
>({
  useProps,
  setDefaultValue,
}: {
  useProps?: useCustomProps;
  additionalProps?: useCustomProps;
  setDefaultValue?: (field: FieldContext) => void;
} = {}) => {
  return (uischema: ControlElement, schema: JsonSchema, options = {}) => {
    const { formValues, field, wrapper } = useResolvedControl(
      uischema,
      schema,
      options,
      { useProps, setDefaultValue },
    );

    const onBlur = () => field.handleBlur(new Event('blur'));
    const onChange = () => field.handleChange(field.value.value);

    return {
      formValues,
      uischema,
      schema,
      wrapper,
      value: field.value,
      field,
      onBlur,
      onChange,
      // True while an async field validation (e.g. a unique check) is in flight.
      isValidating: computed(() => !!(field.meta as any)?.pending),
      appliedOptions: computed(
        () => (uischema.options ?? {}) as CONTROL_OPTION,
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
