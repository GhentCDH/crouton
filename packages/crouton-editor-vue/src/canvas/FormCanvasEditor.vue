<script setup lang="ts">
import { computed, ref } from 'vue';

import { COLSPAN } from '@ghentcdh/crouton-forms-vue';

import { FormCanvasEditorProperties } from './FormCanvasEditor.properties';
import { useCanvasFieldOps } from './useCanvasFieldOps';
import CanvasShell from './CanvasShell.vue';
import FormFieldCard from './FormFieldCard.vue';

const props = defineProps(FormCanvasEditorProperties);

const {
  layout,
  orderedFields,
  onChangeType,
  onRemove,
  lastRemoved,
  undoRemove,
  onAddField,
  selectOptionsFor,
  typeOptionsFor,
} = useCanvasFieldOps(props, props.context);

const removeLabel = computed(() =>
  props.context === 'view' ? 'Remove from view' : 'Remove from form',
);

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
    :context="context"
    :selected-field-id="selectedFieldId"
    @update:selected-field-id="(id) => (selectedFieldId = id)"
    @undo="undoRemove"
    @add="onAddField"
  >
    <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
      <template v-for="element in orderedFields" :key="element.id">
        <div :class="COLSPAN[element.colspan] ?? COLSPAN[12]">
          <FormFieldCard
            :field="element"
            :type-options="typeOptionsFor(element.type)"
            :select-options="selectOptionsFor(element.id)"
            :remove-label="removeLabel"
            :selected="selectedFieldId === element.id"
            @change-type="(t) => onChangeType(element.id, t)"
            @remove="onRemove(element.id)"
            @select="onSelect(element.id)"
          />
        </div>
      </template>
    </div>
  </CanvasShell>
</template>