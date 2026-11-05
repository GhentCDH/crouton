<template>
  <ControlWrapper v-bind="properties">
    <textarea
      v-model="model"
      autocomplete="off"
      data-lpignore="true"
      data-bwignore="true"
      type="text"
      :aria-label="id"
      class="w-full"
      :class="style"
      :disabled="!enabled"
      :rows="rows"
      :dir="dir"
      :style="{ height: height, minHeight: minHeight }"
      :autofocus="isFocused"
      :placeholder="placeholder"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"
    />
  </ControlWrapper>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { TextareaEmits, TextareaProperties } from './Textarea.properties';
import ControlWrapper from './core/ControlWrapper.vue';
import { buildInputStyle } from './core/utils/style';

const properties = defineProps(TextareaProperties);
const emit = defineEmits(TextareaEmits);
const model = defineModel<string>();

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
  buildInputStyle(properties.styles.control.textarea, properties),
);
</script>
