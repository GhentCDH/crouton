import {
  type FormEventPayload,
  type FormModalResult,
  JsonFormModalService,
  createRepository,
} from '@ghentcdh/json-forms-vue';
import { NotificationService } from '@ghentcdh/ui';

import { useApi } from '../api';
import { type FormDef, useCrouton } from '../consumable/useCrouton';

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
  JsonFormModalService.openModal({
    data: payload.data ?? {},
    schema: formDef.form.json_schema,
    uiSchema: formDef.form.ui_schema,
    modalSize: 'sm',
    modalTitle: `Create ${formDef.title}`,
    onClose: (result: FormModalResult) => {
      const repository = useFormDefRepository(formDef);
      if (result && result.valid) {
        repository
          .create(result.data)
          .then((result) => {
            const zodSchema = formDef.form.zodSchema;
            payload.onSuccess({
              id: result.id,
              ...zodSchema.strip().safeParse(result).data,
            });
          })
          .catch((err) => {
            payload.onError?.(result);
          });
        // store.save(formData?.id, result.data).then(() => {
        //   reload.value = Date.now();
        // });
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
