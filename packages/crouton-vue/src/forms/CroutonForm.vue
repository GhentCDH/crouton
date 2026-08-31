<template>
  <div class="border border-gray-200 p-4 mt-4">
    <div
      v-if="$slots.title || title"
      class="flex gap-2 border-b border-gray-200 items-center font-bold pb-2"
    >
      <Btn
        @click="onBack"
        :icon="ArrowLeftIcon"
        color="blank"
        :outline="true"
        size="sm"
        :noBorder="true"
      />
      <slot v-if="$slots.title" name="title" />
      <div v-else :id="`title-${id}`">
        {{ title }}
      </div>
    </div>
    <div
      class="overflow-y-auto flex gap-2"
      :class="{
        'flex-row': layout === 'rows',
        'flex-col': layout !== 'rows',
      }"
    >
      <slot name="content-before" />
      <div :class="formMaxWidth">
        <FormComponent
          v-if="uiSchema && schema"
          :id="`modal-${id}`"
          ref="formRef"
          :readonly="readonly"
          :form-data="formData"
          :schema="schema"
          :ui-schema="uiSchema"
          :error-mode="errorMode"
          :http="api"
          :renderers="renderers"
          :validateOnMount="validateOnMount"
          @errors="onErrors"
          @change="onChange"
          @valid="onValid"
          @events="onFormEvents"
        />
      </div>
      <slot name="content-after" />
    </div>
    <pre v-if="showErrors" class="border p-2 m-2 border-error">
      {{ errors }}
    </pre>

    <div
      v-if="showButtons && !readonly"
      class="flex justify-end gap-2 pt-2 mt-2 border-t border-gray-300 shrink-0"
    >
      <!-- Auto-save mode: status indicator + optional Retry + Close -->
      <template v-if="properties.autoSave">
        <span class="text-sm mr-3" :class="autoSaveStatusClass">
          {{ autoSaveStatusLabel }}
        </span>
        <Btn
          v-if="autoSaveStatus === 'error'"
          color="secondary"
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
          color="secondary"
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
          type="submit"
        >
          {{ saveLabel }}
        </Btn>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ArrowLeftIcon } from '@heroicons/vue/24/solid';
import { computed, ref } from 'vue';
import { Btn } from '@ghentcdh/ui';
import {
  type CroutonFormEmitsType,
  CroutonFormProperties,
} from './CroutonForm.properties';
import { FormComponent } from '@ghentcdh/crouton-forms-vue';
import { useApi } from '../composables/useApi';
import { useFormLogic } from './useFormLogic';

const properties = defineProps(CroutonFormProperties);
const emits = defineEmits<CroutonFormEmitsType>();
const formRef = ref<InstanceType<typeof FormComponent>>();
const formData = defineModel<any>();
const api = computed(() => properties.http ?? useApi());

const {
  id,
  valid,
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
  renderers,
  schema,
  uiSchema,
  errors,
} = useFormLogic(properties, emits, formData, formRef);

const onBack = (): void => {
  onCancel();
};
</script>
