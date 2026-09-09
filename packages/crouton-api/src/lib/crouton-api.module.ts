import {
  type DynamicModule,
  Module,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { registerResourceExtensions } from '@ghentcdh/crouton-core';

import type { CroutonAppConfig } from './crud/app-config';
import { createAppLayoutController } from './crud/app-layout';
import { type LoadedConfig, loadConfig } from './crud/config/read';
import { CroutonValidationExceptionFilter } from './crud/crouton-validation.filter';
import { createCrudController } from './crud/crud-controller.factory';
import { validateCustomRepository } from './crud/custom-repository';
import type { DataSourceAdapter, DataSourceEntry } from './crud/data-source';
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
import { CroutonSecurityGuard, SecurityGuardRegistry } from './crud/security';
import { createStatusController } from './crud/status';
import { LanguageInterceptor, TranslationRegistry } from './crud/translation';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';


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
    appConfig: CroutonAppConfig,
    config: LoadedConfig,
  ): DynamicModule {
    const { baseUrl, prefix, security } = appConfig;
    const dataSourceRegistry = new DataSourceRegistry(dataSources);

    // Security guard registry: maps guard names to their NestJS guard classes.
    const guardRegistry = new SecurityGuardRegistry(security?.guards ?? {});
    const moduleDefaultSecurity = security?.default;

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
      // Resolve the datasource adapter to determine data-access strategy.
      // Dispatch branches on the adapter kind, not on config.kind.
      // config.kind controls schema source only (prisma = schema.ts, custom = columns).
      let adapter: DataSourceAdapter | undefined;
      if (c.database || dataSourceRegistry.entries().length > 0) {
        try {
          adapter = dataSourceRegistry.resolveAdapter(c.database);
        } catch (e: any) {
          // A named datasource that doesn't exist is always an error.
          // No datasource at all is ok for kind=custom or custom-adapter resources.
          if (c.database) {
            resourceLoadErrorsRegistry.record({
              name: c.name,
              path: c.route,
              error: e.message ?? String(e),
            });
            continue;
          }
        }
      }

      const adapterIsCustom = adapter ? adapter.kind !== 'prisma' : false;
      const hasRepository = !!c.repository;

      // A per-resource repository.ts or a custom-adapter datasource → validate
      // that the enabled operations can be served.
      if (hasRepository || adapterIsCustom || c.kind === 'custom') {
        let adapterClient: unknown = adapter?.client;
        // kind=custom on a prisma adapter: the adapter client is a PrismaClient, not
        // a repository — don't pass it as a fallback repository to the validator.
        if (!adapterIsCustom && !hasRepository) {
          adapterClient = undefined;
        }
        const problem = validateCustomRepository(c, c.repository, adapterClient);
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

      // Prisma adapter, no per-resource repository.ts: validate model.
      if (!c.model) {
        resourceLoadErrorsRegistry.record({
          name: c.name,
          path: c.route,
          error: `"model" is required for resource "${c.name}" on a Prisma datasource. ` +
            'Set "model" to the Prisma model name, or set adapter: "custom" on the datasource.',
        });
        continue;
      }
      if (adapter && adapter.supports && !adapter.supports(c.model)) {
        resourceLoadErrorsRegistry.record({
          name: c.name,
          path: c.route,
          error: `Model "${c.model}" not found on the provided PrismaClient. Check the resource config for "${c.name}".`,
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
      ...validConfigs.map((c) =>
        createCrudController(
          c,
          baseUrl,
          moduleDefaultSecurity,
          !!security,
          prefix,
          appConfig.schemaEnricher,
        ),
      ),
      createAppLayoutController(
        configs,
        config.sidebarGroups,
        config.title,
        config.autoSave ?? true,
        translationRegistry,
        config.i18n,
        prefix,
      ),
      // Only registered (and thus only visible in Swagger/routing) when the
      // visual resource builder is enabled — see dev-resources.controller.ts.
      ...(IS_DEV ? [DevResourcesController] : []),
      createStatusController(enumRegistry, translationRegistry, prefix),
    ];

    return {
      module: CroutonApiModule,
      controllers,
      exports: [ResourceConfigRegistry],
      providers: [
        { provide: APP_FILTER, useClass: CroutonValidationExceptionFilter },
        { provide: DataSourceRegistry, useValue: dataSourceRegistry },
        { provide: ResourceConfigRegistry, useValue: configRegistry },
        // Security providers only registered when security is configured;
        // without guards the dispatching guard is never applied (see factory).
        ...(security
          ? [
              { provide: SecurityGuardRegistry, useValue: guardRegistry },
              CroutonSecurityGuard,
              ...guardRegistry.classes(),
            ]
          : []),
        ...(translationRegistry
          ? [
              {
                provide: TranslationRegistry,
                useValue: translationRegistry,
              },
              {
                provide: APP_INTERCEPTOR,
                useFactory: () => new LanguageInterceptor(translationRegistry!),
              },
            ]
          : []),
      ],
    };
  }

  static async forResourceDir(
    dirPath: string,
    dataSourcesPath: string,
    appConfig: CroutonAppConfig,
  ): Promise<DynamicModule> {
    // Register extensions before parsing resource.json files — ordering contract.
    if (appConfig.extensions) registerResourceExtensions(appConfig.extensions);
    const config = await loadConfig();
    const loader = new FileSystemResourceConfigLoader(
      dirPath,
      appConfig.baseUrl,
      config.enumsFile,
    );
    const configs = await loadResourceConfigsFromDir(
      dirPath,
      appConfig.baseUrl,
      config.enumsFile,
    );
    const dataSources = await loadDataSourcesFromDir(dataSourcesPath);

    return CroutonApiModule.forResources(
      configs,
      dataSources,
      loader,
      appConfig,
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
