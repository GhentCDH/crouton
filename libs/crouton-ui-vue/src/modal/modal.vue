<template>
  <dialog
    ref="dialogRef"
    class="modal"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    :aria-describedby="contentId"
    @cancel.prevent="onCancel"
  >
    <div
      :class="[
        `modal-box bg-white min-h-0 max-h-[90vh] flex flex-col overflow-hidden`,
        ModalSize[width],
      ]"
    >
      <button
        v-if="!disableClose"
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        aria-label="Close"
        @click="closeModal"
      >
        ✕
      </button>
      <slot
        v-if="$slots.title"
        name="title"
      />
      <h3
        v-else
        :id="titleId"
        class="font-bold shrink-0"
      >
        {{ modalTitle }}
      </h3>
      <div
        :id="contentId"
        class="pt-4 flex-1 min-h-0 flex flex-col"
      >
        <slot name="content" />
      </div>
      <div
        class="flex justify-end gap-2 pt-2 mt-2 border-t border-gray-300 shrink-0"
      >
        <slot name="actions" />
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { ModalEmits, ModalProperties } from './modal.properties';
import { useFocusTrap } from '../composables';
import { ModalSize } from '../const/size';

const properties = defineProps(ModalProperties);

const id = `modal_${crypto.randomUUID()}`;
const titleId = `${id}_title`;
const contentId = `${id}_content`;

const dialogRef = ref<HTMLDialogElement | null>(null);
const isOpen = ref(false);

const emits = defineEmits(ModalEmits);

const openModal = () => {
  dialogRef.value?.showModal();
  isOpen.value = true;
};

const closeModal = () => {
  dialogRef.value?.close();
  isOpen.value = false;
  emits('closeModal');
};

const onCancel = () => {
  if (!properties.disableClose) closeModal();
};

useFocusTrap({
  containerRef: dialogRef,
  isActive: isOpen,
  onEscape: () => {
    if (!properties.disableClose) closeModal();
  },
});

defineExpose({ closeModal, openModal });

watch(
  () => properties.open,
  () => {
    if (properties.open) openModal();
    else closeModal();
  },
);

onMounted(() => {
  if (properties.open) openModal();
});
</script>
