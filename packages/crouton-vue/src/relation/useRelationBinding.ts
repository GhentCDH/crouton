import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { type ComputedRef, type Ref, computed } from 'vue';

import {
  type FormEvents,
  useControlBinding,
  useFormEvents,
} from '@ghentcdh/crouton-forms-vue';

import { useCrouton } from '../composables/useCrouton';
import { type UseResource, useResources } from '../resource';
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
  formEvents: FormEvents,
  sort?: string,
  sortDir?: 'asc' | 'desc',
) => {
  const crouton = useCrouton();
  const config = await crouton.getFormByUri(resource);

  if (!config) return null;

  const handleEvent = (event: string, data: any) => {
    if (!formEvents) if (event !== 'close') return;
    if (!data || Object.keys(data).length === 0) return;

    formEvents.dispatch({
      event: 'update-relation',
      type: resource,
      data,
    });
  };

  return useResources(config, {
    defaultUriParams: { parent: formValues },
    readonly,
    handleEvent,
    initialLoad: false,
    ...(sort && { initialRequestParams: { sort, sortDir: sortDir ?? 'asc' } }),
  });
};

export const useRelationBinding = (
  uischema: ControlElement,
  schema: JsonSchema,
  readonly = false,
): Record<string, any> & {
  isInline: boolean;
  isNew: ComputedRef<boolean>;
  message: string | null;
  resource: Ref<UseResource | null | undefined>;
  appliedOptions: ComputedRef<Record<string, any>>;
} => {
  const formEvents = useFormEvents();
  const bindings = useControlBinding(uischema, schema);
  const { formValues } = bindings;
  const opts = (uischema.options ?? {}) as Record<string, any>;
  const isInline = inlineTypes.includes(opts.relationType);

  const isNew = computed(
    () => !formValues || Object.keys(formValues).length === 0 || !formValues.id,
  );
  const resource = opts.resource as string;
  const sort = opts.sort as string | undefined;
  const sortDir = (opts.sortDir ?? 'asc') as 'asc' | 'desc';

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
      getRelationResource(resource, bindings.formValues, readonly, formEvents, sort, sortDir),
    ),
  };
};
