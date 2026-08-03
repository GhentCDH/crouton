import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildStatus,
  buildSummary,
  checkDatabases,
  getEnvironment,
  getResourceStatus,
  getVersion,
} from './status.service';
import type { DataSourceRegistry } from '../data-source';
import type { Resource } from '../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';

const mockRegistry = (
  entries: { name: string; client: any }[],
): DataSourceRegistry =>
  ({
    entries: () => entries,
  }) as unknown as DataSourceRegistry;

describe('status.service', () => {
  beforeEach(() => {
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getVersion', () => {
    it('should return APP_VERSION env var', () => {
      vi.stubEnv('APP_VERSION', '1.2.3');
      expect(getVersion()).toBe('1.2.3');
    });

    it('should fallback to unknown', () => {
      delete process.env['APP_VERSION'];
      expect(getVersion()).toBe('unknown');
    });
  });

  describe('getEnvironment', () => {
    it('should prefer ENVIRONMENT over NODE_ENV', () => {
      vi.stubEnv('ENVIRONMENT', 'staging');
      vi.stubEnv('NODE_ENV', 'production');
      expect(getEnvironment()).toBe('staging');
    });

    it('should fallback to NODE_ENV', () => {
      delete process.env['ENVIRONMENT'];
      vi.stubEnv('NODE_ENV', 'production');
      expect(getEnvironment()).toBe('production');
    });

    it('should fallback to unknown', () => {
      delete process.env['ENVIRONMENT'];
      delete process.env['NODE_ENV'];
      expect(getEnvironment()).toBe('unknown');
    });
  });

  describe('checkDatabases', () => {
    it('should report healthy db as connected', async () => {
      const registry = mockRegistry([
        {
          name: 'main',
          client: { $queryRaw: () => Promise.resolve([{ '?column?': 1 }]) },
        },
      ]);

      const result = await checkDatabases(registry);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'main', connected: true });
    });

    it('should report failing db with error', async () => {
      const registry = mockRegistry([
        {
          name: 'broken',
          client: {
            $queryRaw: () =>
              Promise.reject(
                new Error(
                  'connect ECONNREFUSED postgresql://user:pass@localhost:5432/db',
                ),
              ),
          },
        },
      ]);

      const result = await checkDatabases(registry);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('broken');
      expect(result[0].connected).toBe(false);
      expect(result[0].error).toContain('[REDACTED]');
      expect(result[0].error).not.toContain('postgresql://');
    });

    it('should handle mixed healthy and unhealthy', async () => {
      const registry = mockRegistry([
        {
          name: 'ok',
          client: { $queryRaw: () => Promise.resolve([]) },
        },
        {
          name: 'down',
          client: {
            $queryRaw: () => Promise.reject(new Error('connection refused')),
          },
        },
      ]);

      const result = await checkDatabases(registry);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'ok', connected: true });
      expect(result[1].connected).toBe(false);
    });
  });

  describe('getResourceStatus', () => {
    it('should merge valid configs with load errors', () => {
      const configs = [
        { name: 'people', route: 'people' },
      ] as Resource[];

      resourceLoadErrorsRegistry.record({
        name: 'broken_res',
        path: '/resources/broken_res/resource.json',
        error: 'Invalid JSON',
      });

      const result = getResourceStatus(configs);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'people',
        path: 'people',
        valid: true,
      });
      expect(result[1]).toEqual({
        name: 'broken_res',
        path: '/resources/broken_res/resource.json',
        valid: false,
        error: 'Invalid JSON',
      });
    });
  });

  describe('buildSummary', () => {
    it('should report ok when no errors', () => {
      const summary = buildSummary(
        [{ name: 'db', connected: true }],
        [{ name: 'res', path: '/r', valid: true }],
      );
      expect(summary).toEqual({
        ok: true,
        databaseErrors: 0,
        resourceErrors: 0,
      });
    });

    it('should count errors', () => {
      const summary = buildSummary(
        [
          { name: 'ok', connected: true },
          { name: 'down', connected: false, error: 'fail' },
        ],
        [
          { name: 'good', path: '/g', valid: true },
          { name: 'bad', path: '/b', valid: false, error: 'parse error' },
        ],
      );
      expect(summary).toEqual({
        ok: false,
        databaseErrors: 1,
        resourceErrors: 1,
      });
    });
  });

  describe('buildStatus', () => {
    it('should assemble full status response', async () => {
      vi.stubEnv('APP_VERSION', '2.0.0');
      vi.stubEnv('ENVIRONMENT', 'test');

      const registry = mockRegistry([
        {
          name: 'main',
          client: { $queryRaw: () => Promise.resolve([]) },
        },
      ]);

      resourceLoadErrorsRegistry.record({
        name: 'bad',
        path: '/bad/resource.json',
        error: 'broken',
      });

      const status = await buildStatus(registry, [
        { name: 'good', route: 'good' } as Resource,
      ]);

      expect(status.version).toBe('2.0.0');
      expect(status.environment).toBe('test');
      expect(status.databases).toHaveLength(1);
      expect(status.databases[0].connected).toBe(true);
      expect(status.resources).toHaveLength(2);
      expect(status.summary.ok).toBe(false);
      expect(status.summary.resourceErrors).toBe(1);
    });
  });
});