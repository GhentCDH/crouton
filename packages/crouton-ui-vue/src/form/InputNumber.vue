<template>
  <ControlWrapper v-bind="properties">
    <input
      v-model="model"
      autocomplete="off"
      data-lpignore="true"
      data-bwignore="true"
      :aria-label="id"
      type="number"
      class="w-full"
      :class="[style]"
      :disabled="!enabled"
      :step="steps"
      :autofocus="isFocused"
      :placeholder="placeholder"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"
    >
  </ControlWrapper>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import Input from './Input.vue';
import {
  InputNumberEmits,
  InputNumberProperties,
} from './InputNumber.properties';
import ControlWrapper from './core/ControlWrapper.vue';
import { buildInputStyle } from './core/utils/style';

const properties = defineProps(InputNumberProperties);
const emit = defineEmits(InputNumberEmits);
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

const style = computed(() =>
  buildInputStyle(properties.styles?.control?.input, properties),
);
</script>
