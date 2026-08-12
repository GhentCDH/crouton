<script setup lang="ts">
import { ref } from 'vue';

import { Btn } from '@ghentcdh/ui';

import { CanvasDetailPanelProperties } from './CanvasDetailPanel.properties';
import ResourceFieldVariantEditor from '../components/ResourceFieldVariantEditor.vue';
import type { Tab } from '../types/resource-schema-editor.types';

const props = defineProps(CanvasDetailPanelProperties);

const emits = defineEmits<{
  close: [];
}>();

const activeTab = ref<Tab>(props.context);
</script>

<template>
  <div
    class="border-l border-base-300 bg-base-100 w-80 shrink-0 overflow-y-auto"
  >
    <div
      class="flex items-center justify-between p-3 border-b border-base-300"
    >
      <h3 class="text-sm font-semibold truncate">
        {{ col.label ?? col.column }}
      </h3>
      <Btn size="xs" @click="emits('close')">×</Btn>
    </div>
    <ResourceFieldVariantEditor
      :col="col"
      :drafts="drafts"
      :active-tab="activeTab"
      @update:active-tab="(t) => (activeTab = t)"
    />
  </div>
</template>
