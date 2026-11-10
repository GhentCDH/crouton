<template>
  <Modal
    v-bind="modalProps"
    data-testid="form-modal"
    :open="true"
    :disable-close="false"
    :width="modalSize"
    @close-modal="onCancel"
  >
    <template #title>
      <h3>{{ modalTitle }}</h3>
      <div class="text-gray-500 text-xs mb-2">
        {{ formData?.id }}
      </div>
    </template>
    <template #content>
      <slot name="content-before" />
      <div class="overflow-y-auto">
        <FormComponent
          :id="`modal-${id}`"
          ref="formRef"
          :form-data="formData"
          :schema="schema"
          :readonly="true"
          :ui-schema="uiSchema"
          :renderers="renderers"
          :http="properties.http"
          @events="handleEvent"
        />
      </div>
      <slot name="content-after" />
    </template>
    <template #actions>
      <Btn v-if="canEdit" :aria-label="t('actions.edit', editLabel)" @click="onEditClick">
        {{ t('actions.edit', editLabel) }}
      </Btn>
      <Btn
        :color="Color.secondary"
        :outline="true"
        :aria-label="t('actions.close', closeLabel)"
        @click="onCancel"
      >
        {{ t('actions.close', closeLabel) }}
      </Btn>
      <Btn
        v-if="canDelete"
        :color="Color.error"
        :outline="true"
        :aria-label="t('actions.delete', deleteLabel)"
        :icon="IconEnum.Delete"
        @click="onDeleteClick"
      >
        {{ t('actions.delete', deleteLabel) }}
      </Btn>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { Btn, Color, IconEnum, Modal } from '@ghentcdh/crouton-ui-vue';

import { ViewModalEmits, ViewModalProperties } from './ViewModal.properties';
import { useUiTranslator } from '../../composables/useUiTranslator';
import FormComponent from '../../forms/FormComponent.vue';
import { useDefaultRenderers } from '../../composables/useRendererProvider';

const properties = defineProps(ViewModalProperties);
const t = useUiTranslator();
const id = `view_${Math.floor(Math.random() * 1000)}`;

const valid = ref(false);
const formData = defineModel<Record<string, unknown>>();
const emits = defineEmits(ViewModalEmits);

if (properties.data) {
  formData.value = properties.data;
}

const renderers = useDefaultRenderers(properties.renderers as JsonFormsRendererRegistryEntry[] | null, true);
const modalProps = computed(() => {
  const { data: _data, renderers: _renderers, ...rest } = properties;
  return rest;
});

const onCancel = () => {
  formData.value = {};
  emits('closeModal', null);
};

const onEditClick = () => {
  // Emit the action BEFORE closing — once 'closeModal' fires, the modal is
  // removed from the reactive modals list and 'edit' listeners are torn down.
  const data = formData.value;
  emits('edit', data);
  emits('closeModal', null);
};

const onDeleteClick = () => {
  const data = formData.value;
  emits('delete', data);
  emits('closeModal', null);
};

watch(valid, (newValid, oldValid) => {
  if (newValid !== oldValid) {
    emits('valid', newValid);
  }
});

const handleEvent = (event: { event: string; [key: string]: unknown }) => {
  // ignore events other than view for now
  if (event.event !== 'view') return;

  emits('view', event);
};
</script>
