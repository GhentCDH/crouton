<template>
  <ControlWrapper v-bind="wrapper">
    <div v-if="message" class="text-sm text-secondary italic py-2">
      {{ message }}
    </div>
    <div
      v-if="!message && resource"
      class="h-full overflow-auto flex flex-col gap-2"
    >
      <!-- Table view (default) -->
      <TableComponent
        :id="`relation_${scope}`"
        :cell-renderers="customCellRenderers"
        v-bind="resource"
        :hide-pagination="resource.page.totalPages < 2"
      />
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
import { TableComponent } from '@ghentcdh/json-forms-vue';
import { computed } from 'vue';

import { customCellRenderers } from '../table/cells';
import { useRelationBinding } from './useRelationBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  value,
  wrapper,
  message: _message,
  resource,
  scope,
  isNew,
} = useRelationBinding(props.uischema, props.schema);

const message = computed(() => {
  if (isNew.value)
    return `Create first the main object to manage the relations.`;
  return _message;
});
</script>
