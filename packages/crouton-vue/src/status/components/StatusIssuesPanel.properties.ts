import type { PropType } from 'vue';

import type { StatusIssue } from '@ghentcdh/crouton-frontend-core';

export const StatusIssuesPanelProperties = {
  issues: { type: Array as PropType<StatusIssue[]>, required: true as const },
};
