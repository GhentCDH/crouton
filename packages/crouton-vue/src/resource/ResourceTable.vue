<script setup lang="ts">
import type { Component } from 'vue';
import { computed, PropType, ref, shallowRef, toRaw, watch } from 'vue';

import { TableComponent } from '@ghentcdh/crouton-forms-vue';

import { useCrouton } from '../composables/useCrouton';
import { computedAsync } from '../utils/computedAsync';
import { type Request } from '../utils/request';
import ResourceSchemaEditor from './ResourceSchemaEditor.vue';
import ResourceTableContent from './ResourceTableContent.vue';
import TableWrapperLayout from './TableWrapperLayout.vue';
import { useResources } from './useResources';

const crouton = useCrouton();

const props = defineProps({
  label: { type: String, required: false },
  formId: { type: String },
  initialRequestParams: { type: Object, default: {} },
  defaultUriParams: { type: Object, default: {} },
  hideToolbar: { type: Boolean, default: false },
  hideTitle: { type: Boolean, default: false },
  tableComponent: {
    type: Object as PropType<Component>,
    default: () => TableComponent as Component,
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
const handleEvent = (event: string, data: unknown) => {
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

type UiNode = Record<string, unknown>;
const tableUi = computed(() => config.value?.schemas?.table?.ui as UiNode | undefined);
const isWrapperLayout = computed(
  () => tableUi.value?.type && tableUi.value.type !== 'Table',
);
const tableNodeUi = computed((): UiNode | null => {
  const ui = tableUi.value;
  if (!ui) return null;
  if (ui.type === 'Table' || !ui.type) return ui;
  return ((ui.elements as UiNode[] | undefined) ?? []).find((e) => e.type === 'Table') ?? null;
});
const tableHeading = computed(
  () =>
    (tableNodeUi.value?.options as Record<string, unknown> | undefined)?.title as string | null ??
    (tableNodeUi.value?.options as Record<string, unknown> | undefined)?.label as string | null ??
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
      :resource="(resource as unknown as Record<string, unknown>)"
    >
      <ResourceTableContent
        :resource="resource"
        :config="config"
        :label="label"
        :table-heading="tableHeading"
        :table-component="props.tableComponent"
        :hide-toolbar="hideToolbar"
        :hide-title="hideTitle"
        :is-dev="crouton.isDev.value"
        :id="id"
        @edit-schema="showSchemaEditor = true"
        @refresh="reload"
      />
    </TableWrapperLayout>
    <ResourceTableContent
      v-else
      :resource="resource"
      :config="config"
      :label="label"
      :table-heading="tableHeading"
      :table-component="props.tableComponent"
      :hide-toolbar="hideToolbar"
      :hide-title="hideTitle"
      :is-dev="crouton.isDev.value"
      :id="id"
      @edit-schema="showSchemaEditor = true"
      @refresh="reload"
    />

    <ResourceSchemaEditor
      v-if="showSchemaEditor"
      :form-id="props.formId as string"
      @close-modal="showSchemaEditor = false"
      @saved="schemaVersion++"
    />
  </div>
</template>
