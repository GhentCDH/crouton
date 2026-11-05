/**
 * Render a concise, human-readable summary of what a resolved diff will write.
 */

import pc from 'picocolors';

import type { ResolvedDiff, WritePlan } from '@ghentcdh/crouton-codegen';

export interface ResourceChange {
  resolved: ResolvedDiff;
  plan: WritePlan;
}

const choice = (resolved: ResolvedDiff, id: string): string =>
  resolved.resolutions.get(id) ?? '';

/** One-block summary for a single resource. */
export const formatResourceChange = ({ resolved, plan }: ResourceChange): string => {
  const { diff } = resolved;
  const lines: string[] = [];
  const head = diff.isNew ? pc.green(`+ create ${diff.name}`) : pc.cyan(`~ update ${diff.name}`);
  lines.push(head);

  if (diff.isNew) {
    const sidebar = choice(resolved, 'sidebar') === 'no' ? 'hidden from sidebar' : 'in sidebar';
    const colCount = Object.keys(diff.draft.config.columns ?? {}).length;
    lines.push(`    ${colCount} columns, ${sidebar}`);
  } else {
    const added: string[] = [];
    const overwritten: string[] = [];
    const merged: string[] = [];
    const removed: string[] = [];
    for (const d of diff.decisions) {
      const c = choice(resolved, d.id);
      if (d.kind === 'addColumn' && c === 'add') added.push(d.field!);
      else if (d.kind === 'reconcileColumn' && c === 'overwrite') overwritten.push(d.field!);
      else if (d.kind === 'reconcileColumn' && c === 'merge') merged.push(d.field!);
      else if (d.kind === 'removeColumn' && c === 'remove') removed.push(d.field!);
    }
    if (added.length) lines.push(pc.green(`    + add: ${added.join(', ')}`));
    if (overwritten.length) lines.push(pc.yellow(`    ± overwrite: ${overwritten.join(', ')}`));
    if (merged.length) lines.push(pc.yellow(`    ± merge: ${merged.join(', ')}`));
    if (removed.length) lines.push(pc.red(`    - remove: ${removed.join(', ')}`));
    if (!added.length && !overwritten.length && !merged.length && !removed.length) {
      lines.push(pc.dim('    no column changes'));
    }
  }

  for (const file of plan.files) {
    if (file.action === 'create') lines.push(pc.dim(`    create ${file.path}`));
  }
  for (const note of plan.notes) lines.push(pc.dim(`    note: ${note}`));

  return lines.join('\n');
};
