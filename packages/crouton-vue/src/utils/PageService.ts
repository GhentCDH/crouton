import type { OperationKey } from '@ghentcdh/crouton-core';

import { PaginatedRequestService } from './paginatedRequestService';
import type { Request } from './request';
import { useCrouton } from '../composables/useCrouton';
import { croutonApiCall } from '../resource/resource.api';

export abstract class PageService extends PaginatedRequestService {
  protected crouton: ReturnType<typeof useCrouton> = useCrouton();

  constructor(
    initialRequestParams: Partial<Request>,
    onRequest: (request: Request) => void,
  ) {
    super(initialRequestParams, onRequest);
    this.reload();
  }

  getFormDef(formId: string) {
    return this.crouton.getFormDefById(formId);
  }

  async apiCall(
    formDefId: string,
    method: OperationKey,
    signal: AbortSignal,
    data?: {
      defaultUriParams?: Record<string, string>;
      data?: any;
    },
  ) {
    const formDef = await this.getFormDef(formDefId);
    if (!formDef) throw new Error('no form def');
    const _data = { ...(data?.data ?? {}) };
    return croutonApiCall(
      formDef,
      method,
      data?.defaultUriParams ?? {},
      _data,
      signal,
    );
  }
}
