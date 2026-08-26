import { Injectable } from '@nestjs/common';

import { IS_DEV } from './dev-mode';
import type { ResourceConfigLoader } from './loader/resource-config.loader';
import { type Resource } from './resource/ResourceConfig.schema';
import { localizeResource } from './translation/localize-resource';
import type { TranslationRegistry } from './translation/translation.registry';

@Injectable()
export class ResourceConfigRegistry {
  private configs: Resource[];
  private translationRegistry?: TranslationRegistry;

  /**
   * Per-language memo: `Map<language, Map<route, Resource>>`.
   * Cleared whenever the underlying configs reload (dev mode).
   */
  private localizedCache = new Map<string, Map<string, Resource>>();

  constructor(
    private readonly loader: ResourceConfigLoader,
    initialConfigs: Resource[],
  ) {
    this.configs = initialConfigs;
  }

  setTranslationRegistry(registry: TranslationRegistry): void {
    this.translationRegistry = registry;
  }

  async getAll(language?: string): Promise<Resource[]> {
    if (IS_DEV) {
      this.configs = await this.loader.loadAll();
      this.localizedCache.clear();
    }
    if (!language || !this.translationRegistry?.active) {
      return this.configs;
    }
    return this.configs.map((c) => this.getLocalized(c, language));
  }

  async getByRoute(
    route: string,
    language?: string,
  ): Promise<Resource | undefined> {
    if (IS_DEV) {
      const fresh = await this.loader.loadByRoute(route);
      this.localizedCache.clear();
      if (!fresh) return undefined;
      if (language && this.translationRegistry?.active) {
        return this.localize(fresh, language);
      }
      return fresh;
    }
    const config = this.configs.find((c) => c.route === route);
    if (!config) return undefined;
    if (language && this.translationRegistry?.active) {
      return this.getLocalized(config, language);
    }
    return config;
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

  private getLocalized(config: Resource, language: string): Resource {
    let langMap = this.localizedCache.get(language);
    if (!langMap) {
      langMap = new Map();
      this.localizedCache.set(language, langMap);
    }
    let localized = langMap.get(config.route);
    if (!localized) {
      localized = this.localize(config, language);
      langMap.set(config.route, localized);
    }
    return localized;
  }

  private localize(config: Resource, language: string): Resource {
    if (!this.translationRegistry) return config;
    const t = this.translationRegistry.translatorFor(language);
    return localizeResource(config, t);
  }
}
