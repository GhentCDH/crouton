import type { PropType } from 'vue';

import { ControlWrapperProperties } from '@ghentcdh/ui';

/**
 * Local copy of `ControlWrapper`'s prop contract.
 *
 * `@ghentcdh/ui` only started exporting `ControlWrapperProperties` in v2 — v1.1.1
 * exports the `ControlWrapper` *component* but not its properties object. Against
 * v1 the import is `undefined`, so spreading it alone declared no props at all
 * and left `enabled` undefined, which rendered the control permanently disabled.
 *
 * Defaults mirror the `ControlWrapperProps` docs. Where a value is `undefined`
 * here, `ControlWrapper`'s own prop default still applies.
 */
const CONTROL_WRAPPER_FALLBACK = {
  id: { type: String, default: undefined },
  placeholder: { type: String, default: undefined },
  description: { type: String, default: undefined },
  errors: { type: String, default: undefined },
  label: { type: String, default: undefined },
  size: { type: String, default: undefined },
  width: { type: String, default: undefined },
  styles: { type: Object as PropType<any>, default: undefined },
  visible: { type: Boolean, default: true },
  required: { type: Boolean, default: false },
  // The one that matters: without it the input is disabled forever.
  enabled: { type: Boolean, default: true },
  isFocused: { type: Boolean, default: false },
  isTouched: { type: Boolean, default: false },
  hideLabel: { type: Boolean, default: false },
  hideErrors: { type: Boolean, default: false },
};

/**
 * Props for {@link DatePicker}. Carries the `ControlWrapper` contract so the
 * `wrapper` object from `useInputProps` binds straight on and the label / error
 * / description / required / width behaviour matches `Input` and `InputNumber`.
 *
 * `ControlWrapperProperties` is layered over the fallback so that ui stays the
 * source of truth whenever it does export it.
 */
export const DatePickerProperties = {
  ...CONTROL_WRAPPER_FALLBACK,
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
 * import threw `Object.keys(undefined)` from inside a computed and took down
 * the whole app.
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
