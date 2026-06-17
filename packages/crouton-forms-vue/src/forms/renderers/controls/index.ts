import { markRaw } from 'vue';

import AutocompleteControlRenderer from './AutocompleteControlRenderer.vue';
import BooleanControlRenderer from './BooleanControlRenderer.vue';
import DateRangeControlRenderer from './DateRangeControlRenderer.vue';
import MarkdownControlRenderer from './MarkdownControlRenderer.vue';
import MultiSelectControlRenderer from './MultiSelectControlRenderer.vue';
import NumberControlRenderer from './NumberControlRenderer.vue';
import SelectControlRenderer from './SelectControlRenderer.vue';
import StringControlRenderer from './StringControlRenderer.vue';
import TextAreaControlRenderer from './TextAreaControlRenderer.vue';
import { rankWith } from '../../../testers/jsonforms-testers';
import {
  isAutoCompleteControl,
  isBooleanControl,
  isDateRangeControl,
  isIntegerFormat,
  isMarkdownControl,
  isMultiselectControl,
  isNumberFormat,
  isSelectControl,
  isStringFormat,
  isTextAreaControl,
} from '../../../testers/tester';

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
];
