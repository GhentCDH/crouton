<template>
  <div
    ref="selectWrapperRef"
    :aria-label="id"
    role="select"
  >
    <ControlWrapper v-bind="props">
      <div class="flex items-center w-full">
        <div
          ref="inputWrapperRef"
          class="relative w-full"
          @keydown="onKeydown"
        >
          <div class="overflow-hidden w-full">
            <slot />
          </div>
          <!-- Right icons -->
          <div
            class="absolute inset-y-0 right-0 flex items-center pr-3 gap-1 pointer-events-none"
          >
            <span
              v-if="isLoading && !label"
              class="loading loading-spinner loading-xs text-primary pointer-events-none"
            />

            <!-- Clear button -->
            <button
              v-if="query && !isLoading && clearable"
              type="button"
              class="pointer-events-auto btn btn-ghost btn-xs btn-circle opacity-60 hover:opacity-100"
              tabindex="-1"
              aria-label="Clear"
              @mousedown.prevent="clear"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <!-- Chevron -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 opacity-40 transition-transform duration-200"
              :class="{ 'rotate-180': isOpen }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          <!-- Dropdown -->
          <Teleport :to="teleportTarget">
            <Transition
              enter-active-class="transition-all duration-150 ease-out"
              enter-from-class="opacity-0 -translate-y-1 scale-y-95"
              enter-to-class="opacity-100 translate-y-0 scale-y-100"
              leave-active-class="transition-all duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-y-100"
              leave-to-class="opacity-0 -translate-y-1 scale-y-95"
            >
              <ListResults
                v-if="isOpen"
                ref="listResultsRef"
                :teleported="true"
                :style="dropdownStyle"
                :query="undefined"
                :options="options"
                :is-loading="isLoading"
                :is-active="isActive"
                @select="emits('select', $event)"
              />
            </Transition>
          </Teleport>
        </div>
        <Btn
          v-if="enableCreate"
          :icon="IconEnum.Plus"
          :color="Color.blank"
          size="lg"
          tooltip="Create new"
          aria-label="create"
          @click="emits('create')"
        />
      </div>
    </ControlWrapper>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

import ListResults from './ListResults.vue';
import {
  SelectWrapperEmits,
  SelectWrapperProperties,
} from './SelectWrapper.properties';
import Btn from '../../button/btn.vue';
import { Color } from '../../const/colors';
import { IconEnum } from '../../icons/icon-list';
import ControlWrapper from '../core/ControlWrapper.vue';

const props = defineProps(SelectWrapperProperties);

const selectWrapperRef = ref<HTMLElement>();
const inputWrapperRef = ref<HTMLElement>();
const listResultsRef = ref<InstanceType<typeof ListResults>>();
const emits = defineEmits(SelectWrapperEmits);

// Teleport target: the nearest <dialog> ancestor when inside a modal (to stay in the
// browser top layer), otherwise fall back to body.
const teleportTarget = ref<string | Element>('body');

const dropdownStyle = computed(() => {
  // Use the input row ref so the dropdown aligns with the bottom of the input,
  // not the bottom of the full component (which includes the label).
  const anchor = inputWrapperRef.value ?? selectWrapperRef.value;
  if (!anchor) return {};
  const rect = anchor.getBoundingClientRect();
  return {
    position: 'fixed' as const,
    zIndex: 9999,
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  };
});

const clear = () => {
  close();
  emits('clear');
};
const close = () => {
  emits('close');
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    close();
    return;
  }
  listResultsRef.value?.handleKeydown(e);
};

const handleOutsideClick = (e: MouseEvent) => {
  if (
    selectWrapperRef.value &&
    !selectWrapperRef.value.contains(e.target as Node)
  ) {
    close();
  }
};
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  // If we're inside a native dialog, teleport there so we stay in the top layer
  const dialog = selectWrapperRef.value?.closest('dialog');
  if (dialog) teleportTarget.value = dialog;
});
onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>
