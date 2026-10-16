<script setup lang="ts">
import { ref } from 'vue';
import { Btn, Modal } from '@ghentcdh/crouton-ui-vue';
import GalleryFormInputs from './GalleryFormInputs.vue';

const open = ref(false);
const constrained = ref(true);

const openModal = (isConstrained: boolean) => {
  constrained.value = isConstrained;
  open.value = true;
};
const closeModal = () => {
  open.value = false;
};
</script>

<template>
  <div class="flex gap-2">
    <Btn color="primary" @click="openModal(true)">Open constrained modal</Btn>
    <Btn @click="openModal(false)">Open unconstrained modal</Btn>
  </div>
  <Modal
    :open="open"
    :modal-title="constrained ? 'Constrained modal (content max-h-64)' : 'Unconstrained modal'"
    width="lg"
    @close-modal="closeModal"
  >
    <template #content>
      <div :class="constrained ? 'max-h-64 overflow-y-auto' : ''">
        <GalleryFormInputs id-prefix="modal" />
      </div>
    </template>
    <template #actions>
      <Btn @click="closeModal">Cancel</Btn>
      <Btn color="primary" @click="closeModal">Save</Btn>
    </template>
  </Modal>
</template>
