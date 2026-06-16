<template>
  <div class="flex gap-2 items-center">
    <SelectComponent
      size="sm"
      :value="modelValue.key"
      :options="fields"
      :clearable="false"
      @change="update('key', $event.value)"
    />
    <SelectComponent
      size="sm"
      :value="modelValue.operator"
      :options="OperatorOptions"
      :clearable="false"
      @change="onOperatorChange($event.value)"
    />
    <Input
      v-if="!noValue"
      size="sm"
      placeholder="Enter a value"
      :value="modelValue.value"
      :clearable="true"
      @input="update('value', ($event.target as HTMLInputElement).value)"
    />
    <div
      v-else
      class="flex-1 min-w-0"
    />
    <Btn
      :icon="IconEnum.Delete"
      size="xs"
      :outline="true"
      color="error"
      :no-border="true"
      tooltip="Remove filter"
      @click="$emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { type Filter, OperatorNoValue, OperatorOptions, type OperatorType } from '@ghentcdh/crouton-core';
import { Btn, IconEnum, Input, SelectComponent } from '@ghentcdh/ui';

export type FieldOption = { label: string; value: string };

const props = defineProps<{
  modelValue: Filter;
  fields: FieldOption[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Filter];
  remove: [];
}>();

const noValue = computed(() => OperatorNoValue.has(props.modelValue.operator));

const update = (key: keyof Filter, value: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

/** When switching to a no-value operator, clear the value field. */
const onOperatorChange = (op: OperatorType) => {
  emit('update:modelValue', {
    ...props.modelValue,
    operator: op,
    value: OperatorNoValue.has(op) ? '' : props.modelValue.value,
  });
};
</script>
