<template>
  <ReadonlyLabel v-bind="wrapper" :hide-errors="true">
    <div v-if="message" class="text-sm text-gray-400 italic py-2">
      {{ message }}
    </div>
    <div
      v-else-if="isInline"
      class="flex gap-2 items-center justify-between w-full"
    >
      <RelationButton
        :key="value"
        :options="appliedOptions"
        :value="value"
        @view="view"
      />
    </div>
    <div v-else class="flex flex-wrap gap-2">
      <RelationButton
        v-for="v of value"
        :key="v"
        :options="appliedOptions"
        :value="v"
        @view="view"
      />
    </div>
  </ReadonlyLabel>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { ReadonlyLabel } from '@ghentcdh/json-forms-vue';
import { useRelationBinding } from './useRelationBinding';
import { computed } from 'vue';
import RelationButton from './RelationButton.vue';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { value, wrapper, appliedOptions, isInline, message, resource } =
  useRelationBinding(props.uischema, props.schema, true);

const displayKey = computed(() => {
  return props.uischema.options?.displayKey ?? 'id';
});

const view = (value: unknown) => {
  resource.value?.resourceModal.view(value);
};
</script>
