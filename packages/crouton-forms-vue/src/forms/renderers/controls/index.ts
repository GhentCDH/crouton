import type { Component } from 'vue';
import { markRaw } from 'vue';

import AutocompleteControlRenderer from './AutocompleteControlRenderer.vue';
import BooleanControlRenderer from './BooleanControlRenderer.vue';
import DateControlRenderer from './DateControlRenderer.vue';
import DateRangeControlRenderer from './DateRangeControlRenderer.vue';
import MarkdownControlRenderer from './MarkdownControlRenderer.vue';
import MultiSelectControlRenderer from './MultiSelectControlRenderer.vue';
import NumberControlRenderer from './NumberControlRenderer.vue';
import ObjectControlRenderer from './ObjectControlRenderer.vue';
import SelectControlRenderer from './SelectControlRenderer.vue';
import StringControlRenderer from './StringControlRenderer.vue';
import TextAreaControlRenderer from './TextAreaControlRenderer.vue';
import ToggleControlRenderer from './ToggleControlRenderer.vue';
import { rankWith } from '../../../testers/jsonforms-testers';
import {
  isAutoCompleteControl,
  isBooleanControl,
  isDateControl,
  isDateRangeControl,
  isIntegerFormat,
  isMarkdownControl,
  isMultiselectControl,
  isNumberFormat,
  isObjectControl,
  isSelectControl,
  isStringFormat,
  isTextAreaControl,
  isToggleControl,
} from '../../../testers/tester';

export { default as AutocompleteControlRenderer } from './AutocompleteControlRenderer.vue';
export * from './date';
export { useFetchOptions } from './composables/useFetchOption';
export { default as DatePicker } from './date/DatePicker.vue';

const r = (c: unknown): Component => c as Component;

export const controlRenderers = [
  { tester: rankWith(10, isStringFormat), renderer: r(StringControlRenderer) },
  { tester: rankWith(11, isTextAreaControl), renderer: r(TextAreaControlRenderer) },
  { tester: rankWith(11, isMarkdownControl), renderer: r(MarkdownControlRenderer) },
  { tester: rankWith(11, isBooleanControl), renderer: r(BooleanControlRenderer) },
  { tester: rankWith(11, isSelectControl), renderer: r(SelectControlRenderer) },
  { tester: rankWith(12, isToggleControl), renderer: r(ToggleControlRenderer) },
  { tester: rankWith(11, isMultiselectControl), renderer: r(MultiSelectControlRenderer) },
  { tester: rankWith(12, isAutoCompleteControl), renderer: r(AutocompleteControlRenderer) },
  { tester: rankWith(12, isNumberFormat), renderer: r(NumberControlRenderer) },
  { tester: rankWith(12, isIntegerFormat), renderer: r(NumberControlRenderer) },
  { tester: rankWith(12, isDateRangeControl), renderer: markRaw(r(DateRangeControlRenderer)) },
  {
    // Rank 12 so it wins over isStringFormat (10), which also matches a date
    // because crouton-core emits `{ type: 'string', format: 'date-time' }`.
    tester: rankWith(12, isDateControl),
    renderer: markRaw(r(DateControlRenderer)),
  },
  // Ranked below date-range/date/relation so a format-specific object control
  // (date-range is an object schema too) still wins.
  { tester: rankWith(11, isObjectControl), renderer: markRaw(r(ObjectControlRenderer)) },
];
