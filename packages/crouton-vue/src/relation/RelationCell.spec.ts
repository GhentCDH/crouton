/**
 * @vitest-environment happy-dom
 *
 * RelationCell resolves the display value of a relation/object cell from the
 * cell options. The table UI schema emits both `displayKey` and the legacy
 * `key` option, so the renderer must honour either (see table-cell.ts).
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

// RelationCell participates in a circular import graph (RelationCell →
// RelationModal / useResources / useCrouton → resource/renderers → RelationCell).
// Importing it as the entry point evaluates the cycle in a broken order, so mock
// the edges the component does not need for label rendering.
vi.mock('./RelationModal.vue', () => ({ default: { name: 'RelationModal', render: () => null } }));
vi.mock('../resource', () => ({ useResources: () => ({ view: () => undefined }) }));
vi.mock('../composables/useCrouton', () => ({ useCrouton: () => ({ getFormByUri: async () => null }) }));

import RelationCell from './RelationCell.vue';

const mountCell = (value: unknown, options?: Record<string, unknown>) =>
  mount(RelationCell, {
    props: {
      data: { book: value },
      column: { id: 'book', label: 'Book' },
      options,
    },
  });

describe('RelationCell – display value resolution', () => {
  it('renders the value named by `displayKey`', () => {
    const wrapper = mountCell({ id: 1, name: 'Dune' }, { displayKey: 'name' });

    expect(wrapper.text()).toContain('Dune');
  });

  it('falls back to the legacy `key` option when `displayKey` is absent', () => {
    const wrapper = mountCell({ id: 1, name: 'Dune' }, { key: 'name' });

    expect(wrapper.text()).toContain('Dune');
  });

  it('prefers `displayKey` over the legacy `key` option', () => {
    const wrapper = mountCell(
      { id: 1, name: 'Alpha', title: 'Beta' },
      { displayKey: 'name', key: 'title' },
    );

    expect(wrapper.text()).toContain('Alpha');
    expect(wrapper.text()).not.toContain('Beta');
  });

  it('falls back to `id` when neither option is present', () => {
    const wrapper = mountCell({ id: 42, name: 'Dune' });

    expect(wrapper.text()).toContain('42');
  });

  it('resolves nested `displayKey` paths', () => {
    const wrapper = mountCell(
      { id: 1, author: { name: 'Frank' } },
      { displayKey: 'author.name' },
    );

    expect(wrapper.text()).toContain('Frank');
  });

  it('renders record counts for numeric values', () => {
    expect(mountCell(1).text()).toContain('1 record');
    expect(mountCell(3).text()).toContain('3 records');
  });

  it('renders nothing when the value is missing', () => {
    expect(mountCell(null).find('button').exists()).toBe(false);
    expect(mountCell(undefined).find('button').exists()).toBe(false);
  });
});
