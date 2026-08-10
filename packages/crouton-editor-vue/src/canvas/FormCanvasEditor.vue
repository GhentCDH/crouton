<script setup lang="ts">
import { computed, ref } from 'vue';
import draggable from 'vuedraggable';

import { COLSPAN } from '@ghentcdh/crouton-forms-vue';

import { FormCanvasEditorProperties } from './FormCanvasEditor.properties';
import type { CanvasField } from './canvas-layout';
import { useCanvasFieldOps } from './useCanvasFieldOps';
import CanvasShell from './CanvasShell.vue';
import FormFieldCard from './FormFieldCard.vue';

const props = defineProps(FormCanvasEditorProperties);

const {
  layout,
  orderedFields,
  onDragEnd,
  onColspanUpdate,
  onChangeType,
  onRemove,
  lastRemoved,
  undoRemove,
  onAddField,
  selectOptionsFor,
  typeOptionsFor,
} = useCanvasFieldOps(props, props.context);

const gridRoot = ref<InstanceType<typeof draggable> | null>(null);
const gridEl = computed<HTMLElement | null>(
  () => (gridRoot.value as unknown as { $el?: HTMLElement })?.$el ?? null,
);

const removeLabel = computed(() =>
  props.context === 'view' ? 'Remove from view' : 'Remove from form',
);
</script>

<template>
  <CanvasShell
    :last-removed="lastRemoved"
    :hidden-fields="layout.hiddenFields"
    :excluded-count="layout.excludedCount"
    :has-fields="!!orderedFields.length"
    @undo="undoRemove"
    @add="onAddField"
  >
    <draggable
      ref="gridRoot"
      v-model="orderedFields"
      item-key="id"
      handle=".drag-handle"
      tag="div"
      class="grid grid-cols-1 gap-3 md:grid-cols-12"
      @end="onDragEnd"
    >
      <template #item="{ element }: { element: CanvasField }">
        <div :class="COLSPAN[element.colspan] ?? COLSPAN[12]">
          <FormFieldCard
            :field="element"
            :type-options="typeOptionsFor(element.type)"
            :select-options="selectOptionsFor(element.id)"
            :grid-el="gridEl"
            :remove-label="removeLabel"
            @update:colspan="(n) => onColspanUpdate!(element.id, n)"
            @change-type="(t) => onChangeType(element.id, t)"
            @remove="onRemove(element.id)"
          />
        </div>
      </template>
    </draggable>
  </CanvasShell>
</template>