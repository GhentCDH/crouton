import { Injectable } from '@nestjs/common';
import { IS_DEV } from './dev-mode';
import type { ResourceConfigLoader } from './loader/resource-config.loader';
import { Resource } from './resource/ResourceConfig.schema';

@Injectable()
export class ResourceConfigRegistry {
  private configs: Resource[];

  constructor(
    private readonly loader: ResourceConfigLoader,
    initialConfigs: Resource[],
  ) {
    this.configs = initialConfigs;
  }

  async getAll(): Promise<Resource[]> {
    if (IS_DEV) {
      this.configs = await this.loader.loadAll();
    }
    return this.configs;
  }

  async getByRoute(route: string): Promise<Resource | undefined> {
    if (IS_DEV) {
      return this.loader.loadByRoute(route);
    }
    return this.configs.find((c) => c.route === route);
  }
}
