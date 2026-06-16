import { loadResourceConfigsFromDir } from './index';

import { ResourceConfigLoader } from './resource-config.loader';
import type { ResourceConfig } from '../crud.config';

export class FileSystemResourceConfigLoader extends ResourceConfigLoader {
  constructor(
    private readonly dirPath: string,
    private readonly baseUrl?: string,
    private readonly enumsFile?: string,
  ) {
    super();
  }

  async loadAll(): Promise<ResourceConfig[]> {
    return loadResourceConfigsFromDir(this.dirPath, this.baseUrl, this.enumsFile);
  }

  async loadByRoute(route: string): Promise<ResourceConfig | undefined> {
    const configs = await this.loadAll();
    return configs.find((c) => c.route === route);
  }
}
