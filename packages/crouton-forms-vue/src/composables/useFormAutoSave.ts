import { computed, nextTick, ref } from 'vue';

import { useAutoSave } from './useAutoSave';
import type { FormEventPayload } from './useFormEvents';

export interface AutoSaveFormProps {
  autoSave?: boolean;
  onAutoSave?: ((data: any) => Promise<any>) | null;
  onRefreshData?: (() => Promise<any>) | null;
  data?: any;
}

/**
 * Shared auto-save + form-event plumbing used by `useFormLogic` (FormModal /
 * AutoSaveForm) and `useCroutonFormLogic` (CroutonForm). Both wrappers keep
 * their own submit/validity rules; only the duplicated wiring lives here.
 */
export const useFormAutoSave = (
  properties: AutoSaveFormProps,
  emits: (event: 'events', payload: FormEventPayload) => void,
  valid: { value: boolean },
  formData: { value: any },
  formRef: { value: any },
) => {
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

  const liveValues = () =>
    formRef.value?.getCurrentValues?.() ?? formData.value;

  const triggerAutoSave = (data: any, isValid: boolean) => {
    if (autoSaver && !isRefreshing) {
      userHasEdited.value = true;
      autoSaver.trigger(data, isValid);
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

  return {
    autoSaver,
    autoSaveStatus,
    userHasEdited,
    liveValues,
    triggerAutoSave,
    onRetry,
    onFormEvents,
  };
};
