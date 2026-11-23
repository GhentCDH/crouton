/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

const formDef = {
  id: 'book',
  idField: 'id',
  operations: {},
  schemas: { table: { ui: { type: 'Table', elements: [] }, data: {} } },
};
const getFormDefById = vi.fn(async () => formDef);

vi.mock('../composables/useCrouton', () => ({ useCrouton: () => ({ getFormDefById, cellRenderers: [] }) }));

const { useResourcesById } = await import('./useResources');

describe('useResourcesById (#615)', () => {
  it('builds the controller once the definition has loaded', async () => {
    const spy = vi.fn();
    const books = useResourcesById('book', { onRequest: spy, initialLoad: false });

    expect(books.value).toBeUndefined();
    await vi.waitFor(() => expect(books.value).toBeTruthy());
    await nextTick();

    expect(getFormDefById).toHaveBeenCalledWith('book');
    expect(books.value?.id).toBe('book');
  });
});
