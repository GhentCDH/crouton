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
          :renderers="renderers"
          @errors="onErrors"
          @change="onChange"
          @valid="onValid"
          @events="onFormEvents"
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
        <Btn :disabled="!valid" :aria-label="saveLabel" @click="onSubmit">
          {{ saveLabel }}
        </Btn>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { Btn, Color, Modal } from '@ghentcdh/ui';

import { FormModalEmits, FormModalProperties } from './FormModal.properties';
import FormComponent from '../FormComponent.vue';
import { useFormLogic } from '../../composables/useFormLogic';

const properties = defineProps(FormModalProperties);
const emits = defineEmits(FormModalEmits);
const formRef = ref<InstanceType<typeof FormComponent>>();
const formData = defineModel<any>();

const {
  id,
  valid,
  renderers,
  autoSaveStatus,
  autoSaveStatusLabel,
  autoSaveStatusClass,
  onCancel,
  onValid,
  onChange,
  onSubmit,
  onRetry,
  onFormEvents,
  onErrors,
} = useFormLogic(properties, emits, formData, formRef);
</script>
