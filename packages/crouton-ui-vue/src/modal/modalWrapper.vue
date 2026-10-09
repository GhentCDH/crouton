<template>
  <template
    v-for="modal in modals"
    :key="modal.id"
  >
    <component
      :is="modal?.component"
      v-bind="modal?.props"
      :open="true"
      @close-modal="modal?.props?.onClose"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { ModalService } from './modal.service';

const modalService = ModalService.getInstance();

const modals = computed(() => {
  return modalService.showModal.value ? modalService.modals : [];
});
</script>
