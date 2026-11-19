import { describe, expect, it } from 'vitest';

import { migrateResourceFile } from './migrate';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('migrateResourceFile', () => {
  it('explains a relation without resource and lists the applied rules (#598)', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'crouton-migrate-')), 'resource.json');
    writeFileSync(
      file,
      JSON.stringify({
        name: 'order',
        model: 'Order',
        columns: {
          customer: { fieldInput: { format: 'relation', relationType: 'manyToOne', options: { displayKey: 'name' } } },
        },
      }),
    );

    const outcome = await migrateResourceFile(file, { dryRun: true });

    expect(outcome.status).toBe('failed');
    const error = outcome.status === 'failed' ? outcome.error : '';
    expect(error).toContain('columns.customer.relation.resource');
    expect(error).toContain('add "resource" pointing at the related resource.json');
    expect(error).toContain('after rules: ');
  });
});
