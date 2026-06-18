<template>
  <ControlLabel v-bind="wrapper">
    <div v-if="message" class="text-sm text-gray-500 italic py-2">
      {{ message }}
    </div>
    <div v-if="!message && resource">
      <div class="flex flex-wrap gap-2 mb-2">
        <RelationButton
          v-for="v of value"
          :key="v"
          :options="appliedOptions"
          :value="v"
          v-bind="operations"
        />
      </div>
      <div>
        <Btn
          v-if="resource.operations?.create"
          icon="Plus"
          size="xs"
          @click="resource.resourceModal?.create()"
        >
          Add
        </Btn>
      </div>
    </div>
  </ControlLabel>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { Btn } from '@ghentcdh/ui';
import { computed } from 'vue';
import { useRelationBinding } from './useRelationBinding';
import RelationButton from './RelationButton.vue';
import { ControlLabel, useFormEvents } from '@ghentcdh/crouton-forms-vue';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const formEvents = useFormEvents();
const {
  value,
  wrapper,
  message: _message,
  resource,
  isNew,
  appliedOptions,
} = useRelationBinding(props.uischema, props.schema, false, formEvents);

const message = computed(() => {
  if (isNew.value)
    return `Create first the main object to manage the relations.`;
  return _message;
});

const operations = computed(() => {
  const ops: Record<string, (value: unknown) => void> = {
    onView: (value: unknown) => {
      resource.value?.resourceModal.view(value);
    },
  };
  const resourceModal = resource.value?.resourceModal;
  if (!resourceModal) return ops;
  if (resource.value?.operations.update) ops['onEdit'] = resourceModal.edit;
  if (resource.value?.operations.delete) ops['onDelete'] = resourceModal.delete;
  return ops;
});
</script>
