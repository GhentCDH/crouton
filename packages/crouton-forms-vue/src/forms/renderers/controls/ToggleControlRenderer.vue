<template>
  <ControlWrapper v-bind="wrapper">
    <div class="join">
      <Btn
        v-for="(opt, i) in toggleOptions"
        :key="optionValue(opt) ?? i"
        class="join-item"
        :size="toggleSize ?? 'sm'"
        :color="isActive(opt) ? (toggleColor ?? 'primary') : 'blank'"
        :outline="!isActive(opt)"
        :disabled="wrapper.enabled === false"
        @click="onSelect(opt)"
      >
        {{ optionLabel(opt) }}
      </Btn>
    </div>
  </ControlWrapper>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import type { ControlOptions } from '@ghentcdh/crouton-core';
import { computed } from 'vue';

import { Btn, ControlWrapper, type Color, type Size } from '@ghentcdh/crouton-ui-vue';

import { useCustomControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onChange: onFieldChange,
  appliedOptions,
} = useCustomControlBinding<ControlOptions<'toggle'>>()(props.uischema, props.schema);

const labelKey = computed(() => appliedOptions.value?.labelKey ?? 'label');
const valueKey = computed(() => appliedOptions.value?.valueKey ?? 'value');
const toggleSize = computed<Size | undefined>(() => appliedOptions.value?.size as Size | undefined);
const toggleColor = computed<`${Color}` | undefined>(() => appliedOptions.value?.color as `${Color}` | undefined);

const toggleOptions = computed<unknown[]>(() =>
  appliedOptions.value?.options ?? appliedOptions.value?.values ?? []
);

const optionLabel = (opt: unknown) =>
  opt && typeof opt === 'object' ? (opt as Record<string, unknown>)[labelKey.value] : opt;

const optionValue = (opt: unknown): PropertyKey | undefined => {
  const v = opt && typeof opt === 'object' ? (opt as Record<string, unknown>)[valueKey.value] : opt;
  return v as PropertyKey | undefined;
};

// The stored value is either a scalar (storeValue) or the whole option object.
const currentValue = computed(() => {
  const v = value.value;
  return v && typeof v === 'object' ? (v as Record<string, unknown>)[valueKey.value] : v;
});

const isActive = (opt: unknown) => optionValue(opt) === currentValue.value;

const onSelect = (opt: unknown) => {
  if ((wrapper.value as { enabled?: boolean }).enabled === false) return;
  const clearable = appliedOptions.value?.clearable ?? true;

  // Toggle off when clicking the active option and clearing is allowed.
  if (clearable && isActive(opt)) {
    field.setValue(undefined);
    onFieldChange();
    return;
  }

  const stored = appliedOptions.value?.storeValue ? optionValue(opt) : opt;
  field.setValue(stored);
  onFieldChange();
};
</script>
