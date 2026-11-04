import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import type { ComponentPublicInstance } from 'vue';
import { nextTick, ref, watch } from 'vue';

import type { ViewConfig } from '@ghentcdh/crouton-core';

import { useFormAutoSave } from './useFormAutoSave';
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
  const view = ((properties.views as any)?.[viewType] ??
    null) as ViewConfig | null;
  const uiSchema = view?.ui ?? null;
  const schema = view?.data ?? null;
  const errors = ref(null);
  const id = `edit_${Math.floor(Math.random() * 1000)}`;
  const valid = ref(!(uiSchema && schema));

  if (properties.data) {
    formData.value = properties.data;
  }

  watch(
    () => properties.data,
    async () => {
      formData.value = properties.data;
      await nextTick();
      const result = await (formRef.value as any)?.validate?.();
      if (result) valid.value = result.valid;
    },
  );

  const renderers = useDefaultRenderers(
    properties.renderers as JsonFormsRendererRegistryEntry[] | null,
    properties.readonly ?? false,
  );

  const {
    autoSaver,
    autoSaveStatus,
    userHasEdited,
    liveValues,
    triggerAutoSave,
    onRetry,
    onFormEvents,
  } = useFormAutoSave(properties, emits, valid, formData, formRef);

  const currentValues = ref(properties.data ?? {});

  const onCancel = () => {
    formData.value = {};
    emits('cancel', null);
    emits('closeModal', null);
  };

  const onValid = (isValid: boolean) => {
    valid.value = isValid;
  };

  const onChange = (data: any) => {
    currentValues.value = data;
    triggerAutoSave(data, valid.value);
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
