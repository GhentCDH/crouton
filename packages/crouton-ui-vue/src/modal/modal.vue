<template>
  <dialog
    ref="dialogRef"
    class="modal"
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
import { ModalSize } from '../const/size';

const properties = defineProps(ModalProperties);

const id = `modal_${crypto.randomUUID()}`;
const titleId = `${id}_title`;
const contentId = `${id}_content`;

const dialogRef = ref<HTMLDialogElement | null>(null);

const emits = defineEmits(ModalEmits);

// showModal() gives us focus containment, an inert page, top layer, Esc
// (via the `cancel` event) and focus return to the invoker — no manual trap.
const openModal = () => {
  dialogRef.value?.showModal();
};

const closeModal = () => {
  dialogRef.value?.close();
  emits('closeModal');
};

// Esc fires `cancel`; it is always prevented so the parent's `open` state stays
// the source of truth. Nested controls (select, date picker) call
// preventDefault() on their own Esc keydown, which suppresses `cancel`.
const onCancel = () => {
  if (!properties.disableClose) closeModal();
};

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

<style>
/* Keep scroll gestures inside the dialog instead of scrolling the page behind it. */
dialog.modal:modal {
  overscroll-behavior: contain;
}

dialog.modal::backdrop {
  overflow: hidden;
  overscroll-behavior: contain;
}
</style>
