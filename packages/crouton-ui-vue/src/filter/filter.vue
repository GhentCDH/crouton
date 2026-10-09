<template>
  <Collapse
    :title="title"
    :opened="opened"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-base-content/50">
        {{ selectedLabel }} of {{ items.length }} items
      </span>
      <div class="flex gap-1">
        <button
          class="btn btn-ghost btn-xs"
          type="button"
          tabindex="-1"
          @click="selectAll"
        >
          All
        </button>
        <button
          class="btn btn-ghost btn-xs"
          type="button"
          tabindex="-1"
          @click="selectNone"
        >
          None
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label
        v-for="item in items"
        :key="item[valueKey]"
        class="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-base-200"
        :class="{ 'bg-base-200/60': isSelected(item[valueKey]) }"
      >
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          :checked="isSelected(item[valueKey])"
          @change="
            toggleItem(
              item[valueKey],
              ($event.target as HTMLInputElement).checked,
            )
          "
        >
        <span
          v-if="colorKey && item[colorKey]"
          class="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
          :style="{ backgroundColor: item[colorKey] }"
        />
        <span class="text-sm flex-1 select-none">{{ item[labelKey] }}</span>
        <span
          v-if="item[countKey] > 0"
          class="badge badge-sm badge-ghost"
        >
          {{ item[countKey] }}
        </span>
      </label>
    </div>
  </Collapse>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';

import { Collapse } from '../collapse';
import { FilterEmits, FilterProperties } from './Filter.properties';
import { useFilter } from './composables/useFilter';

const props = defineProps(FilterProperties);
const emit = defineEmits(FilterEmits);

const items = computed(() => props.items ?? []);

const { isSelected, selectedLabel, selectAll, selectNone, toggleItem } =
  useFilter(items, toRef(props, 'modelValue'), toRef(props, 'valueKey'), emit);
</script>
