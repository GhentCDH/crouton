import type { HttpClient, Notifier } from './ports';

type RequestOptions = {
  skipAuth?: boolean;
  queryParams?: Record<string, any>;
  contentType?: string;
};

type RepositoryOptions = {
  notification?: {
    show: true;
    entityType: string;
    notifier: Notifier;
  };
};

export const createRepository = <T extends { id?: string }>(
  formSchemaModel: { uri: string },
  httpRequest: HttpClient,
  options: RepositoryOptions = {},
) => {
  const notificationEntity = options.notification?.entityType || 'entity';
  const notifier = options.notification?.notifier ?? null;

  const getDataUri = (...suffix: string[]) =>
    [formSchemaModel.uri, ...suffix].join('/');

  const handleSuccess = (message: string) => notifier?.success(message);

  const handleError = (error: any, message: string) => {
    console.error(error);
    notifier?.error(message);
    throw new Error(error);
  };

  const create = (object: T, options?: RequestOptions) =>
    httpRequest
      .post(getDataUri(), object, options)
      .then((response) => {
        handleSuccess(`Created ${notificationEntity}`);
        return response.data;
      })
      .catch((response) => handleError(response, `Failed to create ${notificationEntity}`));

  const patch = (id: string, object: T, options?: RequestOptions) =>
    httpRequest
      .patch(getDataUri(id), object, options)
      .then((response) => {
        handleSuccess(`Saved ${notificationEntity}`);
        return response.data;
      })
      .catch((response) => handleError(response, `Failed to save ${notificationEntity}`));

  const get = (id: string, options?: RequestOptions) =>
    httpRequest
      .get(getDataUri(id), options)
      .then((response) => response.data)
      .catch((response) => handleError(response, 'Failed to load data'));

  const _delete = (id: string, options?: RequestOptions) =>
    httpRequest
      .delete(getDataUri(id), options)
      .then((response) => {
        handleSuccess(`${notificationEntity} deleted`);
        return response;
      })
      .catch((response) => handleError(response, `Failed to delete ${notificationEntity}`));

  const createMulti = (objects: T[], options?: RequestOptions) =>
    Promise.all(objects.map((object) => httpRequest.post(getDataUri(), object, options)))
      .then((responses) => {
        handleSuccess(`Created ${notificationEntity}`);
        return responses.map((r) => r.data);
      })
      .catch((response) => handleError(response, `Failed to save ${notificationEntity}`));

  return { create, patch, createMulti, delete: _delete, get };
};

/** @deprecated use Notifier */
export type NotificationStore = Notifier;
