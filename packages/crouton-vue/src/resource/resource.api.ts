import type {
  Operation,
  OperationKey,
  ResourceDefinition,
} from '@ghentcdh/crouton-core';
import { NotificationService } from '@ghentcdh/crouton-ui-vue';

import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';
import type { RequestData } from './resource.types';
import { replaceUriParams } from './uri.utils';

const apiErrorMessage = (error: unknown): string | null => {
  const msg = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (Array.isArray(msg) && msg.length > 0)
    return msg
      .map((e) =>
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e),
      )
      .join(', ');
  if (typeof msg === 'string') return msg;
  return null;
};

const paramsSerializer = (params: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (Array.isArray(val)) val.forEach((v) => p.append(key, String(v)));
    else p.append(key, String(val));
  });
  return p.toString();
};

type AxiosLike = Record<
  string,
  (uri: string, config: Record<string, unknown>) => Promise<{ data: unknown }>
>;

const apiCall = (
  formDef: Pick<ResourceDefinition, 'id' | 'operations'>,
  operation: OperationKey,
  defaultUriParams: Record<string, string>,
  data?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ data: unknown }> => {
  const request = formDef.operations[operation] as Operation;
  if (!request) {
    throw new Error(
      `ResourceDefinition ${formDef.id} does not have a ${operation} operation`,
    );
  }
  const uri = replaceUriParams(request.uri, defaultUriParams);
  const method = request.method.toLowerCase();

  const fetch = useApi();

  return (fetch as unknown as AxiosLike)[method](uri, {
    ...data,
    signal,
    paramsSerializer,
  });
};

export const croutonApiCall = apiCall;

export const resourceApi = (
  formDef: Pick<ResourceDefinition, 'id' | 'operations' | 'idField'>,
  defaultUriParams: Record<string, string> = {},
) => {
  const loadData = (requestData: RequestData, signal?: AbortSignal) =>
    apiCall(
      formDef,
      'findAll',
      defaultUriParams,
      { params: requestData },
      signal,
    )
      .then((data) => {
        return data.data;
      })
      .catch((error: unknown) => {
        if (signal?.aborted) return null;
        console.error(error);
        NotificationService.error('Error loading data');
        return null;
      });

  const idField = formDef.idField ?? 'id';

  const getOneById = (id: string) =>
    apiCall(formDef, 'findOne', { ...defaultUriParams, id, [idField]: id })
      .then((response) => {
        return response.data;
      })
      .catch((error: unknown) => {
        console.error(error);
        NotificationService.error('Error loading data');
        return null;
      });

  const save = (id: string, data: Record<string, unknown>) =>
    apiCall(formDef, 'update', { ...defaultUriParams, id, [idField]: id }, data)
      .then((response) => {
        // NotificationService.success('Data saved');
        return response.data;
      })
      .catch((error: unknown) => {
        console.error(error);
        NotificationService.error(
          apiErrorMessage(error) ?? 'Error saving data',
        );
        return null;
      });

  const patchData = (id: string, data: Record<string, unknown>) =>
    apiCall(formDef, 'patch', { ...defaultUriParams, id, [idField]: id }, data)
      .then((response) => {
        return response.data;
      })
      .catch((error: unknown) => {
        console.error(error);
        NotificationService.error(
          apiErrorMessage(error) ?? 'Error saving data',
        );
        return null;
      });

  const create = (data: Record<string, unknown>) =>
    apiCall(formDef, 'create', defaultUriParams, data)
      .then((response) => {
        // NotificationService.success('Data saved');
        return response.data;
      })
      .catch((error: unknown) => {
        console.error(error);
        NotificationService.error(
          apiErrorMessage(error) ?? 'Error saving data',
        );
        return null;
      });

  const deleteData = (data: Record<string, unknown>) => {
    const recordId = String(data[idField] ?? data['id'] ?? '');
    return apiCall(formDef, 'delete', {
      ...defaultUriParams,
      id: recordId,
      [idField]: recordId,
    })
      .then((response) => {
        return response.data;
      })
      .catch((error: unknown) => {
        console.error(error);
        NotificationService.error('Error deleting data');
        return null;
      });
  };

  /**
   * Check whether `value` is still free for a declared-unique `field`.
   * Derives the endpoint from the collection (`findAll`) uri. Fail-open: any
   * error resolves `true`, since the API enforces uniqueness on write anyway.
   */
  const checkUnique = (
    field: string,
    value: string,
    excludeId?: string,
    scope?: Record<string, unknown>,
  ): Promise<boolean> => {
    const findAll = formDef.operations['findAll'] as Operation | undefined;
    if (!findAll) return Promise.resolve(true);
    const base = replaceUriParams(findAll.uri, defaultUriParams).replace(
      /\/+$/,
      '',
    );
    const fetch = useApi();
    return fetch
      .get<{ unique?: boolean }>(`${base}/unique`, {
        params: {
          field,
          value,
          ...(excludeId != null ? { excludeId } : {}),
          ...(scope ? { scope: JSON.stringify(scope) } : {}),
        },
        paramsSerializer,
      })
      .then((response) => response.data?.unique !== false)
      .catch((error: unknown) => {
        console.error(error);
        return true;
      });
  };

  return {
    findAll: loadData,
    loadData,
    getOneById,
    save,
    patch: patchData,
    create,
    delete: deleteData,
    checkUnique,
  };
};

export const useResourceApi = async (
  formDefId: string,
  defaultUriParams: Record<string, string> = {},
) => {
  const formDef = await useCrouton().getFormDefById(formDefId);

  return resourceApi(formDef, defaultUriParams);
};

export type ResourceApiInstance = ReturnType<typeof resourceApi>;
