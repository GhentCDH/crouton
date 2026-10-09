<template>
  <ul
    ref="listRef"
    role="listbox"
    data-select-listbox
    class="bg-base-100 border border-base-300 rounded-box shadow-xl overflow-auto max-h-72 origin-top p-1"
    :class="teleported ? '' : 'absolute z-50 w-full mt-1'"
  >
    <!-- Loading skeleton rows -->
    <template v-if="isLoading">
      <li
        v-for="n in 2"
        :key="`skel-${n}`"
        class="pointer-events-none px-3 py-2"
      >
        <div class="flex items-center gap-3">
          <div class="skeleton h-3 w-3/4 rounded" />
        </div>
      </li>
    </template>
    <!-- No results -->
    <li
      v-else-if="options?.length === 0"
      tabindex="-1"
      class="pointer-events-none"
    >
      <span class="px-3 py-2 text-sm opacity-50 italic">
        No results found
      </span>
    </li>

    <!-- Result items -->
    <template v-else>
      <li
        v-for="(item, i) in options"
        :key="item.value"
        :data-index="i"
        role="option"
        :aria-selected="i === activeIndex"
        :aria-disabled="item.disabled"
        @mousedown.prevent="!item.disabled && select(item)"
        @mousemove="!item.disabled && (activeIndex = i)"
      >
        <a
          class="text-sm flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-base-content no-underline transition-colors duration-100"
          :class="{
            'opacity-40 cursor-not-allowed': item.disabled,
            'cursor-pointer': !item.disabled,
            'bg-base-200': !item.disabled && i === activeIndex,
            'bg-base-300': isActive(item),
            'hover:bg-base-200': !item.disabled && i !== activeIndex,
          }"
        >
          <!-- Highlight matching text -->
          <span
            class="whitespace-nowrap"
            v-html="highlight(isActive(item), item.label, query)"
          />
          <!-- Active checkmark -->
          <svg
            v-if="isActive(item)"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 shrink-0 opacity-80 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </a>
      </li>
    </template>
  </ul>
</template>
<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue';

import {
  ListProperties,
  ListResultsEmits,
  type OptionValue,
} from './ListResults.properties';

const props = defineProps(ListProperties);
const activeIndex = ref(-1);
const listRef = ref<HTMLUListElement>();

const emits = defineEmits(ListResultsEmits);

watch(
  () => props.options,
  () => {
    activeIndex.value = -1;
  },
);

function scrollToActive() {
  nextTick(() => {
    const el = listRef.value?.querySelector(
      `[data-index="${activeIndex.value}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  });
}

function handleKeydown(e: KeyboardEvent) {
  const len = props.options?.length ?? 0;
  if (!len) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      activeIndex.value = (activeIndex.value + 1) % len;
      scrollToActive();
      break;
    case 'ArrowUp':
      e.preventDefault();
      activeIndex.value =
        activeIndex.value <= 0 ? len - 1 : activeIndex.value - 1;
      scrollToActive();
      break;
    case 'Enter':
      e.preventDefault();
      if (activeIndex.value >= 0 && activeIndex.value < len) {
        const item = props.options![activeIndex.value];
        if (!item.disabled) select(item);
      }
      break;
  }
}

function select(item: OptionValue) {
  activeIndex.value = -1;
  emits('select', item);
}

defineExpose({ handleKeydown });
</script>

<script lang="ts">
// ─── Highlight helper (outside setup so it's available in template) ───────────
export function highlight(isActive: boolean, text: string, query: string) {
  if (isActive || !query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-warning/40 text-inherit rounded-sm px-0.5">$1</mark>',
  );
}
</script>
