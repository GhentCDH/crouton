import type { ResourceConfig } from '../crud.config';

export abstract class ResourceConfigLoader {
  abstract loadAll(): Promise<ResourceConfig[]>;
  abstract loadByRoute(route: string): Promise<ResourceConfig | undefined>;
}
