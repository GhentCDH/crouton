<template>
  <JsonForm
    ref="formRef"
    :id="id"
    :name="name"
    :schema="schema"
    :ui-schema="uiSchema"
    :disabled="disabled"
    :readonly="readonly"
    :form-data="formData"
    :error-mode="errorMode"
    :http="http"
    :renderers="renderers"
    :validate-on-mount="validateOnMount"
    :optional-properties-nullable="true"
    @change="emit('change', $event)"
    @submit="emit('submit', $event)"
    @errors="emit('errors', $event)"
    @valid="emit('valid', $event)"
    @events="emit('events', $event)"
  >
    <template #debug="{ errors: debugErrors, currentValues }">
      <FormDebug
        :show-errors="showErrors"
        :debug-value="debugValue"
        :errors="debugErrors"
        :current-values="currentValues"
      />
    </template>
  </JsonForm>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { JsonForm } from '@ghentcdh/crouton-forms-vue';

import {
  JsonFormComponentEmits,
  JsonFormComponentProperties,
} from './FormComponent.properties';
import FormDebug from './debug/FormDebug.vue';
import { useCrouton } from '../composables/useCrouton';

defineProps(JsonFormComponentProperties);
const emit = defineEmits(JsonFormComponentEmits);
const { showErrors, debugValue } = useCrouton();

const formRef = ref<InstanceType<typeof JsonForm> | null>(null);

type JsonFormExposed = { markSubmitted?: () => void; getCurrentValues?: () => unknown; validate?: () => Promise<{ valid: boolean }> };
defineExpose({
  markSubmitted: () => (formRef.value as unknown as JsonFormExposed)?.markSubmitted?.(),
  getCurrentValues: () => (formRef.value as unknown as JsonFormExposed)?.getCurrentValues?.() as Record<string, unknown>,
  validate: () => (formRef.value as unknown as JsonFormExposed)?.validate?.(),
});
</script>
