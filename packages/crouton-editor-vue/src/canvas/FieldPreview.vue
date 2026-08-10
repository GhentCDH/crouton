<script setup lang="ts">
import { ref } from 'vue';

import {
  Checkbox,
  Input,
  InputNumber,
  MultiSelect,
  SelectComponent,
  Textarea,
} from '@ghentcdh/ui';

import { FieldPreviewProperties } from './FieldPreview.properties';

const props = defineProps(FieldPreviewProperties);

// Purely decorative — gives every control something visible to render
// without implying any of this is real, saved data.
const previewValue = ref<unknown>(
  (() => {
    switch (props.type) {
      case 'number':
      case 'Integer':
        return 0;
      case 'boolean':
        return false;
      case 'mutliSelect':
        return [];
      case 'select':
        return props.selectOptions[0]?.value ?? '';
      default:
        return props.value;
    }
  })(),
);
</script>

<template>
  <Input
    v-if="type === 'string'"
    v-model="previewValue as string"
    size="sm"
    :enabled="false"
  />
  <Textarea
    v-else-if="type === 'textarea' || type === 'markdown'"
    v-model="previewValue as string"
    size="sm"
    :rows="type === 'markdown' ? 4 : 3"
    :enabled="false"
  />
  <InputNumber
    v-else-if="type === 'number' || type === 'Integer'"
    v-model="previewValue as number"
    size="sm"
    :enabled="false"
  />
  <Checkbox
    v-else-if="type === 'boolean'"
    v-model="previewValue as boolean"
    :enabled="false"
  />
  <SelectComponent
    v-else-if="type === 'select'"
    size="sm"
    :value="previewValue"
    :options="
      selectOptions.length
        ? selectOptions
        : [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
          ]
    "
    :clearable="false"
    :enabled="false"
  />
  <MultiSelect
    v-else-if="type === 'mutliSelect'"
    v-model="previewValue as unknown[]"
    size="sm"
    :options="
      selectOptions.length
        ? selectOptions
        : [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
          ]
    "
    :enabled="false"
  />
  <div v-else class="text-xs opacity-40 italic py-1">
    No preview for "{{ type }}"
  </div>
</template>