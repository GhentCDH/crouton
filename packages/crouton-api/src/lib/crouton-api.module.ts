import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { type CroutonConfig } from '@ghentcdh/crouton-core';

import { createAppLayoutController } from './crud/app-layout';
import { loadConfig } from './crud/config/read';
import { CroutonValidationExceptionFilter } from './crud/crouton-validation.filter';
import { createCrudController } from './crud/crud-controller.factory';
import type { DataSourceEntry } from './crud/data-source';
import { DataSourceRegistry, loadDataSourcesFromDir } from './crud/data-source';
import { FileSystemResourceConfigLoader } from './crud/loader/fs-resource-config.loader';
import { loadResourceConfigsFromDir } from './crud/loader/index';
import { type ResourceConfigLoader } from './crud/loader/resource-config.loader';
import { type Resource } from './crud/resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from './crud/resource/resource-load-errors.registry';
import { ResourceConfigRegistry } from './crud/resource-config.registry';
import { createStatusController } from './crud/status';

type CroutonAppConfig = {
  baseUrl: string;
  /**
   * Explicit path to the project enum registry (`crouton.enums.json`).
   * When omitted, the loader walks up from the resources dir to find it.
   */
  // enumsFile?: string;
  /**
   * Sidebar group definitions, keyed by group slug.
   * Matches `sidebarGroups` in `crouton.json`.
   * Resources reference a group via `sidebar.group` in their `resource.json`.
   */
  // sidebarGroups?: Record<string, SidebarGroupConfig>;
  /**
   * Application title served to the frontend via `GET /_app/layout`.
   * Displayed in the admin sidebar header.
   */
  // title?: string;
  /**
   * Whether form fields are saved automatically as the user edits them.
   * Served to the frontend via `GET /_app/layout`. Defaults to `true`.
   * Set to `false` to restore explicit Save/Cancel buttons across the app.
   * Matches `autoSave` in `crouton.json`.
   */
  // autoSave?: boolean;
};
@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class CroutonApiModule {
  onModuleInit() {
    // BigInt has no toJSON — JSON.stringify throws "Do not know how to serialize a BigInt".
    // Patch once so every response containing BigInt fields (e.g. Prisma Int8 / BigInt columns) works.
    if (!(BigInt.prototype as any).toJSON) {
      (BigInt.prototype as any).toJSON = function () {
        return Number(this);
      };
    }
  }

  private static forResources(
    configs: Resource[],
    dataSources: DataSourceEntry[],
    loader: ResourceConfigLoader,
    { baseUrl }: CroutonAppConfig,
    config: CroutonConfig,
  ): DynamicModule {
    const dataSourceRegistry = new DataSourceRegistry(dataSources);

    // Validate that each resource's model exists on its Prisma client.
    // Resources with missing models are skipped and recorded as load errors
    // so they appear on the status page instead of crashing the server.
    const validConfigs: Resource[] = [];
    for (const c of configs) {
      try {
        const prisma = dataSourceRegistry.resolve(c.database);
        if (!prisma[c.model]) {
          resourceLoadErrorsRegistry.record({
            name: c.name,
            path: c.route,
            error: `Model "${c.model}" not found on the provided PrismaClient. Check the resource config for "${c.name}".`,
          });
          continue;
        }
      } catch (e: any) {
        resourceLoadErrorsRegistry.record({
          name: c.name,
          path: c.route,
          error: e.message ?? String(e),
        });
        continue;
      }
      validConfigs.push(c);
    }

    const configRegistry = new ResourceConfigRegistry(loader, validConfigs);

    const controllers = [
      ...validConfigs.map((c) => createCrudController(c, baseUrl)),
      createAppLayoutController(
        configs,
        config.sidebarGroups,
        config.title,
        config.autoSave ?? true,
      ),
      createStatusController(),
    ];

    return {
      module: CroutonApiModule,
      controllers,
      providers: [
        { provide: APP_FILTER, useClass: CroutonValidationExceptionFilter },
        { provide: DataSourceRegistry, useValue: dataSourceRegistry },
        { provide: ResourceConfigRegistry, useValue: configRegistry },
      ],
    };
  }

  static async forResourceDir(
    dirPath: string,
    dataSourcesPath: string,
    { baseUrl }: CroutonAppConfig,
  ): Promise<DynamicModule> {
    const config = await loadConfig();
    const loader = new FileSystemResourceConfigLoader(
      dirPath,
      baseUrl,
      config.enumsFile,
    );
    const configs = await loadResourceConfigsFromDir(
      dirPath,
      baseUrl,
      config.enumsFile,
    );
    const dataSources = await loadDataSourcesFromDir(dataSourcesPath);

    return CroutonApiModule.forResources(
      configs,
      dataSources,
      loader,
      {
        baseUrl,
      },
      config,
    );
  }

  static async forLoader(
    loader: ResourceConfigLoader,
    configs: Resource[],
    dataSources: DataSourceEntry[],
    appConfig: CroutonAppConfig,
  ): Promise<DynamicModule> {
    const config = await loadConfig();
    return CroutonApiModule.forResources(
      configs,
      dataSources,
      loader,
      appConfig,
      config,
    );
  }
}
