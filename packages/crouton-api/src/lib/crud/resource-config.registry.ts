import { Injectable } from '@nestjs/common';

import { IS_DEV } from './dev-mode';
import type { ResourceConfigLoader } from './loader/resource-config.loader';
import { type Resource } from './resource/ResourceConfig.schema';

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

  /**
   * On-disk directory containing `route`'s `resource.json`, if known.
   * Only meaningful after a load has populated the loader's internal map —
   * callers in dev mode should call `getByRoute`/`getAll` first in the same
   * request to guarantee freshness.
   */
  getResourceDir(route: string): string | undefined {
    return this.loader.getResourceDir(route);
  }
}
