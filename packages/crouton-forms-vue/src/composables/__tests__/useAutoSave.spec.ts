import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoSave } from '../useAutoSave';

describe('useAutoSave.flush', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves pending debounced edits immediately', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const saver = useAutoSave({ onSave, initialData: { text: 'a' } });

    saver.trigger({ text: 'ab' }, true);
    await saver.flush();

    expect(onSave).toHaveBeenCalledWith({ text: 'ab' });
    expect(saver.status.value).toBe('saved');

    // Debounce timer was cleared: no second save.
    await vi.runAllTimersAsync();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('waits for an in-flight save', async () => {
    let resolve!: () => void;
    const onSave = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const saver = useAutoSave({ onSave, initialData: { text: 'a' } });

    saver.trigger({ text: 'ab' }, true);
    vi.advanceTimersByTime(800);

    let done = false;
    const flushed = saver.flush().then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);

    resolve();
    await flushed;
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when nothing is pending', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await useAutoSave({ onSave }).flush();
    expect(onSave).not.toHaveBeenCalled();
  });
});
