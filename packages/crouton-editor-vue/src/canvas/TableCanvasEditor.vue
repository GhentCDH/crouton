<script setup lang="ts">
import { ref } from 'vue';
import draggable from 'vuedraggable';

import { TableCanvasEditorProperties } from './TableCanvasEditor.properties';
import type { CanvasField } from './canvas-layout';
import { useCanvasFieldOps } from './useCanvasFieldOps';
import CanvasShell from './CanvasShell.vue';
import TableColumnChip from './TableColumnChip.vue';

const props = defineProps(TableCanvasEditorProperties);

const {
  layout,
  orderedFields,
  onDragEnd,
  onChangeType,
  onRemove,
  lastRemoved,
  undoRemove,
  onAddField,
  typeOptionsFor,
} = useCanvasFieldOps(props, 'table', { supportsColspan: false });

const selectedFieldId = ref<string | null>(null);

const onSelect = (id: string) => {
  selectedFieldId.value = selectedFieldId.value === id ? null : id;
};
</script>

<template>
  <CanvasShell
    :last-removed="lastRemoved"
    :hidden-fields="layout.hiddenFields"
    :has-fields="!!orderedFields.length"
    :columns="columns"
    :drafts="drafts"
    context="table"
    :selected-field-id="selectedFieldId"
    warning-text="Table visual mode is new and less proven than Form/View — drag to reorder columns, use the menu to change type or hide. Switch back to Table if something looks wrong."
    empty-text="No columns to lay out — add one below, or edit columns in the Table view."
    @update:selected-field-id="(id) => (selectedFieldId = id)"
    @undo="undoRemove"
    @add="onAddField"
  >
    <draggable
      v-model="orderedFields"
      item-key="id"
      handle=".drag-handle"
      tag="div"
      class="flex flex-wrap gap-2"
      @end="onDragEnd"
    >
      <template #item="{ element }: { element: CanvasField }">
        <TableColumnChip
          :field="element"
          :type-options="typeOptionsFor(element.type)"
          :selected="selectedFieldId === element.id"
          @change-type="(t) => onChangeType(element.id, t)"
          @remove="onRemove(element.id)"
          @select="onSelect(element.id)"
        />
      </template>
    </draggable>
  </CanvasShell>
</template>