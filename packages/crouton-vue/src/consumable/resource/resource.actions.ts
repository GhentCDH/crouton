import {
  type FormModalResult,
  JsonFormModalService,
} from '@ghentcdh/json-forms-vue';
import {
  ModalService,
  NotificationService,
  type TableAction,
} from '@ghentcdh/ui';

import {
  type Action,
  type FormDefResponse,
  type TableAction as TableActionDef,
} from '../form-def.schema';
import type { FormDefActionCondition } from '../form-def.types';
import type { ResourceApiInstance } from './api';
import { getFetch } from './api';
import { type Resource } from './resource';
import type { HandleEvent } from './types';
import { replaceUriParams } from './uri.utils';
import { readonlyRenderers, renderers } from '../../resource/renderers';
import { useCrouton } from '../useCrouton';
import { useResources } from './useResources';

const evaluateCondition = (
  condition: FormDefActionCondition | undefined,
  row: any,
): boolean => {
  if (!condition) return true;
  const v = row[condition.field];
  switch (condition.op ?? 'eq') {
    case 'eq':
      return v === condition.value;
    case 'neq':
      return v !== condition.value;
    case 'gt':
      return v > (condition.value as any);
    case 'gte':
      return v >= (condition.value as any);
    case 'lt':
      return v < (condition.value as any);
    case 'lte':
      return v <= (condition.value as any);
    case 'exists':
      return v !== null && v !== undefined && v !== '';
    case 'notExists':
      return v === null || v === undefined || v === '';
    default:
      return true;
  }
};

const openDeleteModal =
  (api: ResourceApiInstance, resource: Resource, handleEvent: HandleEvent) =>
  (data: any) => {
    ModalService.showConfirm({
      title: 'Delete record',
      message: 'Are you sure to delete, the data will be lost?',
      onClose: (result) => {
        if (result.confirmed) {
          handleEvent('close', { delete: true, data });
          api.delete(data).then((response) => {
            if (response) resource.reload();
          });
        } else handleEvent('close', {});
      },
    });
  };

const openViewModal =
  (
    api: ResourceApiInstance,
    resource: Resource,
    formDef: FormDefResponse,
    handleEvent: HandleEvent,
  ) =>
  (formData: any) => {
    const view = formDef.schemas.view;
    if (!view) return;

    handleEvent('view', { id: formData[formDef.idField] });
    const op = formDef.operations;
    JsonFormModalService.openViewModal({
      schema: view.data,
      uiSchema: view.ui,
      modalSize: formDef.modalSize ?? 'lg',
      data: formData,
      modalTitle: formDef.title ?? '',
      renderers: readonlyRenderers,
      onEdit: op.update
        ? (data) => openEditModal(api, resource, formDef, handleEvent)(formData)
        : undefined,
      onDelete: op.delete
        ? (data) => openDeleteModal(api, resource, handleEvent)(formData)
        : undefined,
      http: getFetch(formDef),
      onView: (data) => {
        if (!data.options.resource) return;

        useCrouton()
          .getFormByUri(data.options.resource)
          .then((config) => {
            if (!config) return;
            const _resource = useResources(config, { defaultUriParams: data });
            _resource.resourceModal.view(data.id);
          });
      },
      onClose: () => {
        handleEvent('close', {});
      },
    });
  };

const openEditModal =
  (
    api: ResourceApiInstance,
    resource: Resource,
    formDef: FormDefResponse,
    handleEvent: HandleEvent,
  ) =>
  (formData?: any) => {
    const form = formDef.schemas.form;
    if (!form) return;

    const recordId = formData?.[formDef.idField];
    const isUpdate = !!recordId;

    handleEvent(isUpdate ? 'update' : 'create', { id: recordId });

    JsonFormModalService.openModal({
      schema: form.data,
      uiSchema: form.ui,
      modalSize: formDef.modalSize ?? 'lg',
      initialData: formData ?? form.parseValue({}),
      modalTitle: (isUpdate ? 'Update ' : 'Create ') + formDef.title,
      http: getFetch(formDef),
      renderers: renderers,
      onClose: (result: FormModalResult) => {
        if (result && result.valid) {
          const data = result.data;
          const promise = isUpdate
            ? api.save(recordId, data)
            : api.create(data);

          promise.then((response) => {
            if (response) resource.reload();
          });
          handleEvent('close', result.data);
        } else {
          handleEvent('close', {});
        }
      },
    });
  };

