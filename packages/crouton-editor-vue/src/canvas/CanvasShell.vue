<script setup lang="ts">
import { computed } from 'vue';

import { Btn } from '@ghentcdh/ui';

import AddFieldMenu from './AddFieldMenu.vue';
import CanvasDetailPanel from './CanvasDetailPanel.vue';
import { CanvasShellProperties } from './CanvasShell.properties';

const props = defineProps(CanvasShellProperties);

const emits = defineEmits<{
  undo: [];
  add: [fieldId: string];
  'update:selectedFieldId': [id: string | null];
}>();

const selectedCol = computed(() =>
  props.selectedFieldId
    ? props.columns.find((c) => c.id === props.selectedFieldId) ?? null
    : null,
);
</script>

<template>
  <div class="flex gap-3">
    <div class="flex-1 min-w-0 flex flex-col gap-3">
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

    <Transition name="slide-right">
      <CanvasDetailPanel
        v-if="selectedCol && selectedFieldId"
        :key="selectedFieldId"
        :col="selectedCol"
        :drafts="drafts[selectedFieldId]"
        :context="context"
        @close="emits('update:selectedFieldId', null)"
      />
    </Transition>
  </div>
</template>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(1rem);
  opacity: 0;
}
</style>
