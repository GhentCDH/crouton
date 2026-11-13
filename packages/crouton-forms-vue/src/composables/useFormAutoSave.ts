import { computed, nextTick, ref } from 'vue';

import { computeDelta, useAutoSave } from './useAutoSave';
import type { FormEventPayload } from './useFormEvents';

export interface AutoSaveFormProps {
  autoSave?: boolean;
  onAutoSave?: ((data: Record<string, unknown>) => Promise<unknown>) | null;
  onRefreshData?: (() => Promise<unknown>) | null;
  data?: Record<string, unknown>;
}

/**
 * Shared auto-save + form-event plumbing used by `useFormLogic` (FormModal) and `useCroutonFormLogic` (CroutonForm). Both wrappers keep
 * their own submit/validity rules; only the duplicated wiring lives here.
 */
type FormRefInstance = {
  getCurrentValues?: () => Record<string, unknown>;
};

export const useFormAutoSave = (
  properties: AutoSaveFormProps,
  emits: (event: 'events', payload: FormEventPayload) => void,
  valid: { value: boolean },
  formData: { value: Record<string, unknown> },
  formRef: { value: FormRefInstance | null | undefined },
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

  const triggerAutoSave = (data: Record<string, unknown>, isValid: boolean) => {
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
      // The pending debounce is cancelled (its captured data may predate the
      // refresh), but the edits themselves are kept: anything differing from
      // the last saved state is merged over the fresh server data below and
      // re-saved, including text typed while the refresh was in flight.
      autoSaver?.cancel();
      const savedBefore = autoSaver?.getBaseline() ?? null;
      let unsaved: Record<string, unknown> | null = null;
      let merged: Record<string, unknown> | null = null;
      isRefreshing = true;
      properties
        .onRefreshData()
        .then((fresh) => {
          if (fresh) {
            const freshData = fresh as Record<string, unknown>;
            unsaved = savedBefore
              ? computeDelta(liveValues(), savedBefore)
              : null;
            const next = unsaved ? { ...freshData, ...unsaved } : freshData;
            merged = next;
            autoSaver?.resetBaseline(freshData);
            nextTick(() => {
              formData.value = next;
            });
          }
        })
        .finally(() => {
          nextTick(() => {
            nextTick(() => {
              isRefreshing = false;
              if (unsaved && merged) {
                triggerAutoSave(merged, valid.value);
              } else {
                userHasEdited.value = false;
              }
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
