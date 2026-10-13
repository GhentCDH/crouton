<script setup lang="ts">
import { computed } from 'vue';

import { Collapse } from '@ghentcdh/crouton-ui-vue';

import { useCrouton } from '../composables/useCrouton';
import { findCustomComponent } from '../utils/custom-component';
import { TableWrapperLayoutProperties } from './TableWrapperLayout.properties';

const props = defineProps(TableWrapperLayoutProperties);

const crouton = useCrouton();

const LAYOUT_CLASSES: Record<string, string> = {
  GridLayout: 'grid grid-cols-1 gap-x-3 md:grid-cols-12 grid-flow-row-dense',
  HorizontalLayout: 'flex flex-col gap-y-3 md:flex-row',
  VerticalLayout: 'flex flex-col gap-3',
};

const isCollapse = (el: any) => el?.type === 'CollapseLayout' || el?.type === 'Group';
const isTable = (el: any) => el?.type === 'Table';
const isComponent = (el: any) => el?.component && !el?.type;
const layoutClass = computed(() => LAYOUT_CLASSES[props.ui?.type] ?? 'flex flex-col gap-3');
const collapseTitle = computed(() => props.ui?.options?.title ?? props.ui?.label ?? '');
const elements = computed((): any[] => props.ui?.elements ?? []);

const getComponent = (el: any) => findCustomComponent(crouton.customComponents, el.component);
</script>

<template>
  <Collapse v-if="isCollapse(ui)" :title="collapseTitle">
    <template v-for="(el, i) in elements" :key="i">
      <slot v-if="isTable(el)" />
      <component v-else-if="isComponent(el)" :is="getComponent(el)" :resource="resource" />
      <TableWrapperLayout v-else :ui="el" :resource="resource">
        <slot />
      </TableWrapperLayout>
    </template>
  </Collapse>
  <div v-else :class="layoutClass">
    <template v-for="(el, i) in elements" :key="i">
      <slot v-if="isTable(el)" />
      <component v-else-if="isComponent(el)" :is="getComponent(el)" :resource="resource" />
      <TableWrapperLayout v-else :ui="el" :resource="resource">
        <slot />
      </TableWrapperLayout>
    </template>
  </div>
</template>
