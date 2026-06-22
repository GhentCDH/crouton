<script setup lang="ts">
import { computed, shallowRef, toRaw, watch } from 'vue';

import { TableComponent, TableToolbar } from '@ghentcdh/crouton-forms-vue';
import { computedAsync } from '../utils/computedAsync';
import { useCrouton } from '../composables/useCrouton';

import { Btn, IconEnum } from '@ghentcdh/ui';
import { useResources } from './useResources';
import { Request } from '../utils/request';

const crouton = useCrouton();

const props = defineProps({
  formId: { type: String },
  initialRequestParams: { type: Object, default: {} },
});

const id = computed(() => `${props.formId}_${Date.now()}`);

const config = computedAsync(() => crouton.getFormDef(props.formId as string));

const emits = defineEmits(['handleEvent', 'onRequest', 'initialLoad']);
const handleEvent = (event: string, data: any) => {
  emits('handleEvent', { event, data });
};

const onRequest = (requestData: Request) => emits('onRequest', { requestData });

const resource = shallowRef(
  useResources(config.value, {
    initialRequestParams: { ...toRaw(props.initialRequestParams) },
    onRequest,
    handleEvent,
  }),
);

watch(
  () => config.value,
  (newConfig) => {
    resource.value = newConfig
      ? useResources(config.value, {
          initialRequestParams: { ...toRaw(props.initialRequestParams) },
          onRequest,
          handleEvent,
        })
      : null;
  },
);

watch(
  () => resource.value,
  () => {
    if (!resource.value) return;

    emits('initialLoad', resource.value);
  },
  { once: true },
);

const form = computed(() => resource.value?.form);
</script>

<template>
  <div v-if="form">
    <component
      :is="form.component"
      v-bind="form.config"
      @close-modal="resource.closeForm"
    >
      <template #content-after>
        <template v-if="form.customComponent">
          <component
            :is="form.customComponent"
            :resource="resource"
            v-bind="form.config"
          />
        </template>
      </template>
    </component>
  </div>
  <div
    class="max-w-screen-xl m-auto p-4"
    v-if="config && resource && !form?.hideTable"
  >
    <TableToolbar
      :filter-schema="resource.filterSchema"
      :filters="resource.filter"
      :search="resource.search"
      :actions="resource.tableActions"
      @update-search="resource.onUpdateSearch"
      @update-filters="resource.onUpdateFilters"
      @action="resource.backendAction"
    >
      <template #left>
        <span class="text-xl font-bold mr-4">{{ config.title }}</span>
      </template>
      <template #right>
        <Btn
          v-if="config.operations.create"
          :icon="IconEnum.Plus"
          @click="resource.create"
        >
          <span class="whitespace-nowrap">Add record</span>
        </Btn>
      </template>
    </TableToolbar>

    <TableComponent :id="`form_table_${id}`" v-bind="resource" />
  </div>
</template>
