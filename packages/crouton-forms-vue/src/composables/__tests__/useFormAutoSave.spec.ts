import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { useFormAutoSave } from '../useFormAutoSave';

const flushTicks = async () => {
  for (let i = 0; i < 5; i++) await nextTick();
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('useFormAutoSave relation refresh', () => {
  it('keeps unsaved edits when a relation change refreshes the record', async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    let resolveRefresh!: (v: unknown) => void;
    const onRefreshData = vi.fn(
      () => new Promise((r) => (resolveRefresh = r)),
    );
    const initial = { translation: 'a', authors: [] as number[] };
    const formData = { value: { ...initial } as Record<string, unknown> };
    let live: Record<string, unknown> = { ...initial };

    const { triggerAutoSave, onFormEvents } = useFormAutoSave(
      { autoSave: true, onAutoSave, onRefreshData, data: initial },
      vi.fn(),
      { value: true },
      formData,
      { value: { getCurrentValues: () => live } },
    );

    // User types; debounced save pending.
    live = { ...live, translation: 'ab' };
    triggerAutoSave(live, true);

    // Relation changed elsewhere → refresh starts while the user keeps typing.
    onFormEvents({ event: 'update-relation', type: 'author', data: {} });
    live = { ...live, translation: 'abc' };

    resolveRefresh({ translation: 'a', authors: [1] });
    await flushTicks();

    expect(formData.value).toEqual({ translation: 'abc', authors: [1] });

    await wait(900);
    expect(onAutoSave).toHaveBeenCalledTimes(1);
    expect(onAutoSave).toHaveBeenCalledWith({ translation: 'abc' });
  });

  it('replaces data and saves nothing when there are no local edits', async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    const initial = { translation: 'a', authors: [] as number[] };
    const formData = { value: { ...initial } as Record<string, unknown> };

    const { onFormEvents } = useFormAutoSave(
      {
        autoSave: true,
        onAutoSave,
        onRefreshData: () =>
          Promise.resolve({ translation: 'a', authors: [1] }),
        data: initial,
      },
      vi.fn(),
      { value: true },
      formData,
      { value: { getCurrentValues: () => initial } },
    );

    onFormEvents({ event: 'update-relation', type: 'author', data: {} });
    await flushTicks();

    expect(formData.value).toEqual({ translation: 'a', authors: [1] });
    await wait(900);
    expect(onAutoSave).not.toHaveBeenCalled();
  });
});
