import { uiTypeIs } from '@ghentcdh/crouton-frontend-core';

export {
  isArrayRenderer,
  isAutoCompleteControl,
  isBooleanControl,
  isCustomControl,
  isCustomControlRender,
  isDateControl,
  isDateRangeControl,
  isIntegerFormat,
  isMarkdownControl,
  isMultiselectControl,
  isNumberFormat,
  isObjectControl,
  isRelationControl,
  isSelectControl,
  isStringFormat,
  isTextAreaControl,
  isToggleControl,
  optionIsIgnoreCase,
} from '@ghentcdh/crouton-frontend-core';

export const isComponentElement = uiTypeIs('ComponentElement');
