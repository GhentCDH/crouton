import type { PropType } from 'vue';

import type { DatabaseStatus } from '@ghentcdh/crouton-frontend-core';

export const StatusDatabaseListProperties = {
  databases: { type: Array as PropType<DatabaseStatus[]>, required: true as const },
};
