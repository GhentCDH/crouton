import type { DatabaseStatus } from '@crouton/status';
import type { PropType } from 'vue';


export const StatusDatabaseListProperties = {
  databases: {
    type: Array as PropType<DatabaseStatus[]>,
    required: true as const,
  },
};
