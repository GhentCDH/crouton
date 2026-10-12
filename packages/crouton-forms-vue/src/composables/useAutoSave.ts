import { onScopeDispose, shallowRef } from 'vue';

import {
  type AutoSaveStatus,
  type AutoSaverOptions,
  createAutoSaver,
} from '@ghentcdh/crouton-frontend-core';

export type { AutoSaveStatus };

export type UseAutoSaveOptions = AutoSaverOptions & {
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
};

export type UseAutoSaveReturn = {
  status: ReturnType<typeof shallowRef<AutoSaveStatus>>;
  trigger: (data: Record<string, unknown>, isValid: boolean) => void;
  saveNow: (data: Record<string, unknown>) => Promise<void>;
  cancel: () => void;
  resetBaseline: (data: Record<string, unknown>) => void;
};

export const useAutoSave = (options: UseAutoSaveOptions): UseAutoSaveReturn => {
  const saver = createAutoSaver(options);
  const status = shallowRef<AutoSaveStatus>(saver.status.get());

  const unsub = saver.status.subscribe((s) => { status.value = s; });
  onScopeDispose(unsub);

  return {
    status,
    trigger: saver.trigger,
    saveNow: saver.saveNow,
    cancel: saver.cancel,
    resetBaseline: saver.resetBaseline,
  };
};
