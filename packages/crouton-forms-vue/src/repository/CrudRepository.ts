import type { HttpClient } from '../http-client';

type RequestOptions = {
  skipAuth?: boolean;
  queryParams?: Record<string, any>;
  contentType?: string;
};

export type HttpRequest<T> = HttpClient;

export type NotificationStore = {
  info: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  success: (message: string) => void;
};

type RepositoryOptions = {
  notification?: {
    show: true;
    entityType: string;
    notification: NotificationStore;
  };
};

export const createRepository = <T extends { id?: string }>(
  formSchemaModel: { uri: string },
  httpRequest: HttpRequest<T>,
  options: RepositoryOptions = {},
) => {
  const notificationEntity = options.notification?.entityType || 'entity';
  const notificationStore = options.notification?.notification ?? null;

  const getDataUri = (...suffix: string[]) => {
    return [formSchemaModel.uri, ...suffix].join('/');
  };

  const handleSuccess = (message: string) => {
    notificationStore?.success(message);
  };

  const handleError = (error: any, message: string) => {
    console.error(error);
    notificationStore?.error(message);

    throw new Error(error);
  };

  const create = (object: T, options?: RequestOptions) => {
    return httpRequest
      .post(getDataUri(), object, options)
      .then((response) => {
        handleSuccess(`Created ${notificationEntity}`);
        return response.data;
      })
      .catch((response) => {
        handleError(response, `Failed to create ${notificationEntity}`);
      });
  };

  const patch = (id: string, object: T, options?: RequestOptions) => {
    return httpRequest
      .patch(getDataUri(id), object, options)
      .then((response) => {
        handleSuccess(`Saved ${notificationEntity}`);
        return response.data;
      })
      .catch((response) => {
        handleError(response, `Failed to save ${notificationEntity}`);
      });
  };

  const get = (id: string, options?: RequestOptions) => {
    return httpRequest
      .get(getDataUri(id), options)
      .then((response) => {
        return response.data;
      })
      .catch((response) => {
        handleError(response, 'Failed to load data');
      });
  };

  const _delete = (id: string, options?: RequestOptions) => {
    return httpRequest
      .delete(getDataUri(id), options)
      .then((response) => {
        handleSuccess(`${notificationEntity} deleted`);

        return response;
      })
      .catch((response) => {
        handleError(response, `Failed to delete ${notificationEntity}`);
      });
  };

  const createMulti = (objects: T[], options?: RequestOptions) => {
    return Promise.all(
      objects.map((object) => httpRequest.post(getDataUri(), object, options)),
    )
      .then((responses) => {
        handleSuccess(`Created ${notificationEntity}`);
        return responses.map((r) => r.data);
      })
      .catch((response) => {
        handleError(response, `Failed to save ${notificationEntity}`);
      });
  };

  return { create, patch, createMulti, delete: _delete, get };
};
