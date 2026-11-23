import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { PropType } from 'vue';

export const TabsLayoutProperties = {
  /** One built UI-schema element per tab (the `items` of the `tabs` node). */
  elements: { type: Array as PropType<UISchemaElement[]>, required: true as const },
  schema: { type: Object as PropType<JsonSchema>, required: true as const },
  /** Current record; used to resolve a tab's `titleKey`. */
  data: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  /** Route query key that keeps the active tab (e.g. `tab` → `?tab=2`). Off when unset. */
  syncQuery: { type: String, default: undefined },
};
