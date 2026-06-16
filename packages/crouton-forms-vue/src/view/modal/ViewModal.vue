<template>
  <Modal
    v-bind="properties"
    :open="true"
    :disable-close="false"
    :width="modalSize"
    @close-modal="onCancel"
  >
    <template #title>
      <h3>{{ modalTitle }}</h3>
      <div class="text-gray-500 text-xs mb-2">
        {{ formData.id }}
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
          :renderers="properties.renderers"
          @events="handleEvent"
        />
      </div>
      <slot name="content-after" />
    </template>
    <template #actions>
      <Btn
        v-if="canEdit"
        :aria-label="editLabel"
        @click="onEditClick"
      >
        {{ editLabel }}
      </Btn>
      <Btn
        :color="Color.secondary"
        :outline="true"
        :aria-label="closeLabel"
        @click="onCancel"
      >
        {{ closeLabel }}
      </Btn>
      <Btn
        v-if="canDelete"
        :color="Color.error"
        :outline="true"
        :aria-label="deleteLabel"
        :icon="IconEnum.Delete"
        @click="onDeleteClick"
      >
        {{ deleteLabel }}
      </Btn>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { provide, ref, watch } from 'vue';

import { Btn, Color, IconEnum, Modal, myStyles } from '@ghentcdh/ui';

import { ViewModalEmits, ViewModalProperties } from './ViewModal.properties';
import FormComponent from '../../forms/FormComponent.vue';
import { customRenderers } from '../../forms/renderers/index';

const properties = defineProps(ViewModalProperties);
const id = `view_${Math.floor(Math.random() * 1000)}`;

const valid = ref(false);
const formData = defineModel<any>();
const emits = defineEmits(ViewModalEmits);

if (properties.data) {
  formData.value = properties.data;
}
provide(
  'renderers',
  properties.renderers?.length
    ? [...customRenderers, ...properties.renderers]
    : customRenderers,
);
provide('readonlyRenderers', properties.renderers ?? []);
provide('rootSchema', properties.schema);
provide('styles', myStyles);

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

const handleEvent = (event: { event: string; [key: string]: any }) => {
  // ignore events other than view for now
  if (event.event !== 'view') return;

  emits('view', event);
};
</script>
