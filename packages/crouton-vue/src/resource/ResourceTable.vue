<script setup lang="ts">
import { computed, ref, shallowRef, toRaw, watch } from 'vue';

import { TableComponent, TableToolbar } from '@ghentcdh/crouton-forms-vue';
import { computedAsync } from '../utils/computedAsync';
import { useCrouton } from '../composables/useCrouton';

import { Btn, IconEnum } from '@ghentcdh/ui';
import { useResources } from './useResources';
import { Request } from '../utils/request';
import ResourceSchemaEditor from './ResourceSchemaEditor.vue';

const crouton = useCrouton();

const props = defineProps({
  formId: { type: String },
  initialRequestParams: { type: Object, default: {} },
});

const id = computed(() => `${props.formId}_${Date.now()}`);

/**
 * Bumped after a schema edit is saved so `config` below refetches — its
 * `crouton.getFormDef` call has no other reactive dependency that would
 * change on its own once the FormDefCache entry is invalidated.
 */
const schemaVersion = ref(0);

const config = computedAsync(() => {
  void schemaVersion.value;
  return crouton.getFormDef(props.formId as string);
});

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
    inline: true,
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
          inline: true,
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

/** Dev-only visual resource.json builder — see VISUAL_RESOURCE_BUILDER_PLAN.md. */
const showSchemaEditor = ref(false);
</script>

<template>
  <div v-if="form && resource">
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
          v-if="crouton.isDev"
          :icon="IconEnum.Edit"
          color="secondary"
          :outline="true"
          @click="showSchemaEditor = true"
        >
          <span class="whitespace-nowrap">Edit fields</span>
        </Btn>
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

    <ResourceSchemaEditor
      v-if="showSchemaEditor"
      :form-id="props.formId as string"
      @close-modal="showSchemaEditor = false"
      @saved="schemaVersion++"
    />
  </div>
</template>
