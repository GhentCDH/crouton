import type { PropType } from 'vue';

export type OptionValue = {
  label: string;
  value: string;
  disabled?: boolean;
};

export const ListResultsEmits = ['select'];

export const ListProperties = {
  options: { type: Array as PropType<Array<OptionValue>>, required: false as const },
  isLoading: {
    type: Boolean,
    default: false,
  },
  query: { type: String, default: undefined },
  isActive: { type: Function, default: (item: any) => false },
  /** When true the list is teleported to <body>; positioning is handled via inline style from the parent */
  teleported: { type: Boolean, default: false },
};
