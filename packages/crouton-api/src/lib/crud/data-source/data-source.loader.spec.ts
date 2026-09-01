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

  it('loads a custom adapter without urlEnv', async () => {
    const dsDir = join(tempDir, 'nourlds');
    mkdirSync(dsDir);
    writeFileSync(
      join(dsDir, 'data-source.json'),
      JSON.stringify({ name: 'nourlds', adapter: 'custom' }),
    );
    writeFileSync(join(dsDir, 'index.js'), 'module.exports = { kind: \'no-url-adapter\' };');

    const results = await loadDataSourcesFromDir(tempDir);

    expect(results).toHaveLength(1);
    expect(results[0].adapter.kind).toBe('no-url-adapter');
    expect(resourceLoadErrorsRegistry.getAll()).toHaveLength(0);
  });

  it('loads a custom adapter when adapter field is "custom"', async () => {
    const dsDir = join(tempDir, 'myds');
    mkdirSync(dsDir);
    writeFileSync(
      join(dsDir, 'data-source.json'),
      JSON.stringify({ name: 'myds', urlEnv: 'MYDS_URL', adapter: 'custom' }),
    );
    // CJS module exporting a valid DataSourceAdapter object
    writeFileSync(
      join(dsDir, 'index.js'),
      'module.exports = { kind: \'test-adapter\' };',
    );

    const results = await loadDataSourcesFromDir(tempDir);

    expect(results).toHaveLength(1);
    expect(results[0].adapter.kind).toBe('test-adapter');
    expect(resourceLoadErrorsRegistry.getAll()).toHaveLength(0);
  });

  it('records an error when custom adapter export is not a valid adapter', async () => {
    const dsDir = join(tempDir, 'bads');
    mkdirSync(dsDir);
    writeFileSync(
      join(dsDir, 'data-source.json'),
      JSON.stringify({ name: 'bads', urlEnv: 'BADS_URL', adapter: 'custom' }),
    );
    // Not a DataSourceAdapter — scalar export
    writeFileSync(join(dsDir, 'index.js'), 'module.exports = 42;');

    const results = await loadDataSourcesFromDir(tempDir);

    expect(results).toHaveLength(0);
    const errors = resourceLoadErrorsRegistry.getAll();
    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe('bads');
    expect(errors[0].error).toContain('must default-export a DataSourceAdapter');
  });
});