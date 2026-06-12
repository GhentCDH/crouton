<template>
  <ReadonlyLabel v-bind="wrapper" :hide-errors="true">
    <div v-if="message" class="text-sm text-gray-400 italic py-2">
      {{ message }}
    </div>
    <div
      v-else-if="isInline"
      class="flex gap-2 items-center justify-between w-full"
    >
      <div>
        {{ displayValue }}
      </div>
      <div>
        <Btn
          size="xs"
          color="secondary"
          :icon="IconEnum.View"
          tooltip="View"
          @click="view(value)"
        />
      </div>
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
import { Btn, IconEnum } from '@ghentcdh/ui';
import { useRelationBinding } from './useRelationBinding';
import { computed } from 'vue';
import RelationButton from './RelationButton.vue';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { value, wrapper, appliedOptions, isInline, message, resource } =
  useRelationBinding(props.uischema, props.schema, true);

const displayKey = computed(() => {
  return props.uischema.options?.displayKey ?? 'id';
});
const descriptionKey = computed(() => {
  return props.uischema.options?.descriptionKey;
});
const view = (value) => {
  resource.value?.resourceModal.view(value);
};
</script>
