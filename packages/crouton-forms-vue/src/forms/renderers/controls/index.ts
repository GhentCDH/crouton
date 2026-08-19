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
} from '../../../testers/tester';

export { default as AutocompleteControlRenderer } from './AutocompleteControlRenderer.vue';
export * from './date';
export { useFetchOptions } from './composables/useFetchOption';

export const controlRenderers = [
  { tester: rankWith(10, isStringFormat), renderer: StringControlRenderer },
  {
    tester: rankWith(11, isTextAreaControl),
    renderer: TextAreaControlRenderer,
  },
  {
    tester: rankWith(11, isMarkdownControl),
    renderer: MarkdownControlRenderer,
  },
  { tester: rankWith(11, isBooleanControl), renderer: BooleanControlRenderer },
  { tester: rankWith(11, isSelectControl), renderer: SelectControlRenderer },
  {
    tester: rankWith(11, isMultiselectControl),
    renderer: MultiSelectControlRenderer,
  },
  {
    tester: rankWith(12, isAutoCompleteControl),
    renderer: AutocompleteControlRenderer,
  },
  {
    tester: rankWith(12, isNumberFormat),
    renderer: NumberControlRenderer,
  },
  {
    tester: rankWith(12, isIntegerFormat),
    renderer: NumberControlRenderer,
  },
  {
    tester: rankWith(12, isDateRangeControl),
    renderer: markRaw(DateRangeControlRenderer),
  },
  {
    // Rank 12 so it wins over isStringFormat (10), which also matches a date
    // because crouton-core emits `{ type: 'string', format: 'date-time' }`.
    tester: rankWith(12, isDateControl),
    renderer: markRaw(DateControlRenderer),
  },
  // Ranked below date-range/date/relation so a format-specific object control
  // (date-range is an object schema too) still wins.
  {
    tester: rankWith(11, isObjectControl),
    renderer: markRaw(ObjectControlRenderer),
  },
];
