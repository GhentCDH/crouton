import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { computed, ref, watch } from 'vue';

import { useFormAutoSave } from './useFormAutoSave';
import { useDefaultRenderers } from './useRendererProvider';
import { useUiTranslator } from './useUiTranslator';
import type { FormModalProp } from '../forms/modal/FormModal.properties';

/**
 * Shared editable-form logic used by both FormModal and AutoSaveForm.
 *
 * Extracts auto-save wiring, validity tracking, form event handlers, and
 * renderer resolution so the two wrapper components are pure templates.
 */
type FormRefInstance = {
  markSubmitted?: () => void;
  getCurrentValues?: () => Record<string, unknown>;
};

export const useFormLogic = (
  properties: FormModalProp,
  emits: (
    event: 'closeModal' | 'events' | 'errors' | 'valid',
    ...args: unknown[]
  ) => void,
  formData: { value: Record<string, unknown> },
  formRef: { value: FormRefInstance | null | undefined },
) => {
  const t = useUiTranslator();
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

  const {
    autoSaver,
    autoSaveStatus,
    userHasEdited,
    liveValues,
    triggerAutoSave,
    onRetry,
    onFormEvents,
  } = useFormAutoSave(properties, emits, valid, formData, formRef);

  const autoSaveStatusLabel = computed(() => {
    switch (autoSaveStatus.value) {
      case 'saving':
        return t('autoSave.saving', 'Saving…');
      case 'saved':
        return t('autoSave.saved', 'Saved ✓');
      case 'pending':
        return t('autoSave.pending', 'Fill required fields to save');
      case 'error':
        return t('autoSave.error', 'Save failed');
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

  const onChange = (data: Record<string, unknown>) => {
    triggerAutoSave(data, valid.value);
  };

  const onSubmit = () => {
    formRef.value?.markSubmitted?.();
    if (!valid.value) return;
    emits('closeModal', { data: liveValues(), valid: valid.value });
  };

  const onErrors = (errors: unknown) => {
    emits('errors', errors);
    const isValid =
      !errors ||
      (Array.isArray(errors)
        ? errors.length === 0
        : typeof errors === 'object' && errors !== null && Object.keys(errors).length === 0);
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
