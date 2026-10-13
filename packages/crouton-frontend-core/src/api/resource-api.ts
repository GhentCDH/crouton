import { type Operation, type OperationKey, type ResourceDefinition } from '@ghentcdh/crouton-core';

import type { HttpClient, Notifier } from './ports';
import { replaceUriParams } from './uri';

const paramsSerializer = (params: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (Array.isArray(val)) val.forEach((v) => p.append(key, String(v)));
    else p.append(key, String(val));
  });
  return p.toString();
};

const httpCall = (
  http: HttpClient,
  method: string,
  uri: string,
  data?: any,
): Promise<{ data: any }> => {
  switch (method) {
    case 'get': return http.get(uri, data);
    case 'post': return http.post(uri, data);
    case 'patch': return http.patch(uri, data);
    case 'delete': return http.delete(uri, data);
    default: return http.post(uri, data);
  }
};

export const apiCall = (
  http: HttpClient,
  formDef: Pick<ResourceDefinition, 'id' | 'operations'>,
  operation: OperationKey,
  defaultUriParams: Record<string, string>,
  data?: any,
  signal?: AbortSignal,
): Promise<{ data: any }> => {
  const request = formDef.operations[operation] as Operation;
  if (!request) {
    throw new Error(`FormDef ${formDef.id} does not have a ${operation} operation`);
  }
  const uri = replaceUriParams(request.uri, defaultUriParams);
  const method = request.method.toLowerCase();
  return httpCall(http, method, uri, { ...data, signal, paramsSerializer });
};

export const createResourceApi = (http: HttpClient, notifier: Notifier) =>
  (
    formDef: Pick<ResourceDefinition, 'id' | 'operations' | 'idField'>,
    defaultUriParams: Record<string, string> = {},
  ) => {
    const call = (
      operation: OperationKey,
      params: Record<string, string>,
      data?: any,
      signal?: AbortSignal,
    ) => apiCall(http, formDef, operation, params, data, signal);

    const idField = formDef.idField ?? 'id';

    const loadData = (requestData: any, signal?: AbortSignal) =>
      call('findAll', defaultUriParams, { params: requestData }, signal)
        .then((r: { data: any }) => r.data)
        .catch((error: unknown) => {
          if (signal?.aborted) return null;
          console.error(error);
          notifier.error('Error loading data');
          return null;
        });

    const getOneById = (id: string) =>
      call('findOne', { ...defaultUriParams, id, [idField]: id })
        .then((r: { data: any }) => r.data)
        .catch((error: unknown) => {
          console.error(error);
          notifier.error('Error loading data');
          return null;
        });

    const save = (id: string, data: any) =>
      call('update', { ...defaultUriParams, id, [idField]: id }, data)
        .then((r: { data: any }) => r.data)
        .catch((error: unknown) => {
          console.error(error);
          notifier.error('Error saving data');
          return null;
        });

    const patchData = (id: string, data: any) =>
      call('patch', { ...defaultUriParams, id, [idField]: id }, data)
        .then((r: { data: any }) => r.data)
        .catch((error: unknown) => {
          console.error(error);
          notifier.error('Error saving data');
          return null;
        });

    const create = (data: any) =>
      call('create', defaultUriParams, data)
        .then((r: { data: any }) => r.data)
        .catch((error: unknown) => {
          console.error(error);
          notifier.error('Error saving data');
          return null;
        });

    const deleteData = (data: any) => {
      const recordId = data?.[idField] ?? data?.id;
      return call('delete', { ...defaultUriParams, id: recordId, [idField]: recordId })
        .then((r: { data: any }) => {
          notifier.success('Data deleted');
          return r.data;
        })
        .catch((error: unknown) => {
          console.error(error);
          notifier.error('Error deleting data');
          return null;
        });
    };

    const checkUnique = (
      field: string,
      value: string,
      excludeId?: string,
      scope?: Record<string, unknown>,
    ): Promise<boolean> => {
      const findAll = formDef.operations['findAll'] as Operation | undefined;
      if (!findAll) return Promise.resolve(true);
      const base = replaceUriParams(findAll.uri, defaultUriParams).replace(/\/+$/, '');
      return http
        .get(`${base}/unique`, {
          params: {
            field,
            value,
            ...(excludeId != null ? { excludeId } : {}),
            ...(scope ? { scope: JSON.stringify(scope) } : {}),
          },
          paramsSerializer,
        })
        .then((response: { data: any }) => response.data?.unique !== false)
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

export type ResourceApiInstance = ReturnType<ReturnType<typeof createResourceApi>>;
