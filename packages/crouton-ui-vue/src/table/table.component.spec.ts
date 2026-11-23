/**
 * @vitest-environment happy-dom
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import Table from './table.component.vue';

const row = { id: 1, name: 'Dune' };
const mountTable = (props: Record<string, unknown>, attrs: Record<string, unknown> = {}) =>
  mount(Table, { props: { data: [row], displayColumns: [], ...props }, attrs });

const clickRow = async (wrapper: ReturnType<typeof mountTable>) => {
  await wrapper.find('tbody tr').trigger('click');
};

describe('Table rowClick (#613)', () => {
  it('runs the edit action passed in `actions` (resource tables)', async () => {
    const edit = vi.fn();
    const wrapper = mountTable({ rowClick: 'edit', actions: [{ icon: 'Edit', kind: 'edit', action: edit }] });
    await clickRow(wrapper);
    expect(edit).toHaveBeenCalledWith(row);
  });

  it('runs an @view listener (plain tables)', async () => {
    const onView = vi.fn();
    const wrapper = mountTable({ rowClick: 'view' }, { onView });
    await clickRow(wrapper);
    expect(onView).toHaveBeenCalledWith(row);
  });

  it('does nothing when the action is hidden for the row', async () => {
    const edit = vi.fn();
    const wrapper = mountTable({
      rowClick: 'edit',
      actions: [{ kind: 'edit', action: edit, visible: () => false }],
    });
    await clickRow(wrapper);
    expect(edit).not.toHaveBeenCalled();
  });

  it('does not add the default buttons to the actions prop', () => {
    const actions = [{ kind: 'view', action: vi.fn() }];
    mountTable({ actions }, { onEdit: vi.fn() });
    expect(actions).toHaveLength(1);
  });
});
