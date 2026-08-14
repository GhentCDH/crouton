import type { PropType } from 'vue';

import { ControlWrapperProperties } from '@ghentcdh/ui';

/**
 * Props for {@link DatePicker}. Spreads `ControlWrapperProperties` so the
 * `wrapper` object produced by `useInputProps` binds straight onto it and the
 * label / error / description / required / width behaviour matches `Input` and
 * `InputNumber` exactly.
 */
export const DatePickerProperties = {
  // Guarded: a spread of undefined would silently yield {}, dropping every
  // wrapper prop. Explicit so the intent survives a ui version bump.
  ...(ControlWrapperProperties ?? {}),
  /** ISO 8601 instant, e.g. `2026-08-14T00:00:00.000Z`. */
  modelValue: {
    type: String as unknown as PropType<string | null | undefined>,
    default: undefined,
  },
  /** Render a time next to the date and store it. @default false */
  withTime: { type: Boolean, default: false },
  /** Earliest selectable date (ISO or `yyyy-MM-dd`). */
  min: { type: String, default: undefined },
  /** Latest selectable date (ISO or `yyyy-MM-dd`). */
  max: { type: String, default: undefined },
  /** BCP-47 locale for the month heading and weekday labels. @default 'en-GB' */
  locale: { type: String, default: 'en-GB' },
  /** 0 = Sunday, 1 = Monday. @default 1 */
  firstDayOfWeek: { type: Number, default: 1 },
  /** Show the "Clear" action in the popover footer. @default true */
  clearable: { type: Boolean, default: true },
  /**
   * Absorbed from `useInputProps`, which always emits a `type`. The input type
   * is derived from `withTime` instead, so this is declared only to keep the
   * value from falling through as a stray DOM attribute.
   */
  type: { type: String, default: undefined },
};

/**
 * Keys this component owns, i.e. everything in `DatePickerProperties` that is
 * NOT a `ControlWrapper` prop. Declared explicitly rather than derived from
 * `ControlWrapperProperties` at runtime: deriving it meant a single undefined
 * import (version skew, tree-shaking, module init order) threw
 * `Object.keys(undefined)` from inside a computed and took down the whole app.
 */
export const DATE_PICKER_OWN_PROPS = [
  'modelValue',
  'withTime',
  'min',
  'max',
  'locale',
  'firstDayOfWeek',
  'clearable',
  'type',
] as const;

export const DatePickerEmits = ['update:modelValue', 'change', 'blur', 'clear'];
