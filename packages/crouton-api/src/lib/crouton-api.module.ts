import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { createAppLayoutController } from './crud/app-layout';
import { type LoadedConfig, loadConfig } from './crud/config/read';
import { CroutonValidationExceptionFilter } from './crud/crouton-validation.filter';
import { createCrudController } from './crud/crud-controller.factory';
import { validateCustomRepository } from './crud/custom-repository';
import type { DataSourceEntry } from './crud/data-source';
import { DataSourceRegistry, loadDataSourcesFromDir } from './crud/data-source';
import { IS_DEV } from './crud/dev-mode';
import { DevResourcesController } from './crud/dev-tools/dev-resources.controller';
import { loadEnumRegistry } from './crud/enum-registry';
import { FileSystemResourceConfigLoader } from './crud/loader/fs-resource-config.loader';
import { loadResourceConfigsFromDir } from './crud/loader/index';
import { type ResourceConfigLoader } from './crud/loader/resource-config.loader';
import { type Resource } from './crud/resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from './crud/resource/resource-load-errors.registry';
import { ResourceConfigRegistry } from './crud/resource-config.registry';
import { createStatusController } from './crud/status';
import { LanguageInterceptor, TranslationRegistry } from './crud/translation';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    config: LoadedConfig,
  ): DynamicModule {
    const dataSourceRegistry = new DataSourceRegistry(dataSources);

    // Load enum registry
    const startDir =
      typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url));
    const enumRegistry = loadEnumRegistry(startDir, config.enumsFile);

    // Validate that each resource can actually serve what it advertises:
    // a prisma resource needs its model on the client, a custom resource needs
    // a repository.ts implementing every enabled operation. Failures are
    // skipped and recorded so they appear on the status page instead of
    // crashing the server.
    const validConfigs: Resource[] = [];
    for (const c of configs) {
      if (c.kind === 'custom') {
        // A custom resource may run without any datasource; only a *named*
        // datasource that does not exist is an error.
        if (c.database) {
          try {
            dataSourceRegistry.resolve(c.database);
          } catch (e: any) {
            resourceLoadErrorsRegistry.record({
              name: c.name,
              path: c.route,
              error: e.message ?? String(e),
            });
            continue;
          }
        }
        const problem = validateCustomRepository(c, c.repository);
        if (problem) {
          resourceLoadErrorsRegistry.record({
            name: c.name,
            path: c.route,
            error: problem,
          });
          continue;
        }
        validConfigs.push(c);
        continue;
      }

      try {
        const prisma = dataSourceRegistry.resolve(c.database);
        if (!c.model || !prisma[c.model]) {
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

    // Translation registry: wire up when i18n is configured.
    let translationRegistry: TranslationRegistry | undefined;
    if (config.i18n) {
      const translationsDir = join(
        config.configDir,
        config.i18n.translationsDir,
      );
      translationRegistry = new TranslationRegistry(
        translationsDir,
        config.i18n,
      );
      configRegistry.setTranslationRegistry(translationRegistry);
    }

    const controllers = [
      ...validConfigs.map((c) => createCrudController(c, baseUrl)),
      createAppLayoutController(
        configs,
        config.sidebarGroups,
        config.title,
        config.autoSave ?? true,
        translationRegistry,
        config.i18n,
      ),
      // Only registered (and thus only visible in Swagger/routing) when the
      // visual resource builder is enabled — see dev-resources.controller.ts.
      ...(IS_DEV ? [DevResourcesController] : []),
      createStatusController(enumRegistry, translationRegistry),
    ];

    return {
      module: CroutonApiModule,
      controllers,
      providers: [
        { provide: APP_FILTER, useClass: CroutonValidationExceptionFilter },
        { provide: DataSourceRegistry, useValue: dataSourceRegistry },
        { provide: ResourceConfigRegistry, useValue: configRegistry },
        ...(translationRegistry
          ? [
              {
                provide: TranslationRegistry,
                useValue: translationRegistry,
              },
              {
                provide: APP_INTERCEPTOR,
                useFactory: () =>
                  new LanguageInterceptor(translationRegistry!),
              },
            ]
          : []),
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
