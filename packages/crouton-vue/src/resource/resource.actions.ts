import { ref } from 'vue';

import { AutoSaveForm, FormModal, type FormModalResult, JsonFormModalService } from '@ghentcdh/crouton-forms-vue';
import { ModalService, NotificationService, type TableAction } from '@ghentcdh/ui';

import { customControlRenderers, relationReadonlyRenderers } from './renderers';
import { type Resource } from './resource';
import type { ResourceApiInstance } from './resource.api';
import type { HandleEvent } from './resource.types';
import { replaceUriParams } from './uri.utils';
import { useResources } from './useResources';
import { type Action, type TableAction as TableActionDef } from '../composables/form-def.schema';
import type { FormDef, FormDefActionCondition } from '../composables/form-def.types';
import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';

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
          api.delete(data).then((response) => {
            if (response) resource.reload();
            handleEvent('close', { delete: true, data });
          });
        } else handleEvent('close', {});
      },
    });
  };

const openViewModal =
  (
    api: ResourceApiInstance,
    resource: Resource,
    formDef: FormDef,
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
      renderers: [
        ...relationReadonlyRenderers,
        ...useCrouton().readonlyRenderers,
      ],
      onEdit: op.update
        ? (data: any) =>
            openEditModal(api, resource, formDef, handleEvent)(data ?? formData)
        : undefined,
      onDelete: op.delete
        ? (data: any) =>
            openDeleteModal(api, resource, handleEvent)(data ?? formData)
        : undefined,
      http: useApi(),
      onView: (data: any) => {
        const resource = data.options.resource ?? data.options.schemasUri;
        if (!resource) return;

        useCrouton()
          .getFormByUri(resource)
          .then((config) => {
            if (!config) return;
            const _resource = useResources(config, { defaultUriParams: data });
            _resource?.resourceModal.view(data.data);
          });
      },
      onClose: () => {
        handleEvent('close', {});
      },
    });
  };

const getEditParams = (
  api: ResourceApiInstance,
  resource: Resource,
  formDef: FormDef,
  handleEvent: HandleEvent,
  formData?: any,
) => {
  const form = formDef.schemas.form;
  if (!form) return;

  const recordId = formData?.[formDef.idField];
  const isUpdate = !!recordId;

  handleEvent(isUpdate ? 'update' : 'create', { id: recordId });

  const crouton = useCrouton();
  const autoSaveEnabled = crouton.autoSave.value;
  const renderers = [...customControlRenderers, ...crouton.renderers];
  let formParams = {
    schema: form.data,
    uiSchema: form.ui,
    initialData: formData ?? form.parseValue({}),
    modalTitle: (isUpdate ? 'Update ' : 'Create ') + formDef.title,
    http: useApi(),
    renderers,
    // Re-fetch the parent record when a relation changes so the form stays in
    // sync. onRefreshData cancels any pending auto-save debounce first to
    // prevent the stale captured data from overwriting the server state.
    onRefreshData: isUpdate ? () => api.getOneById(recordId) : undefined,
  };

  if (autoSaveEnabled && isUpdate) {
    formParams = {
      ...formParams,
      autoSave: true,
      onAutoSave: (data: any) => api.save(recordId, data),
      onClose: () => {
        resource.reload();
        handleEvent('close', {});
      },
    };
  } else {
    formParams = {
      saveLabel: isUpdate ? 'Save' : 'Create',
      onClose: (result: FormModalResult) => {
        if (result && result.valid) {
          const data = result.data;
          const promise = isUpdate
            ? api.save(recordId, data)
            : api.create(data);

          promise.then((response) => {
            handleEvent('close', response);
            if (response) resource.reload();
          });
        } else {
          handleEvent('close', {});
        }
      },
    };
  }

  return {
    autoSaveEnabled,
    recordId,
    isUpdate,
    formParams,
  };
};

