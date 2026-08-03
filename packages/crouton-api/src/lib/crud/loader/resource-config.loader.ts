import { type Resource } from '../resource/ResourceConfig.schema';

export abstract class ResourceConfigLoader {
  abstract loadAll(): Promise<Resource[]>;
  abstract loadByRoute(route: string): Promise<Resource | undefined>;
  /**
   * On-disk directory containing this resource's `resource.json`, if the
   * loader knows one (populated as a side effect of the last `loadAll()`).
   * Returns `undefined` for loaders with no filesystem concept (e.g. a
   * resource defined purely via `resource.ts`) or before any load has run.
   */
  getResourceDir(_route: string): string | undefined {
    return undefined;
  }
}
