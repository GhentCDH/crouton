<script setup lang="ts">
import type { Component } from 'vue';
import { computed, PropType, ref, shallowRef, toRaw, watch } from 'vue';

import { TableComponent, TableToolbar } from '@ghentcdh/crouton-forms-vue';
import { Btn, IconEnum } from '@ghentcdh/crouton-ui-vue';

import { useCrouton } from '../composables/useCrouton';
import { computedAsync } from '../utils/computedAsync';
import { Request } from '../utils/request';
import { useLanguage } from '../composables/useLanguage';
import ResourceSchemaEditor from './ResourceSchemaEditor.vue';
import TableWrapperLayout from './TableWrapperLayout.vue';
import { useResources } from './useResources';

const crouton = useCrouton();
const { t } = useLanguage();

const props = defineProps({
  label: { type: String, required: false },
  formId: { type: String },
  initialRequestParams: { type: Object, default: {} },
  defaultUriParams: { type: Object, default: {} },
  hideToolbar: { type: Boolean, default: false },
  hideTitle: { type: Boolean, default: false },
  tableComponent: {
    type: Object as PropType<Component>,
    default: () => TableComponent,
  },
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
  return crouton.getFormDefById(props.formId as string);
});

const emits = defineEmits(['handleEvent', 'onRequest', 'initialLoad']);
const handleEvent = (event: string, data: any) => {
  emits('handleEvent', { event, data });
};

const onRequest = (requestData: Request) => emits('onRequest', requestData);

const resource = shallowRef(
  useResources(config.value, {
    initialRequestParams: { ...toRaw(props.initialRequestParams) },
    defaultUriParams: toRaw(props.defaultUriParams),
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
          defaultUriParams: toRaw(props.defaultUriParams),
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

const form = computed(() => resource.value?.form ?? null);

const reload = () => {
  resource.value?.reload();
};

const tableUi = computed(() => config.value?.schemas?.table?.ui as any);
const isWrapperLayout = computed(
  () => tableUi.value?.type && tableUi.value.type !== 'Table',
);
const tableNodeUi = computed(() => {
  const ui = tableUi.value;
  if (!ui) return null;
  if (ui.type === 'Table' || !ui.type) return ui;
  return (ui.elements ?? []).find((e: any) => e.type === 'Table') ?? null;
});
const tableHeading = computed(
  () =>
    tableNodeUi.value?.options?.title ??
    tableNodeUi.value?.options?.label ??
    null,
);

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
    v-if="config && resource && !form?.hideTable"
    :data-testid="`resource-${formId}`"
  >
    <TableWrapperLayout
      v-if="isWrapperLayout && tableUi"
      :ui="tableUi"
      :resource="resource"
    >
      <template v-if="hideToolbar">
        <legend
          v-if="!hideTitle"
          class="w-full block flex flex-row space-between"
          :class="['fieldset-legend']"
        >
          <div class="flex-grow">
            {{ label ?? config.title }}
          </div>
          <div>
            <Btn
              v-if="crouton.isDev.value"
              :icon="IconEnum.Edit"
              color="secondary"
              :outline="true"
              @click="showSchemaEditor = true"
            >
              <span class="whitespace-nowrap">{{
                t('table.editFields', 'Edit fields')
              }}</span>
            </Btn>
            <Btn
              v-if="config.operations.create"
              data-testid="btn-create"
              :icon="IconEnum.Plus"
              @click="resource.create"
            >
              <span class="whitespace-nowrap">{{
                t('table.addRecord', 'Add record')
              }}</span>
            </Btn>
          </div>
        </legend>
      </template>
      <TableToolbar
        v-else
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
            v-if="crouton.isDev.value"
            :icon="IconEnum.Edit"
            color="secondary"
            :outline="true"
            @click="showSchemaEditor = true"
          >
            <span class="whitespace-nowrap">{{
              t('table.editFields', 'Edit fields')
            }}</span>
          </Btn>
          <Btn
            v-if="config.operations.create"
            data-testid="btn-create"
            :icon="IconEnum.Plus"
            @click="resource.create"
          >
            <span class="whitespace-nowrap">{{
              t('table.addRecord', 'Add record')
            }}</span>
          </Btn>
        </template>
      </TableToolbar>
      <h2 v-if="tableHeading" class="text-xl font-bold mb-2">
        {{ tableHeading }}
      </h2>
      <component
        :is="props.tableComponent"
        v-bind="resource as any"
        :id="`form_table_${id}`"
        @refresh="reload"
      />
    </TableWrapperLayout>
    <template v-else>
      <template v-if="hideToolbar">
        <legend
          v-if="!hideTitle"
          class="w-full block flex flex-row space-between"
          :class="['fieldset-legend']"
        >
          <div class="flex-grow">
            {{ label ?? config.title }}
          </div>
          <div>
            <Btn
              v-if="crouton.isDev.value"
              :icon="IconEnum.Edit"
              color="secondary"
              :outline="true"
              @click="showSchemaEditor = true"
            >
              <span class="whitespace-nowrap">{{
                t('table.addRecord', 'Edit fields')
              }}</span>
            </Btn>
            <Btn
              v-if="config.operations.create"
              data-testid="btn-create"
              :icon="IconEnum.Plus"
              @click="resource.create"
            >
              <span class="whitespace-nowrap">{{
                t('table.addRecord', 'Add record')
              }}</span>
            </Btn>
          </div>
        </legend>
      </template>
      <TableToolbar
        v-else
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
            v-if="crouton.isDev.value"
            :icon="IconEnum.Edit"
            color="secondary"
            :outline="true"
            @click="showSchemaEditor = true"
          >
            <span class="whitespace-nowrap">{{
              t('table.addRecord', 'Edit fields')
            }}</span>
          </Btn>
          <Btn
            v-if="config.operations.create"
            data-testid="btn-create"
            :icon="IconEnum.Plus"
            @click="resource.create"
          >
            <span class="whitespace-nowrap">{{
              t('table.addRecord', 'Add record')
            }}</span>
          </Btn>
        </template>
      </TableToolbar>
      <h2 v-if="tableHeading" class="text-xl font-bold mb-2">
        {{ tableHeading }}
      </h2>
      <component
        :is="props.tableComponent"
        v-bind="resource as any"
        :id="`form_table_${id}`"
        @refresh="reload"
      />
    </template>

    <ResourceSchemaEditor
      v-if="showSchemaEditor"
      :form-id="props.formId as string"
      @close-modal="showSchemaEditor = false"
      @saved="schemaVersion++"
    />
  </div>
</template>
