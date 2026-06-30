<template>
  <ReadonlyLabel :label="label" class="h-full">
    <div
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

    <div v-if="hasCreate && enableCreate" class="flex flex-gap-2 items-center">
      <Autocomplete
        v-if="fetchOptions"
        :model-value="newValue"
        :hide-label="true"
        :hide-errors="true"
        :fetch-options="fetchOptions.fetchOptions"
        :label-key="options.labelKey"
        :value-key="options.valueKey"
        :enable-create="fetchOptions.enableCreate"
        @change="onChange"
        @blur="onBlur"
        @create="onCreate"
      />
      <Btn icon="Plus" size="xs" @click="create" :disabled="!newValue">
        Add
      </Btn>
    </div>
  </ReadonlyLabel>
</template>
<script setup lang="ts">
import RelationButton from './RelationButton.vue';

import {
  JsonFormModalService,
  ReadonlyLabel,
  useFetchOptions,
  useHttpClient,
} from '@ghentcdh/crouton-forms-vue';
import { Autocomplete, Btn } from '@ghentcdh/ui';
import { computed, ref, useAttrs } from 'vue';
import { useCrouton } from '../composables/useCrouton';
import { computedAsync } from '../utils/computedAsync';
import { useResources } from '../resource';
import { RelationInlineProperties } from './RelationInline.properties';

const newValue = ref<string>(null);

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
const hasView = computed(() => 'onView' in attrs);
const hasCreate = computed(() => 'onCreate' in attrs);
const hasEdit = computed(() => 'onEdit' in attrs);
const hasDelete = computed(() => 'onDelete' in attrs);

const fetchOptions = computedAsync(() => {
  const resource = props.options.autocompleteResource ?? props.options.resource;
  return useFetchOptions(
    {
      resource,
    },
    http,
    {},
  );
});

const operations = computed(() => {
  const ops: Record<string, (value: any) => void> = {
    onView: (value) => {
      const id = formDef.value?.idField;
      detailResource.value?.view(value[id]);
    },
  };

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
      schema: form.json_schema,
      uiSchema: form.ui_schema,
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

const onChange = (value) => {
  newValue.value = value;
};
const onBlur = (value) => {
  newValue.value = value;
};
</script>
