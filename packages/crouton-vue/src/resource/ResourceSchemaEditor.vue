<script setup lang="ts">
import { ref, watch } from 'vue';

import { Btn, Modal } from '@ghentcdh/ui';

import { computedAsync } from '../utils/computedAsync';
import { useApi } from '../composables/useApi';
import { ResourceSchemaEditorProperties } from './ResourceSchemaEditor.properties';

const props = defineProps(ResourceSchemaEditorProperties);

const emits = defineEmits<{
  closeModal: [];
}>();

/**
 * Mirrors the backend's `buildEditableColumnsPayload` response shape
 * (`GET <route>/resource-columns`) — see `payload-builders.ts`.
 */
type EditableColumn = {
  id: string;
  label?: string;
  column: string;
  hiddenInTable: boolean;
  hiddenInForm: boolean;
  hiddenInView: boolean;
  position?: number;
  colspan?: number;
};

const remote = computedAsync(async () => {
  const res = await useApi().get(`${props.formId}/resource-columns`);
  return res.data as { id: string; route: string; columns: EditableColumn[] };
});

/** Local editable copy — the fetched payload is never mutated directly. */
const columns = ref<EditableColumn[]>([]);

watch(
  remote,
  (data) => {
    if (data) columns.value = data.columns.map((c) => ({ ...c }));
  },
  { immediate: true },
);

const onCancel = () => emits('closeModal');

// Persisting these edits (PATCH <route>/resource.json) is wired in the next
// phase, along with cache invalidation so ResourceTable picks up the change
// live and a warning about concurrent CLI edits. For now Save just closes
// the modal — see VISUAL_RESOURCE_BUILDER_PLAN.md, Phase 3.
const onSave = () => emits('closeModal');
</script>

<template>
  <Modal
    :modal-title="`Edit fields — ${formId}`"
    :open="true"
    :disable-close="false"
    width="lg"
    @close-modal="onCancel"
  >
    <template #title>
      <span class="text-xl font-bold">Edit fields — {{ formId }}</span>
    </template>
    <template #content>
      <div v-if="!remote" class="p-4 text-sm opacity-60">Loading…</div>
      <table v-else class="table w-full">
        <thead>
          <tr>
            <th>Label</th>
            <th>Column</th>
            <th>Position</th>
            <th>Colspan</th>
            <th>Hidden in table</th>
            <th>Hidden in form</th>
            <th>Hidden in view</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="col in columns" :key="col.id">
            <td>
              <input
                v-model="col.label"
                type="text"
                class="input input-bordered input-sm w-full"
              />
            </td>
            <td>
              <input
                v-model="col.column"
                type="text"
                class="input input-bordered input-sm w-full"
              />
            </td>
            <td>
              <input
                v-model.number="col.position"
                type="number"
                class="input input-bordered input-sm w-20"
              />
            </td>
            <td>
              <input
                v-model.number="col.colspan"
                type="number"
                min="1"
                max="4"
                class="input input-bordered input-sm w-20"
              />
            </td>
            <td class="text-center">
              <input
                v-model="col.hiddenInTable"
                type="checkbox"
                class="checkbox checkbox-sm"
              />
            </td>
            <td class="text-center">
              <input
                v-model="col.hiddenInForm"
                type="checkbox"
                class="checkbox checkbox-sm"
              />
            </td>
            <td class="text-center">
              <input
                v-model="col.hiddenInView"
                type="checkbox"
                class="checkbox checkbox-sm"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </template>
    <template #actions>
      <Btn color="secondary" :outline="true" @click="onCancel">Cancel</Btn>
      <Btn @click="onSave">Save</Btn>
    </template>
  </Modal>
</template>
