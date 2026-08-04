import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadResourceConfigsFromDir } from './index';

import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';


const validResource = {
  name: 'valid_resource',
  route: 'valid-resource',
  model: 'ValidResource',
  tag: 'valid',
  operations: {},
};

describe('loadResourceConfigsFromDir', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-loader-test-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load valid resource and skip malformed one', async () => {
    // Create valid resource dir
    const validDir = join(tempDir, 'good');
    mkdirSync(validDir);
    writeFileSync(
      join(validDir, 'resource.json'),
      JSON.stringify(validResource),
    );

    // Create malformed resource dir
    const badDir = join(tempDir, 'bad');
    mkdirSync(badDir);
    writeFileSync(join(badDir, 'resource.json'), '{ broken json !!');

    const configs = await loadResourceConfigsFromDir(tempDir);

    expect(configs).toHaveLength(1);
    expect(configs[0].route).toBe('valid-resource');

    const errors = resourceLoadErrorsRegistry.getAll();
    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe('bad');
    expect(errors[0].error).toContain('Invalid JSON');
  });

  it('should record schema validation failure', async () => {
    const badDir = join(tempDir, 'invalid-schema');
    mkdirSync(badDir);
    writeFileSync(
      join(badDir, 'resource.json'),
      JSON.stringify({ bad: 'schema' }),
    );

    const configs = await loadResourceConfigsFromDir(tempDir);

    expect(configs).toHaveLength(0);

    const errors = resourceLoadErrorsRegistry.getAll();
    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe('invalid-schema');
    expect(errors[0].error).toContain('Resource cannot be parsed');
  });

  it('should clear errors on each call', async () => {
    const badDir = join(tempDir, 'bad');
    mkdirSync(badDir);
    writeFileSync(join(badDir, 'resource.json'), '!!!');

    await loadResourceConfigsFromDir(tempDir);
    expect(resourceLoadErrorsRegistry.getAll()).toHaveLength(1);

    // Second call should clear previous errors
    await loadResourceConfigsFromDir(tempDir);
    expect(resourceLoadErrorsRegistry.getAll()).toHaveLength(1);
  });

  it('should return empty array for non-existent dir', async () => {
    const configs = await loadResourceConfigsFromDir(
      join(tempDir, 'nope'),
    );
    expect(configs).toHaveLength(0);
  });
});