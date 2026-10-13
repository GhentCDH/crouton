import type { Action, ResourceActionCondition, TableAction as TableActionDef } from '@ghentcdh/crouton-core';

import type { HttpClient, LinkOpener, Notifier } from '../api/ports';
import { replaceUriParams } from '../api/uri';

export const evaluateCondition = (
  condition: ResourceActionCondition | undefined,
  row: any,
): boolean => {
  if (!condition) return true;
  const v = row[condition.field];
  switch (condition.op ?? 'eq') {
    case 'eq': return v === condition.value;
    case 'neq': return v !== condition.value;
    case 'gt': return v > (condition.value as any);
    case 'gte': return v >= (condition.value as any);
    case 'lt': return v < (condition.value as any);
    case 'lte': return v <= (condition.value as any);
    case 'exists': return v !== null && v !== undefined && v !== '';
    case 'notExists': return v === null || v === undefined || v === '';
    default: return true;
  }
};

const httpMethodCall = (
  http: HttpClient,
  method: string,
  uri: string,
  data?: any,
): Promise<{ data: any }> => {
  switch (method) {
    case 'get': return http.get(uri, data);
    case 'patch': return http.patch(uri, data);
    case 'delete': return http.delete(uri, data);
    default: return http.post(uri, data);
  }
};

export const createBackendActionExecutor = (
  http: HttpClient,
  notifier: Notifier,
  linkOpener: LinkOpener,
) =>
  (
    action: Action,
    defaultUriParams: Record<string, string>,
    reload: () => void,
  ) =>
  (formData: any) => {
    if (action.type === 'link') {
      const href = replaceUriParams(action.href, { ...defaultUriParams, ...formData });
      linkOpener.open(href, action.blank);
      return;
    }

    const uri = replaceUriParams(
      replaceUriParams(action.uri, formData),
      defaultUriParams,
    );

    return httpMethodCall(http, action.method, uri, defaultUriParams)
      .then(({ data }: { data: any }) => {
        if (data.success) {
          notifier.success(data.message);
          reload();
        } else {
          notifier.error(data.message);
        }
      })
      .catch(() => {
        notifier.error('Something went wrong, please try again');
      });
  };

export type ActionDescriptor = {
  action: (row: any) => void;
  tooltip: string;
  label?: string | null;
  icon?: string;
  visible?: (row: any) => boolean;
};

export const buildRowActionDescriptors = (
  formDef: { actions: Action[] },
  executor: (
    action: Action,
    defaultUriParams: Record<string, string>,
    reload: () => void,
  ) => (formData: any) => void,
  defaultUriParams: Record<string, string>,
  reload: () => void,
): ActionDescriptor[] =>
  formDef.actions.map((action) => ({
    action: executor(action, defaultUriParams, reload),
    tooltip: action.label ?? action.id,
    icon: action.icon,
    label: action.icon ? null : (action.label ?? null),
    ...(action.condition && { visible: (row: any) => evaluateCondition(action.condition, row) }),
  }));

export type TableActionDescriptor = {
  action: () => void;
  tooltip: string;
  label?: string;
  icon?: string;
};

export const buildTableActionDescriptors = (
  http: HttpClient,
  notifier: Notifier,
  linkOpener: LinkOpener,
  tableActions: TableActionDef[],
  reload: () => void,
): TableActionDescriptor[] =>
  tableActions.map((action) => {
    const label = action.tooltip ?? action.label ?? action.id;
    const handler = () => {
      if (action.type === 'link') {
        linkOpener.open(action.href, true);
        return;
      }
      return httpMethodCall(http, action.method, action.uri, action.data ?? {})
        .then(({ data }: { data: any }) => {
          if (data?.success !== false) {
            notifier.success(data?.message ?? 'Done');
            reload();
          } else {
            notifier.error(data?.message ?? 'Action failed');
          }
        })
        .catch(() => {
          notifier.error('Something went wrong, please try again');
        });
    };

    return {
      action: handler,
      tooltip: label,
      ...(action.label && !action.icon && { label: action.label }),
      ...(action.icon && { icon: action.icon }),
    };
  });
