import { type Component, type Ref, markRaw, ref } from 'vue';

import type {
  Action,
  ResourceActionCondition,
  ResourceDefinition,
  TableAction as TableActionDef,
} from '@ghentcdh/crouton-core';
import { resolveDefaultTokens } from '@ghentcdh/crouton-core';
import type { FormEventPayload, FormModalResult } from '@ghentcdh/crouton-forms-vue';
import {
  ModalService,
  NotificationService,
  type TableAction,
} from '@ghentcdh/crouton-ui-vue';

import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';
import { CroutonForm, FormModal, JsonFormModalService } from '../forms';
import { useLanguage } from '../i18n/useLanguage';
import { findCustomComponent } from '../utils/custom-component';
import { type Resource } from './resource';
import type { ResourceApiInstance } from './resource.api';
import { type EditRequire, editVisibleFor } from './resource.edit-requires';
import type { HandleEvent } from './resource.types';
import { replaceUriParams } from './uri.utils';
import { type ActionStatus, useResources } from './useResources';

type TableNodeOptions = {
  rowActions?: Action[];
  tableActions?: TableActionDef[];
  editRequires?: EditRequire[];
};

type TableNode = {
  type: string;
  elements?: Array<{ type: string }>;
  options?: TableNodeOptions;
};

type HttpMethod = (uri: string, params?: unknown) => Promise<{ data: { success?: boolean; message?: string } }>;

type FormConfig = {
  onClose?: (result: FormModalResult | undefined) => Promise<void> | void;
  modalTitle?: string;
  title?: string;
  [key: string]: unknown;
};

const getTableNode = (ui: TableNode | undefined | null): TableNode | null => {
  if (!ui) return null;
  if (ui.type === 'Table') return ui;
  return (ui.elements?.find((e) => e.type === 'Table') as TableNode | undefined) ?? null;
};

const evaluateCondition = (
  condition: ResourceActionCondition | undefined,
  row: Record<string, unknown>,
): boolean => {
  if (!condition) return true;
  const v = row[condition.field];
  switch (condition.op ?? 'eq') {
    case 'eq':
      return v === condition.value;
    case 'neq':
      return v !== condition.value;
    case 'gt':
      return (v as number) > (condition.value as number);
    case 'gte':
      return (v as number) >= (condition.value as number);
    case 'lt':
      return (v as number) < (condition.value as number);
    case 'lte':
      return (v as number) <= (condition.value as number);
    case 'exists':
      return v !== null && v !== undefined && v !== '';
    case 'notExists':
      return v === null || v === undefined || v === '';
    default:
      return true;
  }
};

export const confirmDelete = (
  onConfirmed: () => void,
  options?: { label?: string; onCancelled?: () => void },
) => {
  const { t } = useLanguage();
  ModalService.showConfirm({
    title: t('modal.deleteTitle', 'Delete record'),
    message: options?.label
      ? `Delete ${options.label}? The data will be lost.`
      : t('modal.deleteMessage', 'Are you sure to delete, the data will be lost?'),
    onClose: (result) => {
      if (result.confirmed) onConfirmed();
      else options?.onCancelled?.();
    },
  });
};

const openDeleteModal = (api: ResourceApiInstance, resource: Resource, handleEvent: HandleEvent, onSuccess?: () => void) =>
  (data: Record<string, unknown>) => {
    confirmDelete(
      () => {
        api.delete(data).then((response: unknown) => {
          if (response) resource.reload();
          handleEvent('close', { delete: true, data });
          onSuccess?.();
        });
      },
      { onCancelled: () => handleEvent('close', {}) },
    );
  };

