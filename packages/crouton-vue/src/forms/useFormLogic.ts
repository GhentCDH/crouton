import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import type { ComponentPublicInstance } from 'vue';
import { computed, nextTick, ref, watch } from 'vue';

import { type ViewConfig } from '@ghentcdh/crouton-core';
import { type FormEventPayload, useAutoSave, useDefaultRenderers } from '@ghentcdh/crouton-forms-vue';

import { type CroutonFormEmitsType, type CroutonFormProps } from './CroutonForm.properties';

/**
 * Shared editable-form logic used by both FormModal and AutoSaveForm.
 *
 * Extracts auto-save wiring, validity tracking, form event handlers, and
 * renderer resolution so the two wrapper components are pure templates.
 */
export const useFormLogic = (
  properties: CroutonFormProps,
  emits: <K extends keyof CroutonFormEmitsType>(
    event: K,
    ...args: CroutonFormEmitsType[K]
  ) => void,
  formData: { value: any },
  formRef: { value: ComponentPublicInstance | null | undefined },
) => {
  const viewType = properties.readonly ? 'view' : 'form';
  const view = (properties.views?.[viewType] ?? null) as ViewConfig | null;
  const uiSchema = view?.ui_schema ?? view?.ui ?? null;
  const schema = view?.json_schema ?? view?.data ?? null;
  const errors = ref(null);
  const id = `edit_${Math.floor(Math.random() * 1000)}`;
  const valid = ref(false);

  if (properties.data) {
    formData.value = properties.data;
  }

  // Resolve renderers via prop → inject fallback
  const renderers = useDefaultRenderers(
    properties.renderers as JsonFormsRendererRegistryEntry[] | null,
    properties.readonly ?? false,
  );
  // ─── Auto-save ──────────────────────────────────────────────────────────────

  const autoSaver =
    properties.autoSave && properties.onAutoSave
      ? useAutoSave({
          onSave: properties.onAutoSave,
          isValid: () => valid.value,
          initialData: properties.data ?? undefined,
        })
      : null;

  const userHasEdited = ref(false);
  let isRefreshing = false;

  const autoSaveStatus = computed(() => autoSaver?.status.value ?? 'idle');

  const autoSaveStatusLabel = computed(() => {
    switch (autoSaveStatus.value) {
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved ✓';
      case 'pending':
        return 'Fill required fields to save';
      case 'error':
        return 'Save failed';
      default:
        return '';
    }
  });

  const autoSaveStatusClass = computed(() => ({
    'text-gray-400': autoSaveStatus.value === 'idle',
    'text-blue-500': autoSaveStatus.value === 'saving',
    'text-green-600': autoSaveStatus.value === 'saved',
    'text-amber-500': autoSaveStatus.value === 'pending',
    'text-red-500': autoSaveStatus.value === 'error',
  }));

  // ─── Form event handlers ────────────────────────────────────────────────────

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
        request = fn(objectId, data);
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
    renderers,
    autoSaveStatus,
    autoSaveStatusLabel,
    autoSaveStatusClass,
    onCancel,
    onValid,
    onChange,
    onSubmit,
    onRetry,
    onFormEvents,
    onErrors,
    uiSchema,
    schema,
    errors,
  };
};
