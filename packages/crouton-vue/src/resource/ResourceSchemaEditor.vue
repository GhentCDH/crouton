<script setup lang="ts">
import { ref } from 'vue';

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';
import { ResourceJsonEditor } from '@ghentcdh/crouton-editor-vue';
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

const crouton = useCrouton();
const api = useApi();

const remote = computedAsync(async () => {
  const res = await api.get(`${props.formId}/resource-json-raw`);
  return res.data as ResourceJsonInput;
});

const draft = ref<ResourceJsonInput | null>(null);

const onEditorUpdate = (value: ResourceJsonInput) => {
  draft.value = value;
};

const saving = ref(false);
const saveError = ref<string | null>(null);

const onCancel = () => emits('closeModal');

const onSave = async () => {
  const payload = draft.value ?? remote.value;
  if (!payload) return;

  saving.value = true;
  saveError.value = null;
  try {
    await api.put(`${props.formId}/resource-json-raw`, payload);
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
    :modal-title="`Edit resource — ${formId}`"
    :open="true"
    :disable-close="false"
    width="xl"
    @close-modal="onCancel"
  >
    <template #title>
      <span class="text-xl font-bold">Edit resource — {{ formId }}</span>
    </template>
    <template #content>
      <div class="max-h-[65vh] overflow-y-auto pr-1">
        <div v-if="!remote" class="p-4 text-sm opacity-60">Loading…</div>
        <template v-else>
          <div v-if="saveError" class="alert alert-error mb-4 text-sm">
            {{ saveError }}
          </div>
          <ResourceJsonEditor
            :model-value="remote"
            @update:model-value="onEditorUpdate"
          />
        </template>
      </div>
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
