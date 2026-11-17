<template>
  <div>
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
              v-if="query && !isLoading && clearable && enabled"
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

          <!-- Dropdown: a top-layer popover, so no teleport is needed to escape
               overflow clipping or a surrounding modal <dialog>. -->
          <div
            ref="popoverRef"
            popover="manual"
            class="m-0 p-0 border-0 bg-transparent overflow-visible z-[9999]"
            :style="popoverStyle"
          >
            <Transition
              enter-active-class="transition-all duration-150 ease-out"
              enter-from-class="opacity-0 -translate-y-1 scale-y-95"
              enter-to-class="opacity-100 translate-y-0 scale-y-100"
            >
              <ListResults
                v-if="isOpen"
                ref="listResultsRef"
                :teleported="true"
                :query="undefined"
                :options="typedOptions"
                :is-loading="isLoading"
                :is-active="isActive"
                @select="emits('select', $event)"
              />
            </Transition>
          </div>
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
import { computed, ref, toRef } from 'vue';

import ListResults from './ListResults.vue';
import type { OptionValue } from './ListResults.properties';
import {
  SelectWrapperEmits,
  SelectWrapperProperties,
} from './SelectWrapper.properties';
import Btn from '../../button/btn.vue';
import { useAnchoredPopover } from '../../composables/useAnchoredPopover';
import { Color } from '../../const/colors';
import { IconEnum } from '../../icons/icon-list';
import ControlWrapper from '../core/ControlWrapper.vue';

const props = defineProps(SelectWrapperProperties);
const typedOptions = computed(() => props.options as OptionValue[]);

const inputWrapperRef = ref<HTMLElement>();
const popoverRef = ref<HTMLElement>();
const listResultsRef = ref<InstanceType<typeof ListResults>>();
const emits = defineEmits(SelectWrapperEmits);

// Anchor on the input row so the dropdown sits under the input, not the label.
const { style: popoverStyle } = useAnchoredPopover({
  anchorRef: inputWrapperRef,
  popoverRef,
  isOpen: toRef(props, 'isOpen'),
  onDismiss: () => emits('close'),
  matchWidth: true,
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
    // Only swallow Esc when it closes the dropdown; preventDefault() stops a
    // surrounding native <dialog> from also closing (stopPropagation does not).
    if (props.isOpen) {
      e.preventDefault();
      e.stopPropagation();
    }
    close();
    return;
  }
  listResultsRef.value?.handleKeydown(e);
};
</script>
