<template>
  <Modal
    :modal-title="title"
    :open="true"
    :disable-close="true"
  >
    <template #content>
      {{ message }}
    </template>
    <template #actions>
      <Btn
        :color="Color.secondary"
        :outline="true"
        :aria-label="cancelLabel"
        @click="closeMe(false)"
      >
        {{ cancelLabel }}
      </Btn>
      <Btn
        :aria-label="confirmLabel"
        @click="closeMe(true)"
      >
        {{ confirmLabel }}
      </Btn>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './modal.vue';
import { Btn } from '../button';
import type { ConfirmModalProps, ConfirmResult } from './modal.model';
import { Color } from '../const/colors';

withDefaults(defineProps<ConfirmModalProps>(), {
  confirmLabel: 'Ok',
  cancelLabel: 'Cancel',
});

const emits = defineEmits<{
  closeModal: [ConfirmResult];
}>();

const closeMe = (confirmed: boolean) => {
  emits('closeModal', { confirmed });
};
</script>