const openEditModal =
  (
    api: ResourceApiInstance,
    resource: Resource,
    formDef: FormDef,
    handleEvent: HandleEvent,
  ) =>
  (formData?: any) => {
    const form = formDef.schemas.form;
    if (!form) return;

    const recordId = formData?.[formDef.idField];
    const isUpdate = !!recordId;

    handleEvent(isUpdate ? 'update' : 'create', { id: recordId });

    const crouton = useCrouton();
    const autoSaveEnabled = crouton.autoSave.value;
    const renderers = [...customControlRenderers, ...crouton.renderers];

    const sharedProps = {
      schema: form.data,
      uiSchema: form.ui,
      modalSize: formDef.modalSize ?? 'lg',
      initialData: formData ?? form.parseValue({}),
      data: formData ?? form.parseValue({}),
      modalTitle: (isUpdate ? 'Update ' : 'Create ') + formDef.title,
      http: useApi(),
      renderers,
      onEvents: (event: any) => {
        // Other renderer events (e.g. 'create', 'view') can be handled here.
      },
      // Re-fetch the parent record when a relation changes so the form stays in
      // sync. onRefreshData cancels any pending auto-save debounce first to
      // prevent the stale captured data from overwriting the server state.
      onRefreshData: isUpdate ? () => api.getOneById(recordId) : undefined,
    } as const;

    if (autoSaveEnabled && isUpdate) {
      // ── Auto-save mode (edit only) ────────────────────────────────────────
      return {
        ...sharedProps,
        autoSave: true,
        onAutoSave: (data: any) => api.save(recordId, data),
        onClose: () => {
          resource.reload();
          handleEvent('close', {});
        },
      };
    } else {
      // ── Explicit save mode ────────────────────────────────────────────────
      // Always used for create; also used for update when autoSave is disabled.
      return {
        ...sharedProps,
        saveLabel: isUpdate ? 'Save' : 'Create',
        onClose: (result: FormModalResult) => {
          if (result && result.valid) {
            const data = result.data;
            const promise = isUpdate
              ? api.save(recordId, data)
              : api.create(data);

            promise.then((response) => {
              handleEvent('close', response);
              if (response) resource.reload();
            });
          } else {
            handleEvent('close', {});
          }
        },
      };
    }
  };

export const backendAction = (
  resource: Resource,
  formDef: FormDef,
  defaultUriParams: Record<string, string>,
  action: Action,
) => {
  const fetch = useApi();

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
      .catch(() => {
        NotificationService.error('Something went wrong, please try again');
      });
  };
};

export const actions = (
  api: ResourceApiInstance,
  resource: Resource,
  formDef: FormDef | null | undefined,
  defaultUriParams: Record<string, string>,
  handleEvent: HandleEvent,
  readonly: boolean,
) => {
  if (!formDef) return [] as TableAction[];

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
  formDef: FormDef | null | undefined,
): TableAction[] => {
  if (!formDef || !formDef.tableActions?.length) return [];

  const fetch = useApi();

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
  formDef: FormDef,
  handleEvent: HandleEvent,
) => {
  const openWithData = (id: unknown, fn: (data: any) => void) => {
    const _id =
      typeof id === 'string'
        ? id
        : String((id as Record<string, unknown>)[formDef.idField]);
    api
      .getOneById(_id)
      .then((data) => fn(data))
      .catch((error) => {
        console.error(error);
        NotificationService.error('Something went wrong, please try again');
      });
  };

  const form = ref<{
    component: any;
    config: any;
    hideTable: boolean;
    customComponent: string | null;
  } | null>(null);

  const openForm =
    (
      api: ResourceApiInstance,
      resource: Resource,
      formDef: FormDef,
      handleEvent: HandleEvent,
    ) =>
    (formData?: any) => {
      const mode = formDef.display.mode;
      const component = mode === 'page' ? AutoSaveForm : FormModal;

      const config = openEditModal(
        api,
        resource,
        formDef,
        handleEvent,
      )(formData);

      form.value = {
        component,
        config,
        customComponent: formDef.display.customComponent ?? null,
        hideTable: mode === 'page',
      };
    };

  return {
    form,
    create: () => openForm(api, resource, formDef, handleEvent)(),
    edit: (id: unknown) =>
      openWithData(id, openForm(api, resource, formDef, handleEvent)),
    view: (id: unknown) =>
      openWithData(id, openViewModal(api, resource, formDef, handleEvent)),
    delete: (id: unknown) =>
      openWithData(id, openDeleteModal(api, resource, handleEvent)),
  };
};
