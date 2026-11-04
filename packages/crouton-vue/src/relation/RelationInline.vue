<template>
  <ReadonlyLabel :label="label" class="h-full">
    <div
      data-testid="relation-chip-list"
      class="flex gap-2"
      :class="{
        'flex-col': options.direction === 'column',
        'flex-row': options.direction === 'row',
      }"
    >
      <RelationButton
        v-for="value of values"
        :key="value.id"
        :value="value"
        :options="options"
        v-bind="operations"
      />
    </div>

    <div
      v-if="hasCreate && enableCreate"
      data-testid="relation-inline-add"
      class="flex flex-gap-2 items-center"
    >
      <Autocomplete
        v-if="fetchOptions"
        :model-value="newValue ?? undefined"
        :hide-label="true"
        :hide-errors="true"
        :fetch-options="fetchOptions.fetchOptions ?? undefined"
        :label-key="options.labelKey ?? options.displayKey"
        :value-key="options.valueKey ?? 'id'"
        :enable-create="fetchOptions.enableCreate"
        @change="onChange"
        @blur="onBlur"
        @create="onCreate"
      />
      <Btn
        :icon="IconEnum.Plus"
        size="xs"
        @click="create"
        :disabled="!newValue"
      >
        Add
      </Btn>
    </div>
  </ReadonlyLabel>
</template>
<script setup lang="ts">
import RelationButton from './RelationButton.vue';

import {
  ReadonlyLabel,
  useFetchOptions,
  useHttpClient,
} from '@ghentcdh/crouton-forms-vue';
import { JsonFormModalService } from '../forms';
import { Autocomplete, Btn, IconEnum } from '@ghentcdh/crouton-ui-vue';
import { computed, ref, useAttrs } from 'vue';
import { useCrouton } from '../composables/useCrouton';
import { computedAsync } from '../utils/computedAsync';
import { useResources } from '../resource';
import { RelationInlineProperties } from './RelationInline.properties';

const newValue = ref<string | null>(null);

const props = defineProps(RelationInlineProperties);

type RelationHandlers = {
  onCreate?: (value: unknown) => void;
  onView?: (value: unknown) => void;
  onEdit?: (value: unknown) => void;
  onDelete?: (value: unknown) => void;
};

const http = useHttpClient();
const crouton = useCrouton();
const formDef = computedAsync(() => {
  const uri = props.options.resourceUri
    ? `${props.options.resourceUri}/schemas`
    : props.options.resource;
  return crouton.getFormByUri(uri);
});
const detailDef = computedAsync(() => {
  const uri = props.options.autocompleteResource ?? props.options.resource;
  return crouton.getFormByUri(uri);
});
const detailResource = computed(() =>
  detailDef.value
    ? useResources(detailDef.value, { initialLoad: false, readonly: true })
    : null,
);
const attrs = useAttrs() as RelationHandlers;
// onView is handled in operations; attrs.onView presence drives the v-bind spread
const hasCreate = computed(() => 'onCreate' in attrs);
const hasEdit = computed(() => 'onEdit' in attrs);
const hasView = computed(() => 'onView' in attrs);
const hasDelete = computed(() => 'onDelete' in attrs);

const fetchOptions = computedAsync(() => {
  const resource = props.options.autocompleteResource ?? props.options.resource;
  // Extract the linked resource's id from each value. The filter appended to
  // the autocomplete URI always uses 'id' as the key (useResourceOptions default).
  // Simple values (e.g. language { id, name }) expose id directly. Junction-table
  // records (e.g. textAuthor { textId, authorId, author: { id } }) don't have a
  // top-level id, so fall back to the first nested object that carries 'id'.
  const runtimeExclude = props.values
    .map((item: any) => {
      if (typeof item !== 'object' || item === null) return item;
      if (item['id'] != null) return item['id'];
      for (const val of Object.values(item)) {
        if (typeof val === 'object' && val !== null && (val as any)['id'] != null)
          return (val as any)['id'];
      }
      return undefined;
    })
    .filter((v): v is unknown => v != null);

  return useFetchOptions(
    {
      format: 'autocomplete' as const,
      resource,
    },
    http,
    {},
    runtimeExclude,
  );
});

const operations = computed(() => {
  const ops: Record<string, (value: any) => void> = {};

  if (hasView.value) {
    ops['onView'] = (value) => attrs.onView!(value);
  } else {
    ops['onView'] = (value) => {
      const id = formDef.value?.idField;
      if (id) detailResource.value?.view(value[id]);
    };
  }

  if (hasDelete.value) {
    ops['onDelete'] = (value) => {
      attrs.onDelete!(value);
    };
  }
  if (hasEdit.value) {
    ops['onEdit'] = (value) => {
      attrs.onEdit!(value);
    };
  }
  // const resourceModal = resource.value?.resourceModal;
  // if (!resourceModal) return ops;
  // if (resource.value?.operations.delete) ops['onDelete'] = resourceModal.delete;
  return ops;
});

const create = () => {
  attrs.onCreate!(newValue.value);
  newValue.value = null;
};

const onCreate = () => {
  if (fetchOptions.value?.enableCreate === false) return;
  const form = fetchOptions.value!.form as any;
  if (form) {
    JsonFormModalService.openModal({
      schema: form.data,
      uiSchema: form.ui,
      modalTitle: `Create new ${props.label}`,
      http,
      onClose: (result) => {
        if (!result || !result.valid) return;
        form.create(result.data).then((res: any) => {
          newValue.value = res;
        });
      },
    });
    return;
  }
};

const onChange = (value: string | null) => {
  newValue.value = value;
};
const onBlur = (_e: Event) => {
  // no-op — value already committed via onChange
};
</script>
