<template>
  <div class="border border-gray-200 p-4 mt-4">
    <div
      class="flex gap-2 border-b border-gray-200 items-center font-bold pb-2"
    >
      <Btn
        @click="() => navigate.go(-1)"
        :icon="ArrowLeftIcon"
        color="blank"
        :outline="true"
        size="xsgi"
        :noBorder="true"
      />
      <slot v-if="$slots.title" name="title" />
      <div v-else :id="`title-${id}`">
        {{ modalTitle }}
      </div>
    </div>
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
        :renderers="renderers"
        :validateOnMount="validateOnMount"
        @errors="onErrors"
        @change="onChange"
        @valid="onValid"
        @events="onFormEvents"
      />
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
  <div>
    <slot name="content-after" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { Btn, Color } from '@ghentcdh/ui';
import { ArrowLeftIcon } from '@heroicons/vue/24/solid';
import {
  FormModalEmits,
  FormModalProperties,
} from './modal/FormModal.properties';
import FormComponent from './FormComponent.vue';
import { useFormLogic } from '../composables/useFormLogic';
import { useRouter } from 'vue-router';

const properties = defineProps(FormModalProperties);
const emits = defineEmits(FormModalEmits);
const formRef = ref<InstanceType<typeof FormComponent>>();
const formData = defineModel<any>();
const navigate = useRouter();

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
