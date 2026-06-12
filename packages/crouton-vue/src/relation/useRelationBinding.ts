import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import { useControlBinding } from '@ghentcdh/json-forms-vue';

import { useCrouton } from '../composables/useCrouton';
import { useResources } from '../resource';
import { computedAsync } from '../utils/computedAsync';

const inlineTypes = ['manyToOne', 'oneToOne'] as const;

const getMessage = (isNew: boolean, schemasUri: string) => {
  if (!schemasUri) return 'No schemasUri configured for this relation.';
  return null;
};

const getRelationResource = async (
  schemasUri: string,
  formValues: any,
  readonly: boolean,
) => {
  const crouton = useCrouton();
  const config = await crouton.getFormByUri(schemasUri);

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
  const schemasUri = opts.schemasUri ?? opts.resource;

  return {
    ...bindings,
    isInline,
    isNew,
    schemasUri,
    message: getMessage(isNew.value, schemasUri),
    resource: computedAsync(() =>
      getRelationResource(schemasUri, bindings.formValues, readonly),
    ),
  };
};
