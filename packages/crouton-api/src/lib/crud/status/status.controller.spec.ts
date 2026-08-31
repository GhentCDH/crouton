import { GUARDS_METADATA } from '@nestjs/common/constants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';


import { createStatusController } from './status.controller';
import { type DataSourceRegistry } from '../data-source';
import type { Resource } from '../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { type ResourceConfigRegistry } from '../resource-config.registry';
import { CROUTON_SECURITY } from '../security';

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
    const ControllerClass = createStatusController();
    expect(ControllerClass).toBeDefined();
    expect(typeof ControllerClass).toBe('function');
  });

  it('getStatus should return full status shape', async () => {
    const ControllerClass = createStatusController();

    const mockDataSourceRegistry = {
      entries: () => [
        {
          name: 'main',
          client: { $queryRaw: () => Promise.resolve([]) },
        },
        {
          name: 'broken',
          client: {
            $queryRaw: () =>
              Promise.reject(new Error('connection refused')),
          },
        },
      ],
    } as unknown as DataSourceRegistry;

    const mockConfigs: Resource[] = [
      { name: 'users', route: 'users' } as Resource,
    ];

    resourceLoadErrorsRegistry.record({
      name: 'bad_resource',
      path: '/res/bad_resource/resource.json',
      error: 'Invalid JSON',
    });

    const mockConfigRegistry = {
      getAll: () => Promise.resolve(mockConfigs),
    } as unknown as ResourceConfigRegistry;

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
      version: 1,
    });
    expect(status.resources[1].valid).toBe(false);
    expect(status.resources[1].name).toBe('bad_resource');

    expect(status.summary.ok).toBe(false);
    expect(status.summary.databaseErrors).toBe(1);
    expect(status.summary.resourceErrors).toBe(1);
  });

  it('should never carry a security guard or security metadata', () => {
    const ControllerClass = createStatusController();
    // No class-level UseGuards
    const guards = Reflect.getMetadata(GUARDS_METADATA, ControllerClass);
    expect(guards).toBeUndefined();
    // No handler-level crouton:security
    const sec = Reflect.getMetadata(
      CROUTON_SECURITY,
      ControllerClass.prototype.getStatus,
    );
    expect(sec).toBeUndefined();
  });

  it('getStatus should report all-ok when healthy', async () => {
    const ControllerClass = createStatusController();

    const controller = new ControllerClass(
      {
        entries: () => [
          {
            name: 'db',
            client: { $queryRaw: () => Promise.resolve([]) },
          },
        ],
      } as unknown as DataSourceRegistry,
      {
        getAll: () =>
          Promise.resolve([{ name: 'res', route: 'res' } as Resource]),
      } as unknown as ResourceConfigRegistry,
    );

    const status = await controller.getStatus();

    expect(status.summary.ok).toBe(true);
    expect(status.summary.databaseErrors).toBe(0);
    expect(status.summary.resourceErrors).toBe(0);
  });
});