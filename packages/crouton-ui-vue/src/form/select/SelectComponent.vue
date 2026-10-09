<template>
  <SelectWrapper
    v-bind="properties"
    :options="values"
    :disabled="!enabled"
    :is-open="isOpen"
    :query="displayValue"
    :is-active="hasValue"
    :clearable="properties.clearable"
    @close="close"
    @select="select"
    @clear="clear"
  >
    <button
      type="button"
      class="truncate block text-left"
      :class="[style, width]"
      :aria-label="id"
      role="combobox"
      @click="isOpen = true"
    >
      {{ displayValue ?? 'Select value' }}
    </button>
  </SelectWrapper>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { OptionValue } from './ListResults.properties';
import { SelectProperties } from './SelectWrapper.properties';
import SelectWrapper from './SelectWrapper.vue';
import type { ControlEmits } from '../core/emits';
import { mergeStyles } from '../core/styles';
import { useOptions } from './composables/useOptions';
import { buildInputStyle } from '../core/utils/style';

const isOpen = ref(false);
const properties = defineProps(SelectProperties);
const emit = defineEmits<ControlEmits>();
const model = defineModel();

const optionsHelper = useOptions(properties);
const { options: values } = optionsHelper;

watch(
  () => properties.options,
  () => {
    optionsHelper.setOptions(properties.options);
  },
  { immediate: true },
);

const onChange = (event: unknown) => {
  emit('change', event);
};

// Accept either v-model/modelValue (object or string) or plain :value prop
const activeValue = computed(() => model.value ?? properties.value);

const displayValue = computed(() =>
  activeValue.value ? optionsHelper.getLabels(activeValue.value)[0] : '',
);

const styles = computed(() => mergeStyles(properties.styles));
const style = computed(() =>
  buildInputStyle(styles.value.control.select, properties),
);

const select = (result: OptionValue) => {
  const original = optionsHelper.getOriginal(result);
  model.value = original;
  isOpen.value = false;
  onChange(original);
};

const clear = () => {
  isOpen.value = false;

  model.value = null;
  onChange(undefined);
};

const hasValue = (item: OptionValue) => {
  const selectedValue = optionsHelper.getValues(activeValue.value)?.[0];
  return selectedValue === item.value;
};

const close = () => {
  isOpen.value = false;
};
</script>
