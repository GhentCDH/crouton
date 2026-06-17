<template>
  <Modal
    v-bind="properties"
    :open="true"
    :disable-close="false"
    :width="modalSize"
    @close-modal="onCancel"
  >
    <template #content>
      <div class="overflow-auto">
        <slot name="content-before" />
        <FormComponent
          :id="`modal-${id}`"
          ref="formRef"
          :form-data="formData"
          :schema="schema"
          :ui-schema="uiSchema"
          :error-mode="errorMode"
          :http="properties.http"
          :renderers="properties.renderers"
          @errors="onErrors"
          @change="onChange"
          @valid="onValid"
          @events="emits('events', $event)"
        />
        <slot name="content-after" />
      </div>
    </template>
    <template #actions>
      <!-- Auto-save mode: status indicator + optional Retry + Close -->
      <template v-if="properties.autoSave">
        <span class="text-sm mr-3" :class="autoSaveStatusClass">
          {{ autoSaveStatusLabel }}
        </span>
        <Btn
          v-if="autoSaveStatus === 'error'"
          :color="Color.secondary"
          :outline="true"
          aria-label="Retry save"
          @click="onRetry"
        >
          Retry
        </Btn>
        <Btn
          :color="Color.secondary"
          :outline="true"
          aria-label="Close"
          @click="onCancel"
        >
          Close
        </Btn>
      </template>

      <!-- Normal mode: Cancel + Save -->
      <template v-else>
        <Btn
          :color="Color.secondary"
          :outline="true"
          :aria-label="cancelLabel"
          @click="onCancel"
        >
          {{ cancelLabel }}
        </Btn>
        <Btn
          :disabled="!valid"
          :aria-label="saveLabel"
          @click="onSubmit"
        >
          {{ saveLabel }}
        </Btn>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Btn, Color, Modal } from '@ghentcdh/ui';

import { FormModalEmits, FormModalProperties } from './FormModal.properties';
import FormComponent from '../FormComponent.vue';
import { useAutoSave } from '../../composables/useAutoSave';

const properties = defineProps(FormModalProperties);

const id = `edit_${Math.floor(Math.random() * 1000)}`;

const formRef = ref<InstanceType<typeof FormComponent>>();
const valid = ref(false);
const formData = defineModel<any>();
const emits = defineEmits(FormModalEmits);

if (properties.data) {
  formData.value = properties.data;
}

// ─── Auto-save ────────────────────────────────────────────────────────────────

const autoSaver =
  properties.autoSave && properties.onAutoSave
    ? useAutoSave({ onSave: properties.onAutoSave })
    : null;

// Guard: only trigger auto-save after the user has actually changed a field.
// Prevents the initial mount validation from firing a spurious save.
const userHasEdited = ref(false);

const autoSaveStatus = computed(() => autoSaver?.status.value ?? 'idle');

const autoSaveStatusLabel = computed(() => {
  switch (autoSaveStatus.value) {
    case 'saving':  return 'Saving…';
    case 'saved':   return 'Saved ✓';
    case 'pending': return 'Fill required fields to save';
    case 'error':   return 'Save failed';
    default:        return '';
  }
});

const autoSaveStatusClass = computed(() => ({
  'text-gray-400':  autoSaveStatus.value === 'idle',
  'text-blue-500':  autoSaveStatus.value === 'saving',
  'text-green-600': autoSaveStatus.value === 'saved',
  'text-amber-500': autoSaveStatus.value === 'pending',
  'text-red-500':   autoSaveStatus.value === 'error',
}));

// ─── Form event handlers ──────────────────────────────────────────────────────

const onCancel = () => {
  formData.value = {};
  emits('closeModal', null);
};

const onValid = (isValid: boolean) => {
  valid.value = isValid;
};

const onChange = (data: any) => {
  formData.value = data;
  if (autoSaver) {
    userHasEdited.value = true;
    autoSaver.trigger(data, valid.value);
  }
};

const onSubmit = () => {
  formRef.value?.markSubmitted();
  if (!valid.value) return;
  emits('closeModal', { data: formData.value, valid: valid.value });
};

const onRetry = () => {
  if (autoSaver && formData.value) {
    autoSaver.saveNow(formData.value);
  }
};

const onErrors = (errors: any) => {
  emits('errors', errors);
  const isValid =
    !errors ||
    (Array.isArray(errors)
      ? errors.length === 0
      : Object.keys(errors).length === 0);
  valid.value = isValid;

  // Re-evaluate auto-save whenever validity changes via the errors path,
  // but only if the user has already made at least one change.
  if (autoSaver && userHasEdited.value && formData.value) {
    autoSaver.trigger(formData.value, isValid);
  }
};

watch(valid, (newValid, oldValid) => {
  if (newValid !== oldValid) {
    emits('valid', newValid);
  }
});
</script>
