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

    <div v-if="hasCreate" class="flex flex-gap-2 items-center">
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

import { JsonFormModalService, ReadonlyLabel, useFetchOptions, useHttpClient } from '@ghentcdh/crouton-forms-vue';
import { Autocomplete, Btn } from '@ghentcdh/ui';
import { computed, ref, useAttrs } from 'vue';
import { useCrouton } from '../composables/useCrouton';
import { computedAsync } from '../utils/computedAsync';
import { useResources } from '../resource';

const newValue = ref<string>(null);

const props = defineProps<{
  options: any;
  labelKey: string;
  label: string;
  valueKey: string;
  values: any[];
}>();

type RelationHandlers = {
  onCreate?: (value: unknown) => void;
  onView?: (value: unknown) => void;
  onEdit?: (value: unknown) => void;
  onDelete?: (value: unknown) => void;
};

const http = useHttpClient();
const crouton = useCrouton();
const formDef = computedAsync(() =>
  crouton.getFormByUri(props.options.resource),
);
const resource = computed(() =>
  formDef.value ? useResources(formDef.value, { initialLoad: false }) : null,
);
const attrs = useAttrs() as RelationHandlers;
const hasView = computed(() => 'onView' in attrs);
const hasCreate = computed(() => 'onCreate' in attrs);
const hasEdit = computed(() => 'onEdit' in attrs);
const hasDelete = computed(() => 'onDelete' in attrs);

const fetchOptions = computedAsync(() => {
  const _resource =
    props.options.autocompleteResource ?? props.options.resource;
  const def = formDef.value;
  const res = resource.value;
  console.log(_resource);

  if (!def || !res) return null;

  console.table(def);
  return useFetchOptions(
    {
      resource: `${def.id}/schemas`,
    },
    http,
    {},
  );
});

const operations = computed(() => {
  const ops: Record<string, (value: any) => void> = {
    onView: (value) => {
      resource.value?.resourceModal.view(value.value);
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
