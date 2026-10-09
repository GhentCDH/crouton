<template>
  <SelectWrapper
    v-bind="properties"
    :options="values"
    :is-open="isOpen"
    :disabled="!enabled"
    :query="undefined"
    :is-active="hasValue"
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
      {{ displayValues ?? 'Select value' }}
    </button>
  </SelectWrapper>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { OptionValue } from './ListResults.properties';
import { SelectWrapperProperties } from './SelectWrapper.properties';
import SelectWrapper from './SelectWrapper.vue';
import type { ControlEmits } from '../core/emits';
import { mergeStyles } from '../core/styles';
import { useOptions } from './composables/useOptions';
import { buildInputStyle } from '../core/utils/style';

const isOpen = ref(false);

const properties = defineProps(SelectWrapperProperties);

const emit = defineEmits<ControlEmits>();
const model = defineModel<any[]>();

const onChange = (event: Event) => {
  emit('change', event);
};
const optionsHelper = useOptions(properties);
const { options: values } = optionsHelper;

watch(
  () => properties.options,
  () => {
    optionsHelper.setOptions(properties.options);
  },
  { immediate: true },
);

const displayValues = computed(() =>
  model.value ? optionsHelper.getLabels(...model.value).join(', ') : undefined,
);
const selectedValues = computed(() =>
  optionsHelper.getValues(...(model.value ?? [])),
);

const select = (result: OptionValue) => {
  let selection = model.value ?? [];

  if (hasValue(result))
    selection = selection.filter(
      (s) => optionsHelper.getOption(s)?.value !== result.value,
    );
  else {
    const original = optionsHelper.getOriginal(result);
    selection.push(original);
  }

  model.value = selection;
  onChange(selection as any);
};

const clear = () => {
  isOpen.value = false;

  model.value = [];
  onChange([] as any);
};

const close = () => {
  isOpen.value = false;
};

const hasValue = (item: OptionValue) =>
  selectedValues.value?.includes(item.value) ?? false;

const styles = computed(() => mergeStyles(properties.styles));
const style = computed(() =>
  buildInputStyle(styles.value.control.select, properties),
);
</script>
