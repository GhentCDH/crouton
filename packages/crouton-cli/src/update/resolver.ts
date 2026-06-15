/**
 * Interactive `DecisionResolver` built on `@clack/prompts`. Maps the engine's
 * serializable decisions to prompts; the backend dev endpoint will swap this
 * for an auto/request-driven resolver against the very same decisions.
 */

import * as clack from '@clack/prompts';

import type { Decision, DecisionResolver, ResourceDiff } from '@ghentcdh/crouton-codegen';

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

const assertNotCancel = <T>(value: T | symbol): T => {
  if (clack.isCancel(value)) throw new CancelledError();
  return value as T;
};

export const interactiveResolver: DecisionResolver = {
  async resolve(decisions: Decision[], diff: ResourceDiff): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    if (decisions.length === 0) return out;

    clack.log.step(`${diff.isNew ? 'New' : 'Update'}: ${diff.name}`);

    const byKind = (kind: Decision['kind']) => decisions.filter((d) => d.kind === kind);

    // New resource → sidebar
    for (const d of byKind('addToSidebar')) {
      const add = assertNotCancel(
        await clack.confirm({ message: `Add "${diff.name}" to the sidebar?`, initialValue: true }),
      );
      out[d.id] = add ? 'yes' : 'no';
    }

    // Add columns (multiselect, all preselected)
    const adds = byKind('addColumn');
    if (adds.length > 0) {
      const selected = assertNotCancel(
        await clack.multiselect({
          message: `Columns to add to "${diff.name}"`,
          options: adds.map((d) => ({ value: d.field!, label: d.field! })),
          initialValues: adds.map((d) => d.field!),
          required: false,
        }),
      ) as string[];
      for (const d of adds) out[d.id] = selected.includes(d.field!) ? 'add' : 'skip';
    }

    // Reconcile changed columns. Ask once for the whole resource, with an
    // escape hatch to decide individually.
    const reconciles = byKind('reconcileColumn');
    if (reconciles.length > 0) {
      const fields = reconciles.map((d) => d.field).join(', ');
      const mode = assertNotCancel(
        await clack.select({
          message: `${reconciles.length} field(s) in "${diff.name}" already exist (${fields}) — how should they be handled?`,
          options: [
            { value: 'keep', label: 'Keep existing (all)' },
            { value: 'overwrite', label: 'Overwrite with generated defaults (all)' },
            { value: 'merge', label: 'Merge — add only missing keys (all)' },
            { value: 'per-field', label: 'Decide per field' },
          ],
          initialValue: 'keep',
        }),
      ) as string;

      if (mode === 'per-field') {
        for (const d of reconciles) {
          out[d.id] = assertNotCancel(
            await clack.select({
              message: `"${d.field}"${d.context ? ` (${d.context})` : ''} — what should happen?`,
              options: [
                { value: 'keep', label: 'Keep existing' },
                { value: 'overwrite', label: 'Overwrite with generated defaults' },
                { value: 'merge', label: 'Merge (add only missing keys)' },
              ],
              initialValue: d.recommended,
            }),
          ) as string;
        }
      } else {
        for (const d of reconciles) out[d.id] = mode;
      }
    }

    // Remove columns no longer in the DB (multiselect, none preselected)
    const removes = byKind('removeColumn');
    if (removes.length > 0) {
      const selected = assertNotCancel(
        await clack.multiselect({
          message: `Columns not in the DB schema for "${diff.name}" — select any to remove`,
          options: removes.map((d) => ({ value: d.field!, label: d.field! })),
          initialValues: [],
          required: false,
        }),
      ) as string[];
      for (const d of removes) out[d.id] = selected.includes(d.field!) ? 'remove' : 'keep';
    }

    return out;
  },
};
