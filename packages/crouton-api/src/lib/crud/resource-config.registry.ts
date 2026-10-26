import { Injectable } from '@nestjs/common';

import { IS_DEV } from './dev-mode';
import type { ResourceConfigLoader } from './loader/resource-config.loader';
import { type Resource } from './resource/ResourceConfig.schema';

@Injectable()
export class ResourceConfigRegistry<R extends Resource = Resource> {
  private configs: R[];

  constructor(
    private readonly loader: ResourceConfigLoader,
    initialConfigs: R[],
  ) {
    this.configs = initialConfigs;
  }

  async getAll(): Promise<R[]> {
    if (IS_DEV) {
      this.configs = (await this.loader.loadAll()) as R[];
    }
    return this.configs;
  }

  async getByRoute(route: string): Promise<R | undefined> {
    if (IS_DEV) {
      const fresh = await this.loader.loadByRoute(route);
      if (fresh !== undefined) {
        // Update the in-memory list to reflect any on-disk changes.
        const idx = this.configs.findIndex((c) => c.route === route);
        if (idx >= 0) this.configs[idx] = fresh as R;
        else this.configs.push(fresh as R);
      }
      return fresh as R | undefined;
    }
    return this.configs.find((c) => c.route === route);
  }

  async findById(id: string): Promise<R | undefined> {
    const all = await this.getAll();
    return all.find((c) => c.id === id);
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
