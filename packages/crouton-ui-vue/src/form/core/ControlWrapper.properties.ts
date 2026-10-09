import type { PropType } from 'vue';

import { type MyStyles, myStyles } from '../core/styles';

/**
 * Props shared by all form control wrappers (ControlWrapper, ReadonlyWrapper, etc.).
 * Extend this interface for component-specific props.
 */
export interface ControlWrapperProps {
  /** Unique identifier for the control element. */
  id?: string;
  /** Placeholder text shown when the control is empty. */
  placeholder?: string;
  /** Help text displayed below the control. */
  description?: string;
  /** Error message displayed below the control. */
  errors?: string;
  /** Label text displayed above the control. */
  label?: string;
  /** Whether the description is visible. @default false */
  visible?: boolean;
  /** Whether the field is required (shows asterisk). @default false */
  required?: boolean;
  /** Whether the control accepts input. @default true */
  enabled?: boolean;
  /** Whether the control currently has focus. @default false */
  isFocused?: boolean;
  /** Whether the control has been interacted with. @default false */
  isTouched?: boolean;
  /** Hide the label above the control. @default false */
  hideLabel?: boolean;
  /** Style overrides merged with default styles. @default myStyles */
  styles?: MyStyles;
  /** Tailwind width class applied to the wrapper. @default '!w-48' */
  width?: string;
  /** Size variant for the control. */
  size?: string;
  /** Hide the error/description message area. @default false */
  hideErrors?: boolean;
}

/**
 * Runtime Vue props definition for {@link ControlWrapperProps}.
 * Use with `defineProps()` or spread into other property objects.
 */
export const ControlWrapperProperties = {
  id: { type: String, default: undefined },
  placeholder: { type: String, default: undefined },
  description: { type: String, default: undefined },
  errors: { type: String, default: undefined },
  label: { type: String, default: undefined },
  visible: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  isFocused: { type: Boolean, default: false },
  isTouched: { type: Boolean, default: false },
  hideLabel: { type: Boolean, default: false },
  styles: {
    type: Object as PropType<MyStyles>,
    default: () => myStyles,
  },
  width: { type: String, default: '!w-48' },
  size: { type: String, default: undefined },
  hideErrors: { type: Boolean, default: false },
};