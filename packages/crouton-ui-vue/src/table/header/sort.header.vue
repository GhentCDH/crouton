<template>
  <button
    class="flex items-center gap-2"
    :class="sortable ? 'cursor-pointer' : 'cursor-default'"
    :disabled="!sortable"
    @click="onSort"
  >
    <span class="whitespace-nowrap"> {{ column.label }}</span>
    <div class="h-4 w-4 relative">
      <Icon
        v-if="sortable && sortColumn === sortId"
        :icon="sortIcon"
      />
    </div>
  </button>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { SortHeaderEmits, SortHeaderProperties } from './sort.header.properties';
import type { IconDef } from '../../icons';
import { Icon, IconEnum } from '../../icons';

const props = defineProps(SortHeaderProperties);
const emits = defineEmits(SortHeaderEmits);

const sortable = computed(() => props.column.options?.sortable !== false);

const sortIcon = computed<IconDef>(() =>
  props.sortDirection === 'asc' ? IconEnum.BarsArrowUp : IconEnum.BarsArrowDown,
);

const sortId = computed(() => props.column.options?.sortId ?? props.column.id);

const onSort = () => {
  if (!sortable.value) return;
  emits('sort', sortId.value);
};
</script>
