<template>
  <div class="crouton-form border border-gray-200 p-4 mt-4">
    <div
      v-if="$slots.title || title"
      class="flex gap-2 border-b border-gray-200 items-center font-bold pb-2"
    >
      <Btn
        @click="onBack"
        :icon="(ArrowLeftIcon as any)"
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
        <FormDebug
          :show-errors="showErrors"
          :debug-value="debugValue"
          :errors="errors"
          :current-values="currentValues"
        />
      </div>
      <slot name="content-after" />
    </div>
    <div
      v-if="showButtons && !readonly"
      class="flex justify-end gap-2 pt-2 mt-2 border-t border-gray-300 shrink-0 items-center"
    >
      <span class="text-sm mr-3"> <slot name="message-buttons" /></span>
      <!-- Auto-save mode: status indicator + optional Retry + Close -->
      <template v-if="properties.autoSave">
        <Message :status="autoSaveStatus" />
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
          :type="ButtonType.submit"
        >
          {{ saveLabel }}
        </Btn>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ArrowLeftIcon } from '@heroicons/vue/24/solid';
import { computed, provide, ref } from 'vue';
import { Btn, ButtonType } from '@ghentcdh/ui';
import {
  type CroutonFormEmitsType,
  CroutonFormProperties,
} from './CroutonForm.properties';
import { FORM_MODAL_OPENER_KEY, FormComponent } from '@ghentcdh/crouton-forms-vue';
import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';
import { useFormLogic } from './useFormLogic';
import Message from './Message.vue';
import FormDebug from './debug/FormDebug.vue';
import { JsonFormModalService } from './modal/FormModalService';

const properties = defineProps(CroutonFormProperties);
const emits = defineEmits<CroutonFormEmitsType>();
const formRef = ref<InstanceType<typeof FormComponent>>();
const formData = defineModel<any>();
const api = computed(() => properties.http ?? useApi());
const { showErrors: globalShowErrors, debugValue: globalDebugValue } =
  useCrouton();
const showErrors = computed(
  () => properties.showErrors ?? globalShowErrors.value,
);
const debugValue = computed(
  () => properties.debugValue ?? globalDebugValue.value,
);

const {
  id,
  valid,
  autoSaveStatus,
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
  currentValues,
} = useFormLogic(properties, emits, formData, formRef);

provide(FORM_MODAL_OPENER_KEY, (opts) => JsonFormModalService.openModal(opts));

const onBack = (): void => {
  onCancel();
};
</script>
