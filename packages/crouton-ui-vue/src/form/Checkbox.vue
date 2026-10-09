<template>
  <div class="flex items-center justify-center h-full">
    <ControlWrapper
      v-bind="properties"
      :hide-label="true"
    >
      <label class="fieldset-label">
        <input
          v-model="model"
          :aria-label="id"
          role="checkbox"
          type="checkbox"
          :class="style"
          :disabled="!enabled"
          @change="onChange"
          @focus="onFocus"
          @blur="onBlur"
        >
        <span class="font-bold text-gray-500 text-sm"> {{ label }}</span>
      </label>
    </ControlWrapper>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { CheckboxEmits, CheckboxProperties } from './Checkbox.properties';
import Input from './Input.vue';
import ControlWrapper from './core/ControlWrapper.vue';
import { buildInputStyle } from './core/utils/style';

const properties = defineProps(CheckboxProperties);
const emit = defineEmits(CheckboxEmits);
const model = defineModel();

const onChange = (event: Event) => {
  emit('change', model.value);
};
const onFocus = (event: FocusEvent) => {
  emit('focus', event);
};
const onBlur = (event: Event) => {
  emit('blur', event);
};

const style = computed(() =>
  buildInputStyle(properties.styles.control.checkbox, properties),
);
</script>
