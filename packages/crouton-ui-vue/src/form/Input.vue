<template>
  <ControlWrapper v-bind="properties">
    <div class="relative w-full">
      <input
        v-model="model"
        :aria-label="id"
        autocomplete="off"
        data-lpignore="true"
        data-bwignore="true"
        :type="type"
        :class="[style, { 'pr-7': clearable && model }]"
        class="!w-full"
        :disabled="!enabled"
        :autofocus="isFocused"
        :placeholder="placeholder"
        @change="onChange"
        @focus="onFocus"
        @blur="onBlur"
      >
      <button
        v-if="clearable && model"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center pr-2 btn btn-ghost btn-xs btn-circle opacity-60 hover:opacity-100"
        tabindex="-1"
        aria-label="Clear"
        @mousedown.prevent="onClear"
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
    </div>
  </ControlWrapper>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { InputEmits, InputProperties } from './Input.properties';
import ControlWrapper from './core/ControlWrapper.vue';
import { buildInputStyle } from './core/utils/style';

const properties = defineProps(InputProperties);
const emit = defineEmits(InputEmits);
const model = defineModel();

const onChange = (event: Event) => {
  emit('change', event);
};
const onFocus = (event: FocusEvent) => {
  emit('focus', event);
};
const onBlur = (event: Event) => {
  emit('blur', event);
};
const onClear = () => {
  model.value = '';
  emit('clear');
};
const style = computed(() =>
  buildInputStyle(properties.styles.control.input, properties),
);
</script>
