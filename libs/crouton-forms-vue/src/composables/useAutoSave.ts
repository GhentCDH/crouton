import { ref } from 'vue';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export type UseAutoSaveOptions = {
  /**
   * Called with the **changed fields only** (delta) when the debounce fires
   * and the form is valid. Should return a promise that resolves on success
   * and rejects on failure.
   */
  onSave: (data: any) => Promise<any>;
  /**
   * Optional callback re-checked at execution time (when the debounce fires).
   * Use this to guard against the race where `trigger` is called with a stale
   * `isValid=true` before async validation (vee-validate's 5 ms debounce) has
   * had a chance to update the validity flag.
   */
  isValid?: () => boolean;
  /**
   * Milliseconds of inactivity after a field change before the save fires.
   * Defaults to 800.
   */
  debounceMs?: number;
  /**
   * Initial form data used as the baseline for computing deltas.
   * If omitted, the first `trigger` call will save all fields.
   */
  initialData?: Record<string, unknown>;
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
  /**
   * Cancel any pending debounce without saving and reset status to `'saved'`.
   * Call this before externally refreshing the form data (e.g. after a relation
   * change) to prevent stale captured data from being written to the server.
   */
  cancel: () => void;
  /**
   * Update the baseline snapshot (e.g. after a server refresh replaces the
   * form data). Subsequent saves will only include fields that differ from
   * this new baseline.
   */
  resetBaseline: (data: Record<string, unknown>) => void;
};

/**
 * Compute the top-level keys whose values differ between `current` and
 * `baseline`. Returns only the changed entries, or `null` when nothing changed.
 */
const computeDelta = (
  current: Record<string, unknown>,
  baseline: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  if (!baseline) return current;

  const delta: Record<string, unknown> = {};
  let hasChange = false;

  for (const key of Object.keys(current)) {
    if (
      JSON.stringify(current[key]) !== JSON.stringify(baseline[key])
    ) {
      delta[key] = current[key];
      hasChange = true;
    }
  }

  return hasChange ? delta : null;
};

export const useAutoSave = ({
  onSave,
  isValid,
  debounceMs = 800,
  initialData,
}: UseAutoSaveOptions): UseAutoSaveReturn => {
  const status = ref<AutoSaveStatus>('idle');
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let baseline: Record<string, unknown> | null = initialData
    ? JSON.parse(JSON.stringify(initialData))
    : null;

  const clearTimer = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const executeSave = async (data: any) => {
    // Re-check validity at execution time. This defends against the race where
    // onChange fires with a stale valid=true (before vee-validate's async
    // validation has completed) and onErrors didn't manage to cancel the timer.
    if (isValid && !isValid()) {
      status.value = 'pending';
      return;
    }

    const delta = computeDelta(data, baseline);
    if (!delta) {
      // Nothing changed — skip the network call.
      status.value = baseline ? 'saved' : 'idle';
      return;
    }

    clearTimer();
    status.value = 'saving';
    try {
      await onSave(delta);
      // Successful save: advance the baseline so the next save only includes
      // fields changed after this point.
      baseline = JSON.parse(JSON.stringify(data));
      status.value = 'saved';
    } catch (error) {
      console.error(error);
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

  const cancel = () => {
    clearTimer();
    // Server already holds the correct state (e.g. after an external write like
    // a relation change), so 'saved' is the right status to show.
    status.value = 'saved';
  };

  const resetBaseline = (data: Record<string, unknown>) => {
    baseline = JSON.parse(JSON.stringify(data));
  };

  return { status, trigger, saveNow, cancel, resetBaseline };
};
