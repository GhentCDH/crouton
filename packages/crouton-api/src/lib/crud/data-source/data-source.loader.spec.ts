import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadDataSourcesFromDir } from './data-source.loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';


describe('loadDataSourcesFromDir', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-ds-test-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should skip malformed JSON and record error', async () => {
    const badDir = join(tempDir, 'broken');
    mkdirSync(badDir);
    writeFileSync(join(badDir, 'data-source.json'), '{ not json }');

    const results = await loadDataSourcesFromDir(tempDir);

    expect(results).toHaveLength(0);

    const errors = resourceLoadErrorsRegistry.getAll();
    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe('broken');
    expect(errors[0].error).toContain('Invalid JSON');
  });

  it('should skip invalid schema and record error', async () => {
    const badDir = join(tempDir, 'bad-schema');
    mkdirSync(badDir);
    writeFileSync(
      join(badDir, 'data-source.json'),
      JSON.stringify({ invalid: true }),
    );

    const results = await loadDataSourcesFromDir(tempDir);

    expect(results).toHaveLength(0);

    const errors = resourceLoadErrorsRegistry.getAll();
    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe('bad-schema');
    expect(errors[0].error).toContain('Invalid datasource schema');
  });

  it('should return empty array for non-existent dir', async () => {
    const results = await loadDataSourcesFromDir(join(tempDir, 'nope'));
    expect(results).toHaveLength(0);
  });

  it('should skip dir without data-source.json', async () => {
    const emptyDir = join(tempDir, 'empty');
    mkdirSync(emptyDir);

    const results = await loadDataSourcesFromDir(tempDir);
    expect(results).toHaveLength(0);
    expect(resourceLoadErrorsRegistry.getAll()).toHaveLength(0);
  });
});