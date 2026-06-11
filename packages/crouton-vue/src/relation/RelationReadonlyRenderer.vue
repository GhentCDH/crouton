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
          @click="view()"
        />
      </div>
    </div>
    <div v-else class="h-full overflow-auto w-full">
      <!-- Table view (default) -->
      <DisplayInline v-bind="resource" :options="appliedOptions" />
      <TableComponent
        v-if="resource"
        :id="`relation_${scope}`"
        :cell-renderers="customCellRenderers"
        v-bind="resource"
        :hide-pagination="resource.page.totalPages < 2"
      />
    </div>
  </ReadonlyLabel>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { ReadonlyLabel, TableComponent } from '@ghentcdh/json-forms-vue';
import { Btn, IconEnum } from '@ghentcdh/ui';
import { customCellRenderers } from '../table/cells';
import { useRelationBinding } from './useRelationBinding';
import { computed } from 'vue';
import DisplayInline from './DisplayInline.vue';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { value, wrapper, appliedOptions, isInline, message, resource } =
  useRelationBinding(props.uischema, props.schema, true);

const displayValue = computed(() => {
  return value.value[appliedOptions.value.labelKey] as string;
});

const view = () => {
  const id = value.value[appliedOptions.value.idKey];
  resource.value?.resourceModal.view(id);
};
</script>
