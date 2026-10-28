import { GUARDS_METADATA } from '@nestjs/common/constants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { createStatusController } from './status.controller';
import { type DataSourceRegistry } from '../data-access/adapter';
import type { Resource } from '../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { type ResourceConfigRegistry } from '../resource-config.registry';
import { CROUTON_SECURITY } from '../security';
import { invalid } from '../test-utils';

describe('createStatusController', () => {
  beforeEach(() => {
    resourceLoadErrorsRegistry.clear();
    vi.stubEnv('APP_VERSION', '1.0.0');
    vi.stubEnv('ENVIRONMENT', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create a controller class', () => {
    const ControllerClass = createStatusController({});
    expect(ControllerClass).toBeDefined();
    expect(typeof ControllerClass).toBe('function');
  });

  it('getStatus should return full status shape', async () => {
    const ControllerClass = createStatusController({});

    const mockDataSourceRegistry = invalid<DataSourceRegistry>({
      entries: () => [
        {
          name: 'main',
          adapter: { healthCheck: () => Promise.resolve() },
        },
        {
          name: 'broken',
          adapter: { healthCheck: () => Promise.reject(new Error('connection refused')) },
        },
      ],
    });

    const mockConfigs: Resource[] = [
      { name: 'users', route: 'users' } as Resource,
    ];

    resourceLoadErrorsRegistry.record({
      name: 'bad_resource',
      path: '/res/bad_resource/resource.json',
      error: 'Invalid JSON',
    });

    const mockConfigRegistry = invalid<ResourceConfigRegistry>({
      getAll: () => Promise.resolve(mockConfigs),
    });

    const controller = new ControllerClass(
      mockDataSourceRegistry,
      mockConfigRegistry,
    );

    const status = await controller.getStatus();

    expect(status.version).toBe('1.0.0');
    expect(status.environment).toBe('test');

    expect(status.databases).toHaveLength(2);
    expect(status.databases[0]).toEqual({ name: 'main', connected: true });
    expect(status.databases[1].name).toBe('broken');
    expect(status.databases[1].connected).toBe(false);
    expect(status.databases[1].error).toBeDefined();

    expect(status.resources).toHaveLength(2);
    expect(status.resources[0]).toEqual({
      name: 'users',
      path: 'users',
      valid: true,
      kind: 'prisma',
      version: CURRENT_RESOURCE_VERSION,
    });
    expect(status.resources[1].valid).toBe(false);
    expect(status.resources[1].name).toBe('bad_resource');

    expect(status.summary.ok).toBe(false);
    expect(status.summary.databaseErrors).toBe(1);
    expect(status.summary.resourceErrors).toBe(1);
  });

  it('should never carry a security guard or security metadata', () => {
    const ControllerClass = createStatusController({});
    // No class-level UseGuards
    expect(Reflect.getMetadata(GUARDS_METADATA, ControllerClass)).toBeUndefined();
    // No handler-level crouton:security
    expect(Reflect.getMetadata(
      CROUTON_SECURITY,
      ControllerClass.prototype.getStatus,
    )).toBeUndefined();
  });

  it('getStatus should report all-ok when healthy', async () => {
    const ControllerClass = createStatusController({});

    const controller = new ControllerClass(
      invalid<DataSourceRegistry>({
        entries: () => [
          {
            name: 'db',
            adapter: { healthCheck: () => Promise.resolve() },
          },
        ],
      }),
      invalid<ResourceConfigRegistry>({
        getAll: () =>
          Promise.resolve([{ name: 'res', route: 'res' } as Resource]),
      }),
    );

    const status = await controller.getStatus();

    expect(status.summary.ok).toBe(true);
    expect(status.summary.databaseErrors).toBe(0);
    expect(status.summary.resourceErrors).toBe(0);
  });
});
