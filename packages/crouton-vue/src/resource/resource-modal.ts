import { ZodObject } from 'zod';

import {
  type FormEventPayload,
  type FormModalResult,
  type UniqueCheckFn,
  createRepository,
} from '@ghentcdh/crouton-forms-vue';
import { NotificationService } from '@ghentcdh/crouton-ui-vue';

import { useApi } from '../composables/useApi';
import { type ResourceDefinition, useCrouton } from '../composables/useCrouton';
import { JsonFormModalService } from '../forms';

export type OpenFormPayload<TData = unknown, TResult = unknown> = {
  data?: TData;
  onSuccess: (result: TResult) => void;
  onError?: (error: unknown) => void;
};

const useFormDefRepository = (formDef: ResourceDefinition) => {
  const repository = createRepository({ uri: formDef.route }, useApi(), {
    notification: {
      show: true,
      entityType: formDef.title,
      notification: NotificationService,
    },
  });

  return repository;
};

export const openFormModal = async (key: string, payload: OpenFormPayload) => {
  const formDef = await useCrouton().getFormDefById(key);
  if (!formDef) throw new Error(`Form "${key}" not found`);
  const formSchema = formDef.schemas.form;
  const base = String(formDef.route).replace(/\/+$/, '');
  const uniqueCheck: UniqueCheckFn = (field, value, scope) =>
    useApi()
      .get(`${base}/unique`, {
        params: {
          field,
          value,
          ...(scope ? { scope: JSON.stringify(scope) } : {}),
        },
      })
      .then((r: { data?: { unique?: boolean } }) => r.data?.unique !== false)
      .catch(() => true);
  JsonFormModalService.openModal({
    initialData: payload.data ?? {},
    schema: formSchema.data,
    uiSchema: formSchema.ui,
    modalSize: formDef.modalSize ?? 'sm',
    modalTitle: `Create ${formDef.title}`,
    uniqueCheck,
    onClose: (result: FormModalResult) => {
      const repository = useFormDefRepository(formDef);
      if (result && result.valid) {
        repository
          .create(result.data as Record<string, unknown>)
          .then((created) => {
            const c = created as { id?: unknown; [key: string]: unknown };
            const zodSchema = formSchema.zodSchema;
            const parsed =
              zodSchema instanceof ZodObject
                ? zodSchema.strip().safeParse(c)
                : zodSchema.safeParse(c);
            payload.onSuccess({
              id: c.id,
              ...(parsed.data as Record<string, unknown> ?? {}),
            } as never);
          })
          .catch(() => {
            payload.onError?.(result);
          });
      }
    },
  });
};

export const handleFormEvents = (payload: FormEventPayload) => {
  switch (payload.event) {
    case 'create':
      openFormModal(payload.type, {
        ...payload,
        onSuccess:
          payload.onSuccess ??
          (() => {
            //
          }),
      });
      break;
    // case 'update': ... (when added to FormEventName)
    // case 'delete': ...
  }
};
