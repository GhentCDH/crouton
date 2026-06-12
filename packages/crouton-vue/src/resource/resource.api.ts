import { NotificationService } from '@ghentcdh/ui';

import type { RequestData } from './resource.types';
import { replaceUriParams } from './uri.utils';
import { type Operation, type OperationKey } from '../composables/form-def.schema';
import type { FormDef } from '../composables/form-def.types';
import { useApi } from '../composables/useApi';

const paramsSerializer = (params: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (Array.isArray(val)) val.forEach((v) => p.append(key, String(v)));
    else p.append(key, String(val));
  });
  return p.toString();
};

const apiCall = (
  formDef: FormDef,
  operation: OperationKey,
  defaultUriParams: Record<string, string>,
  data?: any,
  signal?: AbortSignal,
) => {
  const request = formDef.operations[operation] as Operation;

  if (!request) {
    throw new Error(
      `FormDef ${formDef.id} does not have a ${operation} operation`,
    );
  }
  const uri = replaceUriParams(request.uri, defaultUriParams);
  const method = request.method;

  const fetch = useApi();

  return fetch[method](uri, {
    ...data,
    signal,
    paramsSerializer,
  });
};

export const resourceApi = (
  formDef: FormDef,
  defaultUriParams: Record<string, string>,
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
      .catch((error) => {
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
      .catch((error) => {
        console.error(error);
        NotificationService.error('Error loading data');
        return null;
      });

  const save = (id: string, data: any) =>
    apiCall(formDef, 'update', { ...defaultUriParams, id, [idField]: id }, data)
      .then((response) => {
        NotificationService.success('Data saved');
        return response.data;
      })
      .catch((error) => {
        console.error(error);
        NotificationService.error('Error saving data');
        return null;
      });

  const create = (data: any) =>
    apiCall(formDef, 'create', defaultUriParams, data)
      .then((response) => {
        NotificationService.success('Data saved');
        return response.data;
      })
      .catch((error) => {
        console.error(error);
        NotificationService.error('Error saving data');
        return null;
      });

  const deleteData = (data: any) => {
    const recordId = data?.[idField] ?? data?.id;
    return apiCall(formDef, 'delete', {
      ...defaultUriParams,
      id: recordId,
      [idField]: recordId,
    })
      .then((response) => {
        NotificationService.success('Data deleted');
        return response.data;
      })
      .catch((error) => {
        console.error(error);
        NotificationService.error('Error deleting data');
        return null;
      });
  };

  return {
    loadData,
    getOneById,
    save,
    create,
    delete: deleteData,
  };
};

export type ResourceApiInstance = ReturnType<typeof resourceApi>;
