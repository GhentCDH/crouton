import { describe, expect, it } from 'vitest';

import { validateLayout } from './validate';
import type { JsonColumn } from '../../resource/Column';
import type { FormLayoutNode } from '../schema/LayoutNode.schema';

const col = (id: string, extra: Partial<JsonColumn> = {}): JsonColumn =>
  ({ id, hiddenInTable: false, hiddenInForm: false, hiddenInView: false, ...extra } as JsonColumn);

describe('validateLayout', () => {
  it('no errors for valid layout', () => {
    const node: FormLayoutNode = { items: ['name', 'email'] };
    const cols = [col('name'), col('email')];
    const result = validateLayout(node, cols, 'form');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('error for unknown column id', () => {
    const node: FormLayoutNode = { items: ['name', 'typo'] };
    const cols = [col('name')];
    const { errors } = validateLayout(node, cols, 'form');
    expect(errors).toContain('layout.form: unknown column id "typo"');
  });

  it('error for duplicate column id', () => {
    const node: FormLayoutNode = { items: ['name', 'name'] };
    const cols = [col('name')];
    const { errors } = validateLayout(node, cols, 'form');
    expect(errors).toContain('layout.form: duplicate column id "name"');
  });

  it('warning for required column missing from form layout', () => {
    const node: FormLayoutNode = { items: ['name'] };
    const cols = [col('name'), col('email', { required: true })];
    const { warnings } = validateLayout(node, cols, 'form');
    expect(warnings[0]).toMatch(/required column "email" not in layout\.form/);
  });

  it('no required warning for view context', () => {
    const node: FormLayoutNode = { items: ['name'] };
    const cols = [col('name'), col('email', { required: true })];
    const { warnings } = validateLayout(node, cols, 'view');
    expect(warnings).toEqual([]);
  });

  it('collects ids from nested nodes', () => {
    const node: FormLayoutNode = {
      items: [{ items: ['name', 'unknown'] }],
    };
    const cols = [col('name')];
    const { errors } = validateLayout(node, cols, 'form');
    expect(errors).toContain('layout.form: unknown column id "unknown"');
  });

  it('no required warning for idField columns', () => {
    const node: FormLayoutNode = { items: ['name'] };
    const cols = [col('name'), col('id', { required: true, idField: true })];
    const { warnings } = validateLayout(node, cols, 'form');
    expect(warnings).toEqual([]);
  });
});
