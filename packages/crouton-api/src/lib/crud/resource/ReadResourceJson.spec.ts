import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readResourceJson } from './ReadResourceJson';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';


describe('readResourceJson', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return undefined for non-existent file', () => {
    const result = readResourceJson(join(tempDir, 'nope.json'));
    expect(result).toBeUndefined();
  });

  it('should return success for valid resource.json', () => {
    const jsonPath = join(tempDir, 'resource.json');
    writeFileSync(
      jsonPath,
      JSON.stringify({
        name: 'test',
        route: 'test',
        model: 'Test',
        tag: 'test',
        operations: {},
      }),
    );

    const result = readResourceJson(jsonPath);

    expect(result).toBeDefined();
    expect(result!.success).toBe(true);
    if (result!.success) {
      expect(result!.data.json.name).toBe('test');
      expect(result!.data.json.route).toBe('test');
    }
  });

  it('should return failure for invalid JSON syntax', () => {
    const jsonPath = join(tempDir, 'resource.json');
    writeFileSync(jsonPath, '{ not valid json !!!');

    const result = readResourceJson(jsonPath);

    expect(result).toBeDefined();
    expect(result!.success).toBe(false);
    if (!result!.success) {
      expect(result!.error).toContain('Invalid JSON');
    }
  });

  it('should return failure for valid JSON that fails schema validation', () => {
    const jsonPath = join(tempDir, 'resource.json');
    writeFileSync(jsonPath, JSON.stringify({ bad: 'schema' }));

    const result = readResourceJson(jsonPath);

    expect(result).toBeDefined();
    expect(result!.success).toBe(false);
    if (!result!.success) {
      expect(result!.error).toContain('Resource cannot be parsed');
    }
  });
});