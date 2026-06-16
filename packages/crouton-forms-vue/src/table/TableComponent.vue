<template>
  <Table
    v-bind="properties"
    :display-columns="displayColumns"
    :page="hidePagination ? undefined : page"
    @sort="(id: string) => emits('sort', id)"
    @update-page="(page: number) => emits('updatePage', page)"
    @update-page-size="(size: number) => emits('updatePageSize', size)"
    @selection-change="(e: any) => emits('selectionChange', e)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { ColumnDef, TextCellType } from '@ghentcdh/crouton-core';
import { findColumnDef } from '@ghentcdh/crouton-core';
import { Table } from '@ghentcdh/ui';

import {
  TableComponentEmits,
  TableComponentProperties,
} from './TableComponent.properties';
import { defaultCellRenderers, findCellRenderer } from './cells';

const properties = defineProps(TableComponentProperties);
const emits = defineEmits(TableComponentEmits);

const allRenderers = computed(() => [
  ...(properties.cellRenderers ?? []),
  ...defaultCellRenderers,
]);

const displayColumns = computed(() =>
  properties.uiSchema.elements.map((e) => {
    const element = e as TextCellType;
    const def = findColumnDef(element, properties.schema);
    const type = Array.isArray(def.type) ? def.type[0] : def.type;
    const component = findCellRenderer(allRenderers.value, element);

    if (!component)
      console.warn('No cell renderer found for', element.type, element.options?.format);

    return {
      ...def,
      label: e.options?.label ?? def.id,
      type,
      component,
    } as ColumnDef & { component: any };
  }),
);
</script>
