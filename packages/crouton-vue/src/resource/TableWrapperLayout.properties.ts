import type { PropType } from 'vue';

export const TableWrapperLayoutProperties = {
  ui: { type: Object as PropType<Record<string, unknown>>, required: true as const },
  resource: { type: Object as PropType<Record<string, unknown>>, required: true as const },
};
