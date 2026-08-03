<script setup lang="ts">
import { ref, watch } from 'vue';

import { Btn, Modal } from '@ghentcdh/ui';

import { computedAsync } from '../utils/computedAsync';
import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';
import { ResourceSchemaEditorProperties } from './ResourceSchemaEditor.properties';

const props = defineProps(ResourceSchemaEditorProperties);

const emits = defineEmits<{
  closeModal: [];
  /** Emitted after a successful save, so ResourceTable can refetch its config. */
  saved: [];
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

/** Body shape for `PATCH <route>/resource.json` — see `PatchResourceJson.schema.ts`. */
type ColumnPatch = Partial<{
  label: string;
  column: string;
  hiddenInTable: boolean;
  hiddenInForm: boolean;
  hiddenInView: boolean;
  fieldInput: Partial<{
    position: number;
    options: Partial<{ colspan: number }>;
  }>;
}>;

const crouton = useCrouton();

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

const saving = ref(false);
const saveError = ref<string | null>(null);

const onCancel = () => emits('closeModal');

/** Diffs the edited columns against the last-fetched values — only changed fields are sent. */
const buildPatch = (): Record<string, ColumnPatch> => {
  const originalById = new Map(
    (remote.value?.columns ?? []).map((c) => [c.id, c]),
  );
  const patch: Record<string, ColumnPatch> = {};

  for (const col of columns.value) {
    const orig = originalById.get(col.id);
    if (!orig) continue;

    const fieldPatch: ColumnPatch = {};
    if (col.label !== orig.label) fieldPatch.label = col.label;
    if (col.column !== orig.column) fieldPatch.column = col.column;
    if (col.hiddenInTable !== orig.hiddenInTable)
      fieldPatch.hiddenInTable = col.hiddenInTable;
    if (col.hiddenInForm !== orig.hiddenInForm)
      fieldPatch.hiddenInForm = col.hiddenInForm;
    if (col.hiddenInView !== orig.hiddenInView)
      fieldPatch.hiddenInView = col.hiddenInView;

    const fieldInputPatch: NonNullable<ColumnPatch['fieldInput']> = {};
    if (col.position !== orig.position) fieldInputPatch.position = col.position;
    if (col.colspan !== orig.colspan) {
      fieldInputPatch.options = { colspan: col.colspan };
    }
    if (Object.keys(fieldInputPatch).length) {
      fieldPatch.fieldInput = fieldInputPatch;
    }

    if (Object.keys(fieldPatch).length) patch[col.id] = fieldPatch;
  }

  return patch;
};

const onSave = async () => {
  const patch = buildPatch();
  if (!Object.keys(patch).length) {
    emits('closeModal');
    return;
  }

  saving.value = true;
  saveError.value = null;
  try {
    await useApi().patch(`${props.formId}/resource.json`, { columns: patch });
    // ResourceTable's cached FormDef must be dropped so the table/form
    // layout picks up the new colspan/position/hiddenIn* values live.
    crouton.invalidateFormDef(props.formId);
    emits('saved');
    emits('closeModal');
  } catch (e: unknown) {
    const message =
      (e as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Failed to save changes.';
    saveError.value = Array.isArray(message) ? message.join(', ') : message;
  } finally {
    saving.value = false;
  }
};
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
      <template v-else>
        <div class="alert alert-warning mb-4 text-sm">
          Edits here write directly to <code>resource.json</code>. If
          <code>crouton update resources</code> runs from the CLI at the same
          time, whichever save happens last wins — there's no conflict detection
          yet.
        </div>
        <div v-if="saveError" class="alert alert-error mb-4 text-sm">
          {{ saveError }}
        </div>
      </template>
      <table v-if="remote" class="table w-full">
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
      <Btn
        color="secondary"
        :outline="true"
        :disabled="saving"
        @click="onCancel"
      >
        Cancel
      </Btn>
      <Btn :disabled="saving" @click="onSave">
        {{ saving ? 'Saving…' : 'Save' }}
      </Btn>
    </template>
  </Modal>
</template>
