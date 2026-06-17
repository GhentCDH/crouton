import { ref } from 'vue';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export type UseAutoSaveOptions = {
  /**
   * Called with the current form data when the debounce fires and the form is
   * valid. Should return a promise that resolves on success and rejects on
   * failure.
   */
  onSave: (data: any) => Promise<any>;
  /**
   * Milliseconds of inactivity after a field change before the save fires.
   * Defaults to 800.
   */
  debounceMs?: number;
};

export type UseAutoSaveReturn = {
  /** Current save status. Bind to a status indicator in the UI. */
  status: ReturnType<typeof ref<AutoSaveStatus>>;
  /**
   * Call this on every form `change` event.
   * - If `isValid` is false the timer is cancelled and status becomes `'pending'`.
   * - If `isValid` is true a debounced save is scheduled.
   */
  trigger: (data: any, isValid: boolean) => void;
  /**
   * Immediately cancel any pending debounce and call `onSave` right now.
   * Useful for the Retry button after an error.
   */
  saveNow: (data: any) => Promise<void>;
};

export const useAutoSave = ({
  onSave,
  debounceMs = 800,
}: UseAutoSaveOptions): UseAutoSaveReturn => {
  const status = ref<AutoSaveStatus>('idle');
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const executeSave = async (data: any) => {
    clearTimer();
    status.value = 'saving';
    try {
      await onSave(data);
      status.value = 'saved';
    } catch {
      status.value = 'error';
    }
  };

  const trigger = (data: any, isValid: boolean) => {
    clearTimer();

    if (!isValid) {
      // Can't save yet — waiting for required fields.
      if (status.value !== 'error') {
        status.value = 'pending';
      }
      return;
    }

    timerId = setTimeout(() => {
      executeSave(data);
    }, debounceMs);
  };

  const saveNow = (data: any) => executeSave(data);

  return { status, trigger, saveNow };
};
