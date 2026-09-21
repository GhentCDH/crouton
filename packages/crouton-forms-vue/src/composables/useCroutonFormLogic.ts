import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import type { ComponentPublicInstance } from 'vue';
import { computed, nextTick, ref, watch } from 'vue';

import type { ViewConfig } from '@ghentcdh/crouton-core';

import { useAutoSave } from './useAutoSave';
import type { FormEventPayload } from './useFormEvents';
import { useDefaultRenderers } from './useRendererProvider';

export interface FormResourceApi {
  create(data: any): Promise<any>;
  save?(id: string, data: any): Promise<any>;
  patch?(id: string, data: any): Promise<any>;
}

export interface CroutonFormLogicProps {
  readonly?: boolean;
  views: Record<string, ViewConfig>;
  renderers?: any[] | null;
  data?: any;
  autoSave?: boolean;
  onAutoSave?: ((data: any) => Promise<any>) | null;
  onRefreshData?: (() => Promise<any>) | null;
  formatBeforeSave?: ((data: any) => Promise<any>) | null;
  resourceApi?: FormResourceApi | null;
  saveId?: string | null;
}

export type CroutonFormLogicEmitsType = {
  cancel: [value: null];
  save: [data: unknown];
  onSaveSuccess: [response: unknown];
  onSaveError: [error: unknown];
  closeModal: [result: { data: any; valid: boolean } | null];
  events: [payload: FormEventPayload];
  errors: [errors: unknown];
  valid: [isValid: boolean];
};

export const useCroutonFormLogic = (
  properties: CroutonFormLogicProps,
  emits: <K extends keyof CroutonFormLogicEmitsType>(
    event: K,
    ...args: CroutonFormLogicEmitsType[K]
  ) => void,
  formData: { value: any },
  formRef: { value: ComponentPublicInstance | null | undefined },
) => {
  const viewType = properties.readonly ? 'view' : 'form';
  const view = ((properties.views as any)?.[viewType] ?? null) as ViewConfig | null;
  const uiSchema = view?.ui_schema ?? view?.ui ?? null;
  const schema = view?.json_schema ?? view?.data ?? null;
  const errors = ref(null);
  const id = `edit_${Math.floor(Math.random() * 1000)}`;
  const valid = ref(!(uiSchema && schema));

  if (properties.data) {
    formData.value = properties.data;
  }

  const renderers = useDefaultRenderers(
    properties.renderers as JsonFormsRendererRegistryEntry[] | null,
    properties.readonly ?? false,
  );

  const autoSaver =
    properties.autoSave && properties.onAutoSave
      ? useAutoSave({
          onSave: properties.onAutoSave,
          isValid: () => valid.value,
          initialData: properties.data ?? undefined,
        })
      : null;

  const currentValues = ref(properties.data ?? {});
  const userHasEdited = ref(false);
  let isRefreshing = false;

  const autoSaveStatus = computed(() => autoSaver?.status.value ?? 'idle');

  const onCancel = () => {
    formData.value = {};
    emits('cancel', null);
    emits('closeModal', null);
  };

  const onValid = (isValid: boolean) => {
    valid.value = isValid;
  };

  const liveValues = () =>
    (formRef.value as any)?.getCurrentValues?.() ?? formData.value;

  const onChange = (data: any) => {
    currentValues.value = data;
    if (autoSaver && !isRefreshing) {
      userHasEdited.value = true;
      autoSaver.trigger(data, valid.value);
    }
  };

  const onSubmit = () => {
    (formRef.value as any)?.markSubmitted?.();
    if (!valid.value) return;

    let data = liveValues();

    if (properties.formatBeforeSave) {
      data = properties.formatBeforeSave(data);
    }

    const resourceApi = properties.resourceApi;
    if (resourceApi) {
      let request: Promise<any>;
      const objectId = properties.saveId;
      if (!objectId) {
        request = resourceApi.create(data);
      } else {
        let fn = properties.autoSave ? resourceApi.patch : resourceApi.save;
        fn = fn ?? resourceApi.save;
        request = fn!(objectId, data);
      }
      request
        .then((response) => {
          emits('onSaveSuccess', response);
          emits('closeModal', { data, valid: true });
        })
        .catch((e) => {
          console.error(e);
          emits('onSaveError', e);
        });
    } else {
      emits('save', data);
      emits('closeModal', { data, valid: true });
    }
  };

  const onRetry = () => {
    if (autoSaver) {
      autoSaver.saveNow(liveValues());
    }
  };

  const onFormEvents = (payload: FormEventPayload) => {
    if (payload.event === 'update-relation' && properties.onRefreshData) {
      autoSaver?.cancel();
      userHasEdited.value = false;
      isRefreshing = true;
      properties
        .onRefreshData()
        .then((fresh) => {
          if (fresh) {
            autoSaver?.resetBaseline(fresh);
            nextTick(() => {
              formData.value = fresh;
            });
          }
        })
        .finally(() => {
          nextTick(() => {
            nextTick(() => {
              isRefreshing = false;
              userHasEdited.value = false;
            });
          });
        });
    }
    emits('events', payload);
  };

  const onErrors = (_errors: any) => {
    emits('errors', _errors);
    errors.value = _errors;

    if (autoSaver && userHasEdited.value) {
      autoSaver.trigger(liveValues(), valid.value);
    }
  };

  watch(valid, (newValid, oldValid) => {
    if (newValid !== oldValid) {
      emits('valid', newValid);
    }
  });

  return {
    id,
    valid,
    autoSaveStatus,
    onCancel,
    onValid,
    onChange,
    onSubmit,
    onRetry,
    onFormEvents,
    onErrors,
    renderers,
    schema,
    uiSchema,
    errors,
    currentValues,
  };
};
