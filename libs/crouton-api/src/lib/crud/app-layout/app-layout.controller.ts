import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  type I18nConfig,
  type SidebarGroupConfig,
} from '@ghentcdh/crouton-core';

import { IS_DEV } from '../dev-mode';
import { type Resource } from '../resource/ResourceConfig.schema';
import { ResourceConfigRegistry } from '../resource-config.registry';
import { buildLayoutPayload } from './app-layout.builder';
import { getRequestLanguage } from '../i18n';
import { type TranslationRegistry } from '../i18n';

export const createAppLayoutController = (
  configs: Resource[],
  sidebarGroups: Record<string, SidebarGroupConfig> = {},
  title?: string,
  autoSave = true,
  translationRegistry?: TranslationRegistry,
  i18nConfig?: I18nConfig,
  prefix?: string,
) => {
  const layoutPayload = buildLayoutPayload(
    configs,
    sidebarGroups,
    title,
    autoSave,
    IS_DEV,
  );

  @Controller(prefix ? `${prefix}/_app` : '_app')
  @ApiTags('App')
  class AppLayoutController {
    constructor(public readonly configRegistry: ResourceConfigRegistry) {}

    @Get('layout')
    @ApiOperation({ summary: 'Get the application layout (sidebar, …)' })
    @ApiResponse({ status: 200, description: 'Application layout metadata' })
    async getLayout() {
      const language = getRequestLanguage();

      let payload;
      if (IS_DEV) {
        const fresh = await this.configRegistry.getAll();
        payload = buildLayoutPayload(
          fresh,
          sidebarGroups,
          title,
          autoSave,
          IS_DEV,
        );
      } else {
        payload = layoutPayload;
      }

      // Append i18n metadata + ui dictionary when translations are active.
      // Labels (sidebar, title, columns) are now translated client-side via /_app/translations.
      if (translationRegistry?.active && i18nConfig) {
        const lang = language ?? i18nConfig.defaultLanguage;
        const bundle = translationRegistry.bundleFor(lang);
        return {
          ...payload,
          i18n: {
            languages: i18nConfig.languages,
            defaultLanguage: i18nConfig.defaultLanguage,
            current: lang,
            ...(i18nConfig.displayNames && {
              displayNames: i18nConfig.displayNames,
            }),
          },
          ...(bundle.ui && { ui: bundle.ui }),
        };
      }

      return payload;
    }

    @Get('translations')
    @ApiOperation({
      summary: 'Get the full translation bundle for the current language',
    })
    @ApiResponse({
      status: 200,
      description:
        'Full translation bundle (resources, enums, sidebarGroups, ui, validation)',
    })
    getTranslations() {
      if (!translationRegistry?.active || !i18nConfig) {
        return {};
      }
      const language = getRequestLanguage() ?? i18nConfig.defaultLanguage;
      return translationRegistry.bundleFor(language);
    }
  }

  Reflect.defineMetadata(
    'design:paramtypes',
    [ResourceConfigRegistry],
    AppLayoutController,
  );

  return AppLayoutController;
};
