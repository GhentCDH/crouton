import { type Resource } from '../resource/ResourceConfig.schema';

export abstract class ResourceConfigLoader {
  abstract loadAll(): Promise<Resource[]>;
  abstract loadByRoute(route: string): Promise<Resource | undefined>;
}
