<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from 'vue';

import { Btn, Checkbox, IconEnum, Input } from '@ghentcdh/ui';

const FormCanvasEditor = defineAsyncComponent(
  () => import('../canvas/FormCanvasEditor.vue'),
);
const TableCanvasEditor = defineAsyncComponent(
  () => import('../canvas/TableCanvasEditor.vue'),
);
import { ResourceColumnsEditorProperties } from './ResourceColumnsEditor.properties';
import ResourceFieldVariantEditor from './ResourceFieldVariantEditor.vue';
import {
  type EditableColumn,
  type Tab,
  visibleTabs,
} from '../types/resource-schema-editor.types';

const props = defineProps(ResourceColumnsEditorProperties);

/**
 * Table is the original, fully-established editor — kept as the default and
 * as a fallback. The visual modes are the drag-and-drop canvases for Form,
 * View, and (Phase 4) Table contexts.
 */
type ViewMode = 'table' | 'visual-form' | 'visual-view' | 'visual-table';
const viewMode = ref<ViewMode>('table');

const expandedId = ref<string | null>(null);
const activeTab = ref<Tab>('form');

const toggleExpand = (col: EditableColumn) => {
  if (expandedId.value === col.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = col.id;
  activeTab.value = visibleTabs(col)[0]?.key ?? 'form';
};

/**
 * Keeps `activeTab` valid as hiddenInForm/View/Table are toggled on the
 * expanded column — e.g. ticking "hidden in view" while the View tab is open
 * moves the selection to whatever tab is still visible instead of leaving it
 * pointed at a tab that just disappeared from the bar.
 */
watch(
  () => {
    const col = props.columns.find((c) => c.id === expandedId.value);
    return col ? visibleTabs(col).map((t) => t.key) : [];
  },
  (keys) => {
    if (keys.length && !keys.includes(activeTab.value)) {
      activeTab.value = keys[0];
    }
  },
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div role="tablist" class="flex gap-1 rounded-lg bg-base-200 p-1 text-sm w-fit">
      <button
        role="tab"
        class="rounded-md px-3 py-1.5 font-medium transition-colors"
        :class="viewMode === 'table' ? 'bg-base-100 shadow-sm' : 'hover:bg-base-300/50'"
        @click="viewMode = 'table'"
      >
        Table
      </button>
      <button
        role="tab"
        class="rounded-md px-3 py-1.5 font-medium transition-colors"
        :class="viewMode === 'visual-form' ? 'bg-base-100 shadow-sm' : 'hover:bg-base-300/50'"
        @click="viewMode = 'visual-form'"
      >
        Form
        <span class="ml-1.5 inline-flex items-center rounded-full bg-warning px-1.5 py-0.5 text-xs text-warning-content">beta</span>
      </button>
      <button
        role="tab"
        class="rounded-md px-3 py-1.5 font-medium transition-colors"
        :class="viewMode === 'visual-view' ? 'bg-base-100 shadow-sm' : 'hover:bg-base-300/50'"
        @click="viewMode = 'visual-view'"
      >
        View
        <span class="ml-1.5 inline-flex items-center rounded-full bg-warning px-1.5 py-0.5 text-xs text-warning-content">beta</span>
      </button>
      <button
        role="tab"
        class="rounded-md px-3 py-1.5 font-medium transition-colors"
        :class="viewMode === 'visual-table' ? 'bg-base-100 shadow-sm' : 'hover:bg-base-300/50'"
        @click="viewMode = 'visual-table'"
      >
        Columns
        <span class="ml-1.5 inline-flex items-center rounded-full bg-warning px-1.5 py-0.5 text-xs text-warning-content">beta</span>
      </button>
    </div>

    <FormCanvasEditor
      v-if="viewMode === 'visual-form'"
      :columns="columns"
      :drafts="drafts"
      context="form"
    />

    <FormCanvasEditor
      v-else-if="viewMode === 'visual-view'"
      :columns="columns"
      :drafts="drafts"
      context="view"
    />

    <TableCanvasEditor
      v-else-if="viewMode === 'visual-table'"
      :columns="columns"
      :drafts="drafts"
    />

    <table v-else class="table w-full">
      <thead>
        <tr>
          <th />
          <th>Label</th>
          <th>Column</th>
          <th>Hidden in table</th>
          <th>Hidden in form</th>
          <th>Hidden in view</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="col in columns" :key="col.id">
          <tr>
            <td>
              <Btn
                :icon="
                  expandedId === col.id
                    ? IconEnum.ChevronUp
                    : IconEnum.ChevronDown
                "
                color="secondary"
                :outline="true"
                size="sm"
                @click="toggleExpand(col)"
              />
            </td>
            <td>
              <Input v-model="col.label" size="sm" />
            </td>
            <td>
              <Input v-model="col.column" size="sm" />
            </td>
            <td class="text-center">
              <Checkbox v-model="col.hiddenInTable" />
            </td>
            <td class="text-center">
              <Checkbox v-model="col.hiddenInForm" />
            </td>
            <td class="text-center">
              <Checkbox v-model="col.hiddenInView" />
            </td>
          </tr>
          <tr v-if="expandedId === col.id">
            <td colspan="6" class="bg-base-200">
              <ResourceFieldVariantEditor
                v-if="drafts[col.id]"
                :col="col"
                :drafts="drafts[col.id]"
                v-model:active-tab="activeTab"
              />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>