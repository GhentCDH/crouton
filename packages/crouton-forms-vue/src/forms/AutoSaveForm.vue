<template>
  <div class="border border-gray-200 p-4 mt-4">
    <slot v-if="$slots.title" name="title" />
    <h3 v-else :id="titleId" class="font-bold shrink-0">
      {{ modalTitle }}
    </h3>
    <div class="overflow-y-auto">
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
        @events="onFormEvents"
      />
      <slot name="content-after" />
    </div>
    <div
      class="flex justify-end gap-2 pt-2 mt-2 border-t border-gray-300 shrink-0"
    >
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
        <Btn :disabled="!valid" :aria-label="saveLabel" @click="onSubmit">
          {{ saveLabel }}
        </Btn>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { Btn, Color } from '@ghentcdh/ui';

import {
  FormModalEmits,
  FormModalProperties,
} from './modal/FormModal.properties';
import FormComponent from './FormComponent.vue';
import { useAutoSave } from '../composables/useAutoSave';
import type { FormEventPayload } from '../composables/useFormEvents';

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

// Guard: prevents the async vee-validate callbacks that fire after a server
// refresh from arming auto-save or marking the form as user-edited.
// Set to true while onRefreshData is in-flight; reset after effects settle.
let isRefreshing = false;

const autoSaveStatus = computed(() => autoSaver?.status.value ?? 'idle');

const autoSaveStatusLabel = computed(() => {
  switch (autoSaveStatus.value) {
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved ✓';
    case 'pending':
      return 'Fill required fields to save';
    case 'error':
      return 'Save failed';
    default:
      return '';
  }
});

const autoSaveStatusClass = computed(() => ({
  'text-gray-400': autoSaveStatus.value === 'idle',
  'text-blue-500': autoSaveStatus.value === 'saving',
  'text-green-600': autoSaveStatus.value === 'saved',
  'text-amber-500': autoSaveStatus.value === 'pending',
  'text-red-500': autoSaveStatus.value === 'error',
}));

// ─── Form event handlers ──────────────────────────────────────────────────────

const onCancel = () => {
  formData.value = {};
  emits('closeModal', null);
};

const onValid = (isValid: boolean) => {
  valid.value = isValid;
};

// Helper: always read live vee-validate values rather than the (potentially
// stale) formData ref. formData is only updated on intentional assignments
// (initial load / server refresh / cancel) — never on every keystroke.
const liveValues = () => formRef.value?.getCurrentValues() ?? formData.value;

const onChange = (data: any) => {
  // Do NOT update formData.value here.
  // Doing so would create a reactive cycle:
  //   values watcher → onChange → formData.value = data
  //   → prop watcher → setValues(data) → values watcher → …
  // formData is only written on initial load, server refresh, and cancel.
  if (autoSaver && !isRefreshing) {
    userHasEdited.value = true;
    autoSaver.trigger(data, valid.value);
  }
};

const onSubmit = () => {
  formRef.value?.markSubmitted();
  if (!valid.value) return;
  emits('closeModal', { data: liveValues(), valid: valid.value });
};

const onRetry = () => {
  if (autoSaver) {
    autoSaver.saveNow(liveValues());
  }
};

const onFormEvents = (payload: FormEventPayload) => {
  if (payload.event === 'update-relation' && properties.onRefreshData) {
    // 1. Kill any pending debounce — its captured data is now stale.
    autoSaver?.cancel();
    // 2. Reset the dirty flag so the incoming fresh data doesn't re-arm the debounce.
    userHasEdited.value = false;
    // 3. Block onChange from arming auto-save while the refresh is in-flight.
    isRefreshing = true;
    // 4. Pull the latest record from the server and sync the form.
    //    Use nextTick to defer the formData assignment so it lands in a fresh
    //    Vue flush cycle — this breaks the synchronous prop→watcher→setValues
    //    chain that otherwise causes "Maximum recursive updates" in FormComponent.
    properties
      .onRefreshData()
      .then((fresh) => {
        if (fresh) {
          nextTick(() => {
            formData.value = fresh;
          });
        }
      })
      .finally(() => {
        // Double nextTick: let formData update + all async vee-validate callbacks
        // (triggered by useControlBinding's field watchers) fully settle before
        // re-enabling onChange auto-save arming.
        nextTick(() => {
          nextTick(() => {
            isRefreshing = false;
            userHasEdited.value = false;
          });
        });
      });
  }
  emits('events', payload);
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
  if (autoSaver && userHasEdited.value) {
    autoSaver.trigger(liveValues(), isValid);
  }
};

watch(valid, (newValid, oldValid) => {
  if (newValid !== oldValid) {
    emits('valid', newValid);
  }
});
</script>
