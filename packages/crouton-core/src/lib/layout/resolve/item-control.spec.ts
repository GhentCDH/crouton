import { describe, expect, it } from 'vitest';

import { resolveItemControl } from './item-control';
import { invalid } from '../../utils/test-utils';
import type { LayoutControl } from '../schema/LayoutItem.schema';

const field = (item: Record<string, unknown>) =>
  invalid<LayoutControl>({ id: 'name', ...item });

describe('resolveItemControl', () => {
  it('reports no control for a bare string (column control is used)', () => {
    expect(resolveItemControl('name')).toEqual({ hasControl: false });
  });

  it('reports no control for a component item', () => {
    expect(
      resolveItemControl(
        invalid<LayoutControl>({ component: 'MyWidget', colspan: 12 }),
      ),
    ).toEqual({ hasControl: false });
  });

  it('reports no control for an object with only presentation props', () => {
    expect(resolveItemControl(field({ label: 'Item label', colspan: 6 }))).toEqual({
      hasControl: false,
      type: undefined,
      options: undefined,
    });
  });

  it('takes the item type/options when supplied', () => {
    expect(
      resolveItemControl(field({ type: 'textarea', options: { rows: 5 } })),
    ).toEqual({ hasControl: true, type: 'textarea', options: { rows: 5 } });
  });

  it('treats options without a type as a control override', () => {
    expect(resolveItemControl(field({ options: { display: 'link' } }))).toEqual({
      hasControl: true,
      type: undefined,
      options: { display: 'link' },
    });
  });
});
