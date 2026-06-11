import { Injectable } from '@nestjs/common';

import type { ResourceConfig } from './crud.config';
import type { ResourceConfigLoader } from './loader/resource-config.loader';
import { IS_DEV } from './dev-mode';

@Injectable()
export class ResourceConfigRegistry {
  private configs: ResourceConfig[];

  constructor(
    private readonly loader: ResourceConfigLoader,
    initialConfigs: ResourceConfig[],
  ) {
    this.configs = initialConfigs;
  }

  async getAll(): Promise<ResourceConfig[]> {
    if (IS_DEV) {
      this.configs = await this.loader.loadAll();
    }
    return this.configs;
  }

  async getByRoute(route: string): Promise<ResourceConfig | undefined> {
    if (IS_DEV) {
      return this.loader.loadByRoute(route);
    }
    return this.configs.find((c) => c.route === route);
  }
}