export const backendAction = (
  resource: Resource,
  formDef: FormDefResponse,
  defaultUriParams: Record<string, string>,
  action: Action,
) => {
  const fetch = getFetch(formDef);

  return (formData: any) => {
    if (action.type === 'link') {
      const href = replaceUriParams(action.href, {
        ...defaultUriParams,
        ...formData,
      });
      window.open(href, '_blank');
      return;
    }

    const uri = replaceUriParams(action.uri, formData);

    return fetch[action.method](
      replaceUriParams(uri, defaultUriParams),
      defaultUriParams,
    )
      .then(({ data }) => {
        if (data.success) {
          NotificationService.success(data.message);
          resource.reload();
        } else {
          NotificationService.error(data.message);
        }
      })
      .catch((error) => {
        NotificationService.error('Something went wrong, please try again');
      });
  };
};

export const actions = (
  api: ResourceApiInstance,
  resource: Resource,
  formDef: FormDefResponse | null | undefined,
  defaultUriParams: Record<string, string>,
  handleEvent: HandleEvent,
  readonly: boolean,
) => {
  if (!formDef) return [] as TableAction;

  const op = formDef.operations ?? {};
  const modals = resourceModals(api, resource, formDef, handleEvent);
  return [
    formDef.actions.map((action) => {
      return {
        action: backendAction(resource, formDef, defaultUriParams, action),
        tooltip: action.label,
        label: action.label,
        ...(action.condition && {
          visible: (row: any) => evaluateCondition(action.condition, row),
        }),
      };
    }),
    {
      action: modals.view,
      tooltip: 'View',
      icon: 'View',
    },
    !readonly && op.update
      ? {
          action: modals.edit,
          tooltip: 'Edit',
          icon: 'Edit',
        }
      : undefined,
    !readonly && op.delete
      ? {
          action: modals.delete,
          tooltip: 'Delete',
          icon: 'Delete',
        }
      : undefined,
  ]
    .flat()
    .filter(Boolean) as TableAction[];
};

/**
 * Build the list of table-level (toolbar) action buttons for a resource.
 * These are global actions — no row data is passed to the handler.
 */
export const tableActions = (
  resource: Resource,
  formDef: FormDefResponse | null | undefined,
): TableAction[] => {
  if (!formDef || !formDef.tableActions?.length) return [];

  const fetch = getFetch(formDef);

  return formDef.tableActions.map((action: TableActionDef) => {
    const label = action.tooltip ?? action.label ?? action.id;
    const handler = () => {
      if (action.type === 'link') {
        window.open(action.href, '_blank');
        return;
      }
      return fetch[action.method](action.uri, action.data ?? {})
        .then(({ data }: { data: any }) => {
          if (data?.success !== false) {
            NotificationService.success(data?.message ?? 'Done');
            resource.reload();
          } else {
            NotificationService.error(data?.message ?? 'Action failed');
          }
        })
        .catch(() => {
          NotificationService.error('Something went wrong, please try again');
        });
    };

    return {
      action: handler,
      tooltip: label,
      ...(action.label && !action.icon && { label: action.label }),
      ...(action.icon && { icon: action.icon }),
    } as TableAction;
  });
};

export const resourceModals = (
  api: ResourceApiInstance,
  resource: Resource,
  formDef: FormDefResponse,
  handleEvent: HandleEvent,
) => {
  const openWithData = (id: string | any, fn: (data) => void) => {
    let _id = id;
    if (typeof id !== 'string') {
      _id = id[formDef.idField];
    }

    api
      .getOneById(_id)
      .then((data) => fn(data))
      .catch((error) => {
        NotificationService.error('Something went wrong, please try again');
      });
  };

  return {
    create: () => openEditModal(api, resource, formDef, handleEvent)(),
    edit: (id: string) =>
      openWithData(id, openEditModal(api, resource, formDef, handleEvent)),
    view: (id: string) =>
      openWithData(id, openViewModal(api, resource, formDef, handleEvent)),
    delete: (id: string) =>
      openWithData(id, openDeleteModal(api, resource, handleEvent)),
  };
};
