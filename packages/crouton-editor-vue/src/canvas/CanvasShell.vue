<script setup lang="ts">
import { Btn } from '@ghentcdh/ui';

import AddFieldMenu from './AddFieldMenu.vue';
import { CanvasShellProperties } from './CanvasShell.properties';

defineProps(CanvasShellProperties);

const emits = defineEmits<{
  undo: [];
  add: [fieldId: string];
}>();
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="alert alert-warning text-sm">
      <span>{{ warningText }}</span>
    </div>

    <div
      v-if="lastRemoved"
      class="alert flex items-center justify-between text-sm"
    >
      <span>Removed "{{ lastRemoved.label }}".</span>
      <Btn color="secondary" :outline="true" size="xs" @click="emits('undo')">
        Undo
      </Btn>
    </div>

    <p v-if="!hasFields" class="text-sm opacity-60">
      {{ emptyText }}
    </p>

    <!-- Main content slot (draggable grid/strip) -->
    <slot />

    <AddFieldMenu
      :hidden-fields="hiddenFields"
      :disabled="!hiddenFields.length"
      @add="(id) => emits('add', id)"
    />
  </div>
</template>