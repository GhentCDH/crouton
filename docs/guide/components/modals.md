---
title: Modals
---

<script setup>
import { ref } from 'vue';
import { Btn, DatePicker, Modal, ModalService, ModalWrapper, SelectComponent } from '@ghentcdh/crouton-vue';

const modalOpen = ref(false);
const modalSelectValue = ref('');
const modalDateValue = ref();
const confirmResult = ref('—');
const askConfirm = () =>
  ModalService.showConfirm({
    title: 'Delete record?',
    message: 'This cannot be undone.',
    confirmLabel: 'Delete',
    onClose: ({ confirmed }) => (confirmResult.value = confirmed ? 'Confirmed' : 'Cancelled'),
  });
const selectOptions = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];
</script>

# Modals

`Modal` is a native `<dialog>`: Esc closes it, focus is trapped inside and returned on close. Dropdowns inside the modal open in the top layer, above the dialog — Esc in an open dropdown closes only the dropdown.

For modals driven by resources (create/edit forms, relation pickers) see [Modals and relations](../4.frontend/modals-and-relations.md).

## Basic modal

<ClientOnly>
<div class="demo">
  <Btn color="primary" @click="modalOpen = true">Open modal</Btn>
  <Modal modal-title="Example modal" :open="modalOpen" @close-modal="modalOpen = false">
    <template #content>
      <p>Try the dropdowns — they render above the dialog.</p>
      <div class="flex flex-wrap gap-4 items-start mt-2">
        <SelectComponent v-model="modalSelectValue" label="Select" :options="selectOptions" width="w-56" />
        <DatePicker v-model="modalDateValue" label="Date" width="w-56" />
      </div>
    </template>
    <template #actions>
      <Btn color="secondary" outline @click="modalOpen = false">Cancel</Btn>
      <Btn color="primary" @click="modalOpen = false">Save</Btn>
    </template>
  </Modal>
</div>
</ClientOnly>

```vue
<Btn color="primary" @click="open = true">Open modal</Btn>
<Modal modal-title="Example modal" :open="open" @close-modal="open = false">
  <template #content>…</template>
  <template #actions>
    <Btn color="secondary" outline @click="open = false">Cancel</Btn>
    <Btn color="primary" @click="save">Save</Btn>
  </template>
</Modal>
```

## Confirm dialog

`ModalService.showConfirm` opens a `ConfirmModal` without any template code. It needs one `<ModalWrapper />` mounted in your app (`ShellComponent` already includes it).

<ClientOnly>
<div class="demo">
  <Btn color="error" @click="askConfirm">Delete…</Btn>
  <span class="demo-note">Result: {{ confirmResult }}</span>
  <ModalWrapper />
</div>
</ClientOnly>

```ts
ModalService.showConfirm({
  title: 'Delete record?',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
  onClose: ({ confirmed }) => confirmed && remove(),
});
```

Use `ModalService.openModal({ component, props: { ..., onClose } })` for your own modal components; they receive `open` and must emit `closeModal`.
