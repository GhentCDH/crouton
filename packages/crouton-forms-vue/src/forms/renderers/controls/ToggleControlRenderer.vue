<template>
  <ControlWrapper v-bind="wrapper">
    <div class="join">
      <Btn
        v-for="(opt, i) in toggleOptions"
        :key="optionValue(opt) ?? i"
        class="join-item"
        :size="(appliedOptions as any).size ?? 'sm'"
        :color="isActive(opt) ? ((appliedOptions as any).color ?? 'primary') : 'blank'"
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

import { Btn, ControlWrapper } from '@ghentcdh/ui';

import { useSelectBinding } from './composables/useSelectBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onChange: onFieldChange,
  appliedOptions,
} = useSelectBinding(props.uischema, props.schema);

const labelKey = computed(() => (appliedOptions.value as any).labelKey ?? 'label');
const valueKey = computed(() => (appliedOptions.value as any).valueKey ?? 'value');

const toggleOptions = computed<any[]>(() => {
  const opts = appliedOptions.value as any;
  return opts.options ?? opts.values ?? [];
});

const optionLabel = (opt: any) =>
  opt && typeof opt === 'object' ? opt[labelKey.value] : opt;

const optionValue = (opt: any) =>
  opt && typeof opt === 'object' ? opt[valueKey.value] : opt;

// The stored value is either a scalar (storeValue) or the whole option object.
const currentValue = computed(() => {
  const v = value.value as any;
  return v && typeof v === 'object' ? v[valueKey.value] : v;
});

const isActive = (opt: any) => optionValue(opt) === currentValue.value;

const onSelect = (opt: any) => {
  if (wrapper.value.enabled === false) return;
  const opts = appliedOptions.value as any;
  const clearable = opts.clearable ?? true;

  // Toggle off when clicking the active option and clearing is allowed.
  if (clearable && isActive(opt)) {
    field.setValue(undefined);
    onFieldChange();
    return;
  }

  const stored = opts.storeValue ? optionValue(opt) : opt;
  field.setValue(stored);
  onFieldChange();
};
</script>
