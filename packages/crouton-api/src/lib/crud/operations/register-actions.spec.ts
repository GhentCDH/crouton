import { describe, expect, it, vi } from 'vitest';

import { invalid } from '../../../testing/index';
import type { OperationContext } from './operation-context';
import { registerActionRoutes, registerTableActionRoutes } from './register-actions';

const procedure = vi.fn(async () => ({ success: true }));
const action = { id: 'recalc', label: 'Recalculate', data: { year: 2024 }, procedure };

vi.mock('@ghentcdh/crouton-core', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getRowProcedureActions: () => [action],
  getTableProcedureActions: () => [action],
}));

type Methods = Record<string, (...args: unknown[]) => unknown>;
const ctx = () => invalid<OperationContext>({ cls: class {}, config: { name: 'book' } });
const repo = { repo: { prisma: 'PRISMA' } };
const request = { query: {} };

describe('procedure actions receive data and request (#616)', () => {
  it('table action: procedure(prisma, { data, request })', async () => {
    const c = ctx();
    registerTableActionRoutes(c);
    await (c.cls.prototype as Methods)['tableAction_recalc'].call(repo, request);
    expect(procedure).toHaveBeenLastCalledWith('PRISMA', { data: { year: 2024 }, request });
  });

  it('row action: procedure(prisma, recordId, { data, request })', async () => {
    const c = ctx();
    registerActionRoutes(c);
    await (c.cls.prototype as Methods)['procedure_recalc'].call(repo, '7', request);
    expect(procedure).toHaveBeenLastCalledWith('PRISMA', '7', { data: { year: 2024 }, request });
  });
});
