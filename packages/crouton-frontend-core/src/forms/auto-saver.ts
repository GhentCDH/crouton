import { type Store, createStore } from '../store';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export type AutoSaverOptions = {
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
  isValid?: () => boolean;
  debounceMs?: number;
  initialData?: Record<string, unknown>;
};

export type AutoSaver = {
  status: Store<AutoSaveStatus>;
  trigger: (data: Record<string, unknown>, isValid: boolean) => void;
  saveNow: (data: Record<string, unknown>) => Promise<void>;
  cancel: () => void;
  resetBaseline: (data: Record<string, unknown>) => void;
};

const computeDelta = (
  current: Record<string, unknown>,
  baseline: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  if (!baseline) return current;
  const delta: Record<string, unknown> = {};
  let hasChange = false;
  for (const key of Object.keys(current)) {
    if (JSON.stringify(current[key]) !== JSON.stringify(baseline[key])) {
      delta[key] = current[key];
      hasChange = true;
    }
  }
  return hasChange ? delta : null;
};

export const createAutoSaver = ({
  onSave,
  isValid,
  debounceMs = 800,
  initialData,
}: AutoSaverOptions): AutoSaver => {
  const status = createStore<AutoSaveStatus>('idle');
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let baseline: Record<string, unknown> | null = initialData
    ? JSON.parse(JSON.stringify(initialData))
    : null;

  const clearTimer = () => {
    if (timerId !== null) { clearTimeout(timerId); timerId = null; }
  };

  const executeSave = async (data: Record<string, unknown>) => {
    if (isValid && !isValid()) { status.set('pending'); return; }
    const delta = computeDelta(data, baseline);
    if (!delta) { status.set(baseline ? 'saved' : 'idle'); return; }
    clearTimer();
    status.set('saving');
    try {
      await onSave(delta);
      baseline = JSON.parse(JSON.stringify(data));
      status.set('saved');
    } catch (error) {
      console.error(error);
      status.set('error');
    }
  };

  const trigger = (data: Record<string, unknown>, valid: boolean) => {
    clearTimer();
    if (!valid) {
      if (status.get() !== 'error') status.set('pending');
      return;
    }
    timerId = setTimeout(() => executeSave(data), debounceMs);
  };

  return {
    status,
    trigger,
    saveNow: (data) => executeSave(data),
    cancel: () => { clearTimer(); status.set('saved'); },
    resetBaseline: (data) => { baseline = JSON.parse(JSON.stringify(data)); },
  };
};
