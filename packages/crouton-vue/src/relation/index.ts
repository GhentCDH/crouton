import type { ControlElement, JsonSchema } from '@jsonforms/core';
import type { PropType } from 'vue';

export { useRelationBinding } from './useRelationBinding';

export const RelationProps = {
  uischema: {
    type: Object as PropType<ControlElement>,
    required: true as const,
  },
  schema: { type: Object as PropType<JsonSchema>, required: true as const },
};
