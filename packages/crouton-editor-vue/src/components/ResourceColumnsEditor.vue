<script setup lang="ts">
import { ref, watch } from 'vue';

import { Btn, Checkbox, IconEnum, Input } from '@ghentcdh/ui';

import FormCanvasEditor from '../canvas/FormCanvasEditor.vue';
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
 * as a fallback. Visual is the new drag-and-drop form canvas
 * (`LIVE_FORM_EDITOR_PLAN.md`), scoped to the Form context only; View/Table
 * contexts still only have the Table mode below.
 */
type ViewMode = 'table' | 'visual';
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
    <div role="tablist" class="tabs tabs-box tabs-sm w-fit">
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': viewMode === 'table' }"
        @click="viewMode = 'table'"
      >
        Table
      </a>
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': viewMode === 'visual' }"
        @click="viewMode = 'visual'"
      >
        Visual
        <span class="badge badge-warning badge-xs ml-1.5">beta</span>
      </a>
    </div>

    <FormCanvasEditor
      v-if="viewMode === 'visual'"
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
