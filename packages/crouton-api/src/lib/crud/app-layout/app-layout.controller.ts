import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  type I18nConfig,
  type SidebarGroupConfig,
  sidebarGroupKey,
} from '@ghentcdh/crouton-core';

import { IS_DEV } from '../dev-mode';
import { ResourceConfigRegistry } from '../resource-config.registry';
import { type Resource } from '../resource/ResourceConfig.schema';
import { getRequestLanguage } from '../translation/language.context';
import { type TranslationRegistry } from '../translation/translation.registry';
import { buildLayoutPayload } from './app-layout.builder';

export const createAppLayoutController = (
  configs: Resource[],
  sidebarGroups: Record<string, SidebarGroupConfig> = {},
  title?: string,
  autoSave = true,
  translationRegistry?: TranslationRegistry,
  i18nConfig?: I18nConfig,
) => {
  const layoutPayload = buildLayoutPayload(
    configs,
    sidebarGroups,
    title,
    autoSave,
    IS_DEV,
  );

  @Controller('_app')
  @ApiTags('App')
  class AppLayoutController {
    constructor(public readonly configRegistry: ResourceConfigRegistry) {}

    @Get('layout')
    @ApiOperation({ summary: 'Get the application layout (sidebar, …)' })
    @ApiResponse({ status: 200, description: 'Application layout metadata' })
    async getLayout() {
      const language = getRequestLanguage();

      let payload;
      if (IS_DEV || language) {
        const fresh = await this.configRegistry.getAll(language);
        payload = buildLayoutPayload(
          fresh,
          language
            ? translateSidebarGroups(sidebarGroups, language, translationRegistry)
            : sidebarGroups,
          language ? translateTitle(title, language, translationRegistry) : title,
          autoSave,
          IS_DEV,
        );
      } else {
        payload = layoutPayload;
      }

      // Append i18n metadata + ui dictionary when translations are active
      if (translationRegistry?.active && i18nConfig) {
        const lang = language ?? i18nConfig.defaultLanguage;
        const bundle = translationRegistry.bundleFor(lang);
        return {
          ...payload,
          i18n: {
            languages: i18nConfig.languages,
            defaultLanguage: i18nConfig.defaultLanguage,
            current: lang,
          },
          ...(bundle.ui && { ui: bundle.ui }),
        };
      }

      return payload;
    }

    @Get('translations')
    @ApiOperation({
      summary: 'Get ui + validation translation dictionaries',
    })
    @ApiResponse({
      status: 200,
      description: 'Translation dictionaries for the current language',
    })
    getTranslations() {
      if (!translationRegistry?.active || !i18nConfig) {
        return { ui: {}, validation: {} };
      }
      const language = getRequestLanguage() ?? i18nConfig.defaultLanguage;
      const bundle = translationRegistry.bundleFor(language);
      return {
        ui: bundle.ui ?? {},
        validation: bundle.validation ?? {},
      };
    }
  }

  Reflect.defineMetadata(
    'design:paramtypes',
    [ResourceConfigRegistry],
    AppLayoutController,
  );

  return AppLayoutController;
};

/** Translate sidebar group labels using the translator. */
const translateSidebarGroups = (
  groups: Record<string, SidebarGroupConfig>,
  language: string,
  registry?: TranslationRegistry,
): Record<string, SidebarGroupConfig> => {
  if (!registry?.active) return groups;
  const t = registry.translatorFor(language);
  const translated: Record<string, SidebarGroupConfig> = {};
  for (const [slug, cfg] of Object.entries(groups)) {
    const label = t(sidebarGroupKey(slug), cfg.label);
    translated[slug] = label !== cfg.label ? { ...cfg, label } : cfg;
  }
  return translated;
};

/** Translate app title using app.title key. */
const translateTitle = (
  title: string | undefined,
  language: string,
  registry?: TranslationRegistry,
): string | undefined => {
  if (!title || !registry?.active) return title;
  const t = registry.translatorFor(language);
  return t('app.title', title);
};