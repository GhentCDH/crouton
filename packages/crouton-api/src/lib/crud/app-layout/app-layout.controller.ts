import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type SidebarGroupConfig } from '@ghentcdh/crouton-core';

import { IS_DEV } from '../dev-mode';
import { ResourceConfigRegistry } from '../resource-config.registry';
import { buildLayoutPayload } from './app-layout.builder';
import { type Resource } from '../resource/ResourceConfig.schema';

export const createAppLayoutController = (
  configs: Resource[],
  sidebarGroups: Record<string, SidebarGroupConfig> = {},
  title?: string,
  autoSave = true,
) => {
  const layoutPayload = buildLayoutPayload(
    configs,
    sidebarGroups,
    title,
    autoSave,
  );

  @Controller('_app')
  @ApiTags('App')
  class AppLayoutController {
    constructor(public readonly configRegistry: ResourceConfigRegistry) {}

    @Get('layout')
    @ApiOperation({ summary: 'Get the application layout (sidebar, …)' })
    @ApiResponse({ status: 200, description: 'Application layout metadata' })
    async getLayout() {
      if (IS_DEV) {
        const fresh = await this.configRegistry.getAll();

        return buildLayoutPayload(fresh, sidebarGroups, title, autoSave);
      }
      return layoutPayload;
    }
  }

  Reflect.defineMetadata(
    'design:paramtypes',
    [ResourceConfigRegistry],
    AppLayoutController,
  );

  return AppLayoutController;
};
