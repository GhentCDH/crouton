import {
  apiCall,
  createResourceApi,
} from '@ghentcdh/crouton-frontend-core';
import type { ResourceDefinition } from '@ghentcdh/crouton-core';
import { NotificationService } from '@ghentcdh/crouton-ui-vue';

export type { ResourceApiInstance } from '@ghentcdh/crouton-frontend-core';

import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';

export const croutonApiCall = (
  formDef: Pick<ResourceDefinition, 'id' | 'operations'>,
  operation: any,
  defaultUriParams: Record<string, string>,
  data?: any,
  signal?: AbortSignal,
) => apiCall(useApi() as any, formDef as any, operation, defaultUriParams, data, signal);

export const resourceApi = (
  formDef: Pick<ResourceDefinition, 'id' | 'operations' | 'idField'>,
  defaultUriParams: Record<string, string> = {},
) => createResourceApi(useApi() as any, NotificationService)(formDef as any, defaultUriParams);

export const useResourceApi = async (
  formDefId: string,
  defaultUriParams: Record<string, string> = {},
) => {
  const formDef = await useCrouton().getFormDefById(formDefId);

  return resourceApi(formDef, defaultUriParams);
};
