import { type DynamicModule, Module } from '@nestjs/common';

import { createAppLayoutController } from './crud/app-layout.controller';
import { createCrudController } from './crud/crud-controller.factory';
import { type ResourceConfig } from './crud/crud.config';
import type { DataSourceEntry } from './crud/data-source';
import { DataSourceRegistry, loadDataSourcesFromDir } from './crud/data-source';
import { FileSystemResourceConfigLoader } from './crud/loader/fs-resource-config.loader';
import { loadResourceConfigsFromDir } from './crud/loader/index';
import { type ResourceConfigLoader } from './crud/loader/resource-config.loader';
import { ResourceConfigRegistry } from './crud/resource-config.registry';

type CroutonConfig = {
  baseUrl: string;
};
@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class CroutonApiModule {
  static forResources(
    configs: ResourceConfig[],
    dataSources: DataSourceEntry[],
    loader: ResourceConfigLoader,
    config: CroutonConfig,
  ): DynamicModule {
    const dataSourceRegistry = new DataSourceRegistry(dataSources);
    const configRegistry = new ResourceConfigRegistry(loader, configs);
    const controllers = [
      ...configs.map((c) => createCrudController(c, config.baseUrl)),
      createAppLayoutController(configs),
    ];

    return {
      module: CroutonApiModule,
      controllers,
      providers: [
        { provide: DataSourceRegistry, useValue: dataSourceRegistry },
        { provide: ResourceConfigRegistry, useValue: configRegistry },
      ],
    };
  }

  static async forResourceDir(
    dirPath: string,
    dataSourcesPath: string,
    config: CroutonConfig,
  ): Promise<DynamicModule> {
    const loader = new FileSystemResourceConfigLoader(dirPath, config.baseUrl);
    const configs = await loadResourceConfigsFromDir(dirPath, config.baseUrl);
    const dataSources = await loadDataSourcesFromDir(dataSourcesPath);
    return CroutonApiModule.forResources(configs, dataSources, loader, config);
  }

  static forLoader(
    loader: ResourceConfigLoader,
    configs: ResourceConfig[],
    dataSources: DataSourceEntry[],
    config: CroutonConfig,
  ): DynamicModule {
    return CroutonApiModule.forResources(configs, dataSources, loader, config);
  }
}