const openViewModal =
  (
    api: ResourceApiInstance,
    resource: Resource,
    formDef: ResourceDefinition,
    handleEvent: HandleEvent,
  ) =>
  (formData: Record<string, unknown>) => {
    const view = formDef.schemas.view;
    if (!formData) NotificationService.error('cannot load data');
    if (!view) return;

    handleEvent('view', { id: formData[formDef.idField] });
    const op = formDef.operations;
    JsonFormModalService.openViewModal({
      schema: view.data,
      uiSchema: view.ui,
      modalSize: formDef.modalSize ?? 'lg',
      data: formData,
      modalTitle: formDef.title ?? '',
      http: useApi(),
      renderers: undefined,
      onEdit:
        op.update || op.patch
          ? (data: Record<string, unknown>) =>
              openEditModal(
                api,
                resource,
                formDef,
                handleEvent,
              )(data ?? formData)
          : undefined,
      onDelete: op.delete
        ? (data: Record<string, unknown>) =>
            openDeleteModal(api, resource, handleEvent)(data ?? formData)
        : undefined,
      onView: (data: unknown) => {
        const opts = (data as Record<string, unknown>)?.['options'] as Record<string, unknown> | undefined;
        const resourceUri = opts?.['resource'] ?? opts?.['schemasUri'];
        if (!resourceUri) return;
        const dataRecord = data as Record<string, unknown>;

        useCrouton()
          .getFormByUri(String(resourceUri))
          .then((config) => {
            if (!config) return;
            const _resource = useResources(config, { defaultUriParams: dataRecord as Record<string, string> });
            _resource?.view(dataRecord['data'] as Record<string, unknown>);
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
    formDef: ResourceDefinition,
    handleEvent: HandleEvent,
    onSuccess?: (type: 'created' | 'updated') => void,
  ) =>
  (formData?: Record<string, unknown>) => {
    JsonFormModalService.openModal(
      createEditForm(api, resource, formDef, handleEvent, onSuccess)(formData) as Parameters<typeof JsonFormModalService.openModal>[0],
    );
  };

const createEditForm =
  (
    api: ResourceApiInstance,
    resource: Resource,
    formDef: ResourceDefinition,
    handleEvent: HandleEvent,
    onSuccess?: (type: 'created' | 'updated') => void,
  ) =>
  (formData?: Record<string, unknown>) => {
    const form = formDef.schemas.form;
    if (!form) return;

    const recordId = formData?.[formDef.idField];
    const isUpdate = !!recordId;

    handleEvent(isUpdate ? 'update' : 'create', { id: recordId });

    const crouton = useCrouton();
    const autoSaveEnabled = crouton.autoSave.value;

    const blankData: Record<string, unknown> =
      formData ??
      (resolveDefaultTokens(form.parseValue({}), {
        defaults: crouton.defaults,
      }) as Record<string, unknown>);

    const sharedProps = {
      schema: form.data,
      uiSchema: form.ui,
      modalSize: formDef.modalSize ?? 'lg',
      initialData: blankData,
      data: blankData,
      modalTitle: `${useLanguage().t(isUpdate ? 'modal.update' : 'modal.create', isUpdate ? 'Update' : 'Create')} ${formDef.title}`,
      http: useApi(),
      views: formDef.schemas,
      showErrors: crouton.showErrors.value,
      debugValue: crouton.debugValue.value,
      onEvents: (_event: FormEventPayload) => {
        // Other renderer events (e.g. 'create', 'view') can be handled here.
      },
      // Re-fetch the parent record when a relation changes so the form stays in
      // sync. onRefreshData cancels any pending auto-save debounce first to
      // prevent the stale captured data from overwriting the server state.
      onRefreshData: isUpdate ? () => api.getOneById(String(recordId)) : undefined,
    } as const;

    if (autoSaveEnabled && isUpdate) {
      // ── Auto-save mode (edit only) ────────────────────────────────────────
      return {
        ...sharedProps,
        autoSave: true,
        onAutoSave: (data: Record<string, unknown>) => api.patch(String(recordId), data),
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
        saveLabel: useLanguage().t(isUpdate ? 'actions.save' : 'actions.create', isUpdate ? 'Save' : 'Create'),
        onClose: async (result: FormModalResult) => {
          if (result && result.valid) {
            const data = result.data;
            const response = await (isUpdate
              ? api.save(String(recordId), data)
              : api.create(data));
            if (!response) throw new Error('Save failed');
            onSuccess?.(isUpdate ? 'updated' : 'created');
            handleEvent('close', response);
            resource.reload();
          } else {
            handleEvent('close', {});
          }
        },
      };
    }
  };

export const backendAction = (
  resource: Resource,
  formDef: ResourceDefinition,
  defaultUriParams: Record<string, string>,
  action: Action,
  setStatus?: (status: ActionStatus | null, autoClear?: boolean) => void,
) => {
  const fetch = useApi();

  return (formData: Record<string, unknown>) => {
    if (action.type === 'link') {
      const href = replaceUriParams(action.href, {
        ...defaultUriParams,
        ...formData,
      });
      if (action.blank) window.open(href, '_blank');
      else window.location.href = href;
      return;
    }

    const { t } = useLanguage();
    const procedureAction = action as Extract<Action, { type: 'procedure' }>;
    const uri = replaceUriParams(action.uri, formData);

    setStatus?.({ text: procedureAction.pendingMessage ?? t('notifications.actionPending', 'Processing…'), type: 'pending' }, false);

    const _fetch = (fetch as unknown as Record<string, unknown>)[action.method ?? 'post'] as HttpMethod;
    return _fetch(replaceUriParams(uri, defaultUriParams), defaultUriParams)
      .then(async ({ data }) => {
        if (data.success) {
          await resource.reload();
          setStatus?.({ text: procedureAction.successMessage ?? data.message ?? t('notifications.actionSuccess', 'Done'), type: 'success' });
        } else {
          setStatus?.({ text: procedureAction.errorMessage ?? data.message ?? t('notifications.actionFailed', 'Action failed'), type: 'error' });
        }
      })
      .catch(() => {
        setStatus?.({ text: t('notifications.actionError', 'Something went wrong, please try again'), type: 'error' });
      });
  };
};

export const actions = (
  api: ResourceApiInstance,
  resource: Resource,
  formDef: ResourceDefinition | null | undefined,
  defaultUriParams: Record<string, string>,
  handleEvent: HandleEvent,
  readonly: boolean,
  modals?: ReturnType<typeof resourceModals>,
  setStatus?: (status: ActionStatus | null, autoClear?: boolean) => void,
) => {
  if (!formDef) return [] as TableAction[];

  const op = formDef.operations ?? {};
  const _modals =
    modals ?? resourceModals(api, resource, formDef, handleEvent, false);
  const pendingKey = ref<string | null>(null);
  const tableNode = getTableNode(formDef.schemas.table.ui as TableNode);
  const editRequires = tableNode?.options?.editRequires;
  return [
    (getTableNode(formDef.schemas.table.ui as TableNode)?.options?.rowActions ?? []).map(
      (action: Action) => {
        const idField = formDef.idField;
        return {
          action: (row: Record<string, unknown>) => {
            const key = `${action.id}:${row[idField]}`;
            pendingKey.value = key;
            return Promise.resolve(backendAction(resource, formDef, defaultUriParams, action, setStatus)(row))
              .finally(() => { if (pendingKey.value === key) pendingKey.value = null; });
          },
          tooltip: action.label,
          icon: action.icon,
          label: action.icon ? null : action.label,
          loading: (row: Record<string, unknown>) => pendingKey.value === `${action.id}:${row[idField]}`,
          ...('condition' in action && action.condition && {
            visible: (row: Record<string, unknown>) => evaluateCondition(action.condition, row),
          }),
        };
      },
    ),
    {
      action: (id: unknown) => _modals.view(id),
      tooltip: useLanguage().t('actions.view', 'View'),
      icon: 'View',
    },
    !readonly && (op.update || op.patch)
      ? {
          action: (id: unknown) => _modals.edit(id),
          tooltip: useLanguage().t('actions.edit', 'Edit'),
          icon: 'Edit',
          ...(editRequires?.length && {
            visible: (row: Record<string, unknown>) => editVisibleFor(row, editRequires),
          }),
        }
      : undefined,
    !readonly && op.delete
      ? {
          action: (id: unknown) => _modals.delete(id),
          tooltip: useLanguage().t('actions.delete', 'Delete'),
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
  formDef: ResourceDefinition | null | undefined,
  setStatus?: (status: ActionStatus | null, autoClear?: boolean) => void,
): TableAction[] => {
  const _tableActions: TableActionDef[] =
    getTableNode(formDef?.schemas.table.ui as TableNode | undefined)?.options?.tableActions ?? [];
  if (!formDef || !_tableActions.length) return [];

  const fetch = useApi();
  const pendingActionId = ref<string | null>(null);

  return _tableActions.map((action: TableActionDef) => {
    const label = action.tooltip ?? action.label ?? action.id;
    const handler = () => {
      if (action.type === 'link') {
        window.open(action.href, '_blank');
        return;
      }
      const { t } = useLanguage();
      const procedureAction = action as Extract<typeof action, { type: 'procedure' }>;
      pendingActionId.value = action.id;
      setStatus?.({ text: procedureAction.pendingMessage ?? t('notifications.actionPending', 'Processing…'), type: 'pending' }, false);
      const _fetch = (fetch as unknown as Record<string, unknown>)[action.method ?? 'post'] as HttpMethod;
      return _fetch(action.uri, action.data ?? {})
        .then(async ({ data }) => {
          if (data?.success !== false) {
            await resource.reload();
            const msg = procedureAction.successMessage ?? data?.message ?? t('notifications.actionSuccess', 'Done');
            setStatus?.({ text: msg, type: 'success' });
          } else {
            const msg = procedureAction.errorMessage ?? data?.message ?? t('notifications.actionFailed', 'Action failed');
            setStatus?.({ text: msg, type: 'error' });
          }
        })
        .catch(() => {
          setStatus?.({ text: t('notifications.actionError', 'Something went wrong, please try again'), type: 'error' });
        })
        .finally(() => { pendingActionId.value = null; });
    };

    return {
      action: handler,
      tooltip: label,
      loading: () => pendingActionId.value === action.id,
      ...(action.label && !action.icon && { label: action.label }),
      ...(action.icon && { icon: action.icon }),
    } as TableAction;
  });
};

interface ResourceModals {
  form: Ref<{
    component: Component;
    config: FormConfig;
    hideTable: boolean;
    customComponent: Component | null;
  } | null>;
  closeForm: (result: FormModalResult | undefined) => Promise<void>;
  create: () => void;
  edit: (id: unknown) => void;
  view: (id: unknown) => void;
  delete: (id: unknown) => void;
}

export const resourceModals = (
  api: ResourceApiInstance,
  resource: Resource,
  formDef: ResourceDefinition,
  handleEvent: HandleEvent,
  inline: boolean,
  onSuccess?: (type: 'created' | 'updated' | 'deleted') => void,
): ResourceModals => {
  const openWithData = (id: unknown, fn: (data: Record<string, unknown>) => void) => {
    const _id =
      typeof id === 'string'
        ? id
        : String((id as Record<string, unknown>)[formDef.idField]);

    api
      .getOneById(_id)
      .then((data: unknown) => {
        return fn(data as Record<string, unknown>);
      })
      .catch((error: unknown) => {
        console.error(error);
        NotificationService.error('Something went wrong, please try again');
      });
  };

  const form = ref<{
    component: Component;
    config: FormConfig;
    hideTable: boolean;
    customComponent: Component | null;
  } | null>(null);

  const crouton = useCrouton();

  const openForm =
    (
      api: ResourceApiInstance,
      resource: Resource,
      formDef: ResourceDefinition,
      handleEvent: HandleEvent,
    ) =>
    (formData?: Record<string, unknown>) => {
      const mode = formDef.display.mode;
      if (!inline && mode !== 'page') {
        openEditModal(api, resource, formDef, handleEvent, onSuccess)(formData);
        return;
      }
      const isPageMode = mode === 'page';
      const component = (isPageMode ? CroutonForm : FormModal) as Component;

      const customComponent =
        findCustomComponent(
          crouton.customComponents,
          formDef.display.customComponent,
        ) ?? null;
      const config = createEditForm(
        api,
        resource,
        formDef,
        handleEvent,
        onSuccess,
      )(formData) as FormConfig | undefined;

      // CroutonForm uses `title` instead of `modalTitle`
      if (isPageMode && config) {
        config['title'] = config['modalTitle'];
      }

      form.value = {
        component: markRaw(component),
        config: config ?? {},
        customComponent: customComponent ? markRaw(customComponent) : null,
        hideTable: isPageMode,
      };
    };

  const closeForm = async (result: FormModalResult | undefined) => {
    const onClose = form.value?.config?.onClose;
    if (onClose) {
      try {
        await onClose(result);
      } catch {
        return; // API error — keep modal open
      }
    }
    form.value = null;
  };

  return {
    form,
    closeForm,
    create: () => openForm(api, resource, formDef, handleEvent)(),
    edit: (id: unknown) =>
      openWithData(id, openForm(api, resource, formDef, handleEvent)),
    view: (id: unknown) =>
      formDef.display.mode === 'page'
        ? openWithData(id, openForm(api, resource, formDef, handleEvent))
        : openWithData(id, openViewModal(api, resource, formDef, handleEvent)),
    delete: (id: unknown) =>
      openWithData(id, openDeleteModal(api, resource, handleEvent, () => onSuccess?.('deleted'))),
  };
};
