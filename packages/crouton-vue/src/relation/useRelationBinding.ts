import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import { useControlBinding } from '@ghentcdh/crouton-forms-vue';

import { useCrouton } from '../composables/useCrouton';
import { useResources } from '../resource';
import { computedAsync } from '../utils/computedAsync';

const inlineTypes = ['manyToOne', 'oneToOne'] as const;

const getMessage = (isNew: boolean, resource: string) => {
  if (!resource) return 'No resource configured for this relation.';
  return null;
};

const getRelationResource = async (
  resource: string,
  formValues: any,
  readonly: boolean,
) => {
  const crouton = useCrouton();
  const config = await crouton.getFormByUri(resource);

  if (!config) return null;

  return useResources(config, {
    defaultUriParams: { parent: formValues },
    readonly,
  });
};

export const useRelationBinding = (
  uischema: ControlElement,
  schema: JsonSchema,
  readonly = false,
) => {
  const bindings = useControlBinding(uischema, schema);
  const { formValues } = bindings;
  const opts = (uischema.options ?? {}) as Record<string, any>;
  const isInline = inlineTypes.includes(opts.relationType);

  const isNew = computed(
    () => !formValues || Object.keys(formValues).length === 0 || !formValues.id,
  );
  const resource = opts.resource as string;

  return {
    ...bindings,
    // jsonforms options are an open bag; expose them loosely for relation renderers
    appliedOptions: computed(
      () => (bindings.appliedOptions.value ?? {}) as Record<string, any>,
    ),
    isInline,
    isNew,
    message: getMessage(isNew.value, resource),
    resource: computedAsync(() =>
      getRelationResource(resource, bindings.formValues, readonly),
    ),
  };
};
