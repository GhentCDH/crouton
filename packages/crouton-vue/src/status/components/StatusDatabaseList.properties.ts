import type { PropType } from 'vue';

import type { DatabaseStatus } from '../status.types';

export const StatusDatabaseListProperties = {
  databases: { type: Array as PropType<DatabaseStatus[]>, required: true as const },
};
