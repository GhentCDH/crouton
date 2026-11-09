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
import { computed } from 'vue';

import { Btn, ControlWrapper, type Color, type Size } from '@ghentcdh/crouton-ui-vue';

import { useSelectBinding } from './composables/useSelectBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

type ToggleOpts = {
  labelKey?: string;
  valueKey?: string;
  options?: unknown[];
  values?: unknown[];
  storeValue?: boolean;
  clearable?: boolean;
  color?: `${Color}`;
  size?: Size;
};

const {
  wrapper,
  value,
  field,
  onChange: onFieldChange,
  appliedOptions,
} = useSelectBinding(props.uischema, props.schema);

const opts = computed(() => appliedOptions.value as ToggleOpts);
const labelKey = computed(() => opts.value.labelKey ?? 'label');
const valueKey = computed(() => opts.value.valueKey ?? 'value');
const toggleSize = computed(() => opts.value.size);
const toggleColor = computed(() => opts.value.color);

const toggleOptions = computed<unknown[]>(() => opts.value.options ?? opts.value.values ?? []);

const optionLabel = (opt: unknown): unknown =>
  opt && typeof opt === 'object' ? (opt as Record<string, unknown>)[labelKey.value] : opt;

const optionValue = (opt: unknown): PropertyKey | undefined => {
  const v = opt && typeof opt === 'object' ? (opt as Record<string, unknown>)[valueKey.value] : opt;
  return v as PropertyKey | undefined;
};

// The stored value is either a scalar (storeValue) or the whole option object.
const currentValue = computed<unknown>(() => {
  const v = value.value;
  return v && typeof v === 'object' ? (v as Record<string, unknown>)[valueKey.value] : v;
});

const isActive = (opt: unknown) => optionValue(opt) === currentValue.value;

const onSelect = (opt: unknown) => {
  if ((wrapper.value as { enabled?: boolean }).enabled === false) return;
  const clearable = opts.value.clearable ?? true;

  // Toggle off when clicking the active option and clearing is allowed.
  if (clearable && isActive(opt)) {
    field.setValue(undefined);
    onFieldChange();
    return;
  }

  const stored = opts.value.storeValue ? optionValue(opt) : opt;
  field.setValue(stored);
  onFieldChange();
};
</script>
