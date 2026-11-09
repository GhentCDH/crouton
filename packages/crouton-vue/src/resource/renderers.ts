import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { and, rankWith } from '@jsonforms/core';
import type { Component } from 'vue';
import { markRaw } from 'vue';

import {
  type CellRendererEntry,
  cellTypeIs,
  isComponentElement,
  isRelationControl,
  optionIsIgnoreCase,
} from '@ghentcdh/crouton-forms-vue';

import RelationCell from '../relation/RelationCell.vue';
import RelationControlRenderer from '../relation/RelationControlRenderer.vue';
import RelationReadonlyRenderer from '../relation/RelationReadonlyRenderer.vue';
import ComponentCellRenderer from './ComponentCellRenderer.vue';
import ComponentLayoutRenderer from './ComponentLayoutRenderer.vue';
import CustomCellRenderer from './CustomCellRenderer.vue';
import CustomFormatRenderer from './CustomFormatRenderer.vue';

export const isCustomFormat = (format: string) =>
  and(optionIsIgnoreCase('format', format));

/** Matches any control that has `options.customComponent` set. */
const hasCustomComponent = (uischema: { options?: Record<string, unknown> }) =>
  !!uischema.options?.customComponent;
/**
 * Additional renderers to pass as the `renderers` prop.
 * These are merged ON TOP of the base renderers inside FormComponent —
 * no need to include customRenderes or relationReadonlyRenderers here.
 */
const relationRenderers: JsonFormsRendererRegistryEntry[] = [
  {
    tester: rankWith(16, isRelationControl),
    renderer: markRaw(RelationControlRenderer) as Component,
  },
];

/**
 * All custom control renderers to pass as the `renderers` prop.
 * Merged ON TOP of the base renderers inside the form modal.
 */
export const customControlRenderers: JsonFormsRendererRegistryEntry[] = [
  ...relationRenderers,
  {
    tester: rankWith(17, hasCustomComponent),
    renderer: markRaw(CustomFormatRenderer) as Component,
  },
  {
    tester: rankWith(15, isComponentElement),
    renderer: markRaw(ComponentLayoutRenderer) as Component,
  },
];

export const relationReadonlyRenderers: JsonFormsRendererRegistryEntry[] = [
  {
    tester: rankWith(17, hasCustomComponent),
    renderer: markRaw(CustomFormatRenderer) as Component,
  },
  {
    tester: rankWith(16, isRelationControl),
    renderer: markRaw(RelationReadonlyRenderer) as Component,
  },
  {
    tester: rankWith(15, isComponentElement),
    renderer: markRaw(ComponentLayoutRenderer) as Component,
  },
];

/** Matches any cell element that has `options.customComponent` set. */
const cellHasCustomComponent = (element: unknown) =>
  (element as { options?: Record<string, unknown> })?.options?.customComponent ? 21 : -1;

export const customCellRenderers: CellRendererEntry[] = [
  // 'RecordCell' is the legacy wire name emitted by older crouton-api versions;
  // 'RelationCell' is the unified name. Both are accepted for compatibility.
  { tester: cellTypeIs('RecordCell', 20), renderer: markRaw(RelationCell) as Component },
  { tester: cellTypeIs('RelationCell', 20), renderer: markRaw(RelationCell) as Component },
  { tester: cellTypeIs('ComponentCell', 20), renderer: markRaw(ComponentCellRenderer) as Component },
  { tester: cellHasCustomComponent, renderer: markRaw(CustomCellRenderer) as Component },
];
