import { loadResourceConfigsFromDir } from './index';

import { ResourceConfigLoader } from './resource-config.loader';
import { type Resource } from '../resource/ResourceConfig.schema';

export class FileSystemResourceConfigLoader extends ResourceConfigLoader {
  private dirsByRoute = new Map<string, string>();

  constructor(
    private readonly dirPath: string,
    private readonly baseUrl?: string,
    private readonly enumsFile?: string,
  ) {
    super();
  }

  async loadAll(): Promise<Resource[]> {
    const dirsByRoute = new Map<string, string>();
    const configs = await loadResourceConfigsFromDir(
      this.dirPath,
      this.baseUrl,
      this.enumsFile,
      (route, dir) => dirsByRoute.set(route, dir),
    );
    this.dirsByRoute = dirsByRoute;
    return configs;
  }

  async loadByRoute(route: string): Promise<Resource | undefined> {
    const configs = await this.loadAll();
    return configs.find((c) => c.route === route);
  }

  override getResourceDir(route: string): string | undefined {
    return this.dirsByRoute.get(route);
  }
}
