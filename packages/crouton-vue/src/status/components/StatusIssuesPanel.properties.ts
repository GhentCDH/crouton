import type { PropType } from 'vue';

import type { StatusIssue } from '../status.utils';

export const StatusIssuesPanelProperties = {
  issues: { type: Array as PropType<StatusIssue[]>, required: true as const },
};
