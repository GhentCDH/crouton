<template>
  <div class="flex gap-2 items-center">
    <SelectComponent
      size="sm"
      :value="modelValue.key"
      :options="fields"
      :clearable="false"
      @change="onFieldChange($event.value)"
    />
    <SelectComponent
      size="sm"
      :value="modelValue.operator"
      :options="operatorOptions"
      :clearable="false"
      @change="onOperatorChange($event.value)"
    />
    <SelectComponent
      v-if="!noValue && currentField?.type === 'enum'"
      size="sm"
      :value="modelValue.value"
      :options="currentField.values ?? []"
      :clearable="false"
      @change="update('value', $event.value)"
    />
    <Input
      v-else-if="!noValue"
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

import {
  type FieldType,
  type Filter,
  OperatorNoValue,
  OperatorOptions,
  OperatorsByType,
  type OperatorType,
} from '@ghentcdh/crouton-core';
import { Btn, IconEnum, Input, SelectComponent } from '@ghentcdh/ui';

export type EnumValue = { value: unknown; label: string };

export type FieldOption = {
  label: string;
  value: string;
  type?: FieldType;
  values?: EnumValue[];
};

const props = defineProps<{
  modelValue: Filter;
  fields: FieldOption[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Filter];
  remove: [];
}>();

const currentField = computed(() =>
  props.fields.find((f) => f.value === props.modelValue.key),
);

const operatorOptions = computed(() => {
  const type = currentField.value?.type ?? 'string';
  const allowed = OperatorsByType[type];
  return OperatorOptions.filter((o) => allowed.includes(o.value));
});

const noValue = computed(() => OperatorNoValue.has(props.modelValue.operator));

const update = (key: keyof Filter, value: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

/** When switching field, reset operator to first valid one for the new field type. */
const onFieldChange = (key: string) => {
  const field = props.fields.find((f) => f.value === key);
  const type = field?.type ?? 'string';
  const validOps = OperatorsByType[type];
  const currentOp = props.modelValue.operator;
  const op: OperatorType = validOps.includes(currentOp) ? currentOp : validOps[0];
  emit('update:modelValue', { ...props.modelValue, key, operator: op, value: '' });
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
