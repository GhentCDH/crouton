<script setup lang="ts">
import { ref } from 'vue';
import { ResourceJsonEditor } from '@ghentcdh/crouton-editor-vue';

const resource = ref({
  name: 'book',
  route: 'books',
  model: 'Book',
  tag: 'Books',
  title: 'Books',
  display: { mode: 'modal', customComponent: null },
  modalSize: 'sm',
  sidebar: { hide: false },
  operations: {
    findAll: true,
    findOne: true,
    create: true,
    update: true,
    patch: true,
    delete: true,
  },
  columns: {
    title: { label: 'Title', column: 'title' },
    author: { label: 'Author', column: 'author' },
    year: { label: 'Year', column: 'year' },
    published: {
      label: 'Published',
      column: 'published',
      hiddenInTable: true,
    },
  },
});

const lastEmitted = ref('');

const onUpdate = (value: unknown) => {
  resource.value = value as typeof resource.value;
  lastEmitted.value = new Date().toLocaleTimeString();
};
</script>

<template>
  <div class="border border-base-300 rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold">Live editor</h4>
      <span v-if="lastEmitted" class="text-xs opacity-50">
        Last update:modelValue at {{ lastEmitted }}
      </span>
    </div>
    <ResourceJsonEditor
      :model-value="resource"
      @update:model-value="onUpdate"
    />
  </div>
</template>
