<template>
  <ControlWrapper v-bind="wrapper">
    <div v-if="message" class="text-sm text-secondary italic py-2">
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
  </ControlWrapper>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { Btn, ControlWrapper } from '@ghentcdh/ui';
import { computed } from 'vue';
import { useRelationBinding } from './useRelationBinding';
import RelationButton from './RelationButton.vue';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  value,
  wrapper,
  message: _message,
  resource,
  scope,
  isNew,
  appliedOptions,
} = useRelationBinding(props.uischema, props.schema);

const message = computed(() => {
  if (isNew.value)
    return `Create first the main object to manage the relations.`;
  return _message;
});

const operations = computed(() => {
  const operations = resource.value?.operations ?? {};
  const resourceModal = resource.value?.resourceModal ?? {};
  const ops = {
    onView: (value) => {
      resourceModal.view(value);
    },
  };
  if (operations.update) ops['onEdit'] = resourceModal.edit;
  if (operations.delete) ops['onDelete'] = resourceModal.delete;
  return ops;
});
</script>
