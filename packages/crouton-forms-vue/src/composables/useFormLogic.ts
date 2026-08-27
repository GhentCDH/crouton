import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import type { ComponentPublicInstance } from 'vue';
import { computed, nextTick, ref, watch } from 'vue';

import { useAutoSave } from './useAutoSave';
import type { FormEventPayload } from './useFormEvents';
import { useDefaultRenderers } from './useRendererProvider';
import type { FormModalProp } from '../forms/modal/FormModal.properties';

/**
 * Shared editable-form logic used by both FormModal and AutoSaveForm.
 *
 * Extracts auto-save wiring, validity tracking, form event handlers, and
 * renderer resolution so the two wrapper components are pure templates.
 */
export const useFormLogic = (
  properties: FormModalProp,
  emits: (
    event: 'closeModal' | 'events' | 'errors' | 'valid',
    ...args: any[]
  ) => void,
  formData: { value: any },
  formRef: { value: ComponentPublicInstance | null | undefined },
) => {
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
    emits('closeModal', { data: liveValues(), valid: valid.value });
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

  const onErrors = (errors: any) => {
    emits('errors', errors);
    const isValid =
      !errors ||
      (Array.isArray(errors)
        ? errors.length === 0
        : Object.keys(errors).length === 0);
    valid.value = isValid;

    if (autoSaver && userHasEdited.value) {
      autoSaver.trigger(liveValues(), isValid);
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
  };
};
