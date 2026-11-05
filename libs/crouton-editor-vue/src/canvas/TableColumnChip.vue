<script setup lang="ts">
import { computed } from 'vue';

import { TableColumnChipProperties } from './TableColumnChip.properties';
import FieldOptionsMenu from './FieldOptionsMenu.vue';

const props = defineProps(TableColumnChipProperties);

const emits = defineEmits<{
  'change-type': [type: string];
  remove: [];
  select: [];
}>();

const typeLabel = computed(
  () =>
    props.typeOptions.find((o) => o.value === props.field.type)?.label ??
    props.field.type,
);
</script>

<template>
  <div
    class="card bg-base-100 border border-base-300 shadow-sm flex flex-row items-center gap-2 px-3 py-2 cursor-pointer"
    :class="{ 'ring-2 ring-primary': selected }"
    @click="emits('select')"
  >
    <span
      class="drag-handle cursor-grab active:cursor-grabbing select-none text-base-content/40 hover:text-base-content/70"
      title="Drag to reorder"
      @click.stop
    >
      ⠿
    </span>
    <div class="flex-1 min-w-0">
      <div class="text-xs font-medium truncate">{{ field.label }}</div>
      <div class="text-[10px] uppercase tracking-wide opacity-50">
        {{ typeLabel }}
      </div>
    </div>
    <div @click.stop>
      <FieldOptionsMenu
        :type-options="typeOptions"
        :current-type="field.type"
        remove-label="Remove from table"
        @change-type="(t) => emits('change-type', t)"
        @remove="emits('remove')"
      />
    </div>
  </div>
</template>