import { ZodObject } from 'zod';

import {
  type FormEventPayload,
  type FormModalResult,
  JsonFormModalService,
  createRepository,
} from '@ghentcdh/json-forms-vue';
import { NotificationService } from '@ghentcdh/ui';

import { useApi } from '../composables/useApi';
import { type FormDef, useCrouton } from '../composables/useCrouton';

export type OpenFormPayload<TData = any, TResult = any> = {
  data?: TData;
  onSuccess: (result: TResult) => void;
  onError?: (error: unknown) => void;
};

export const useFormDefRepository = (formDef: FormDef) => {
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
  const formDef = await useCrouton().getFormDef(key);
  if (!formDef) throw new Error(`Form "${key}" not found`);
  const formSchema = formDef.schemas.form;
  JsonFormModalService.openModal({
    initialData: payload.data ?? {},
    schema: formSchema.data,
    uiSchema: formSchema.ui,
    modalSize: formDef.modalSize ?? 'sm',
    modalTitle: `Create ${formDef.title}`,
    onClose: (result: FormModalResult) => {
      const repository = useFormDefRepository(formDef);
      if (result && result.valid) {
        repository
          .create(result.data)
          .then((created: any) => {
            const zodSchema = formSchema.zodSchema;
            const parsed =
              zodSchema instanceof ZodObject
                ? zodSchema.strip().safeParse(created)
                : zodSchema.safeParse(created);
            payload.onSuccess({
              id: created.id,
              ...(parsed.data ?? {}),
            });
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
      openFormModal(payload.type, payload);
      break;
    // case 'update': ... (when added to FormEventName)
    // case 'delete': ...
  }
};
