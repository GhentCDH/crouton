import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type ResourceConfig } from './crud.config';
import { IS_DEV } from './dev-mode';
import { ResourceConfigRegistry } from './resource-config.registry';

const buildLayoutPayload = (configs: ResourceConfig[]) => {
  const sidebar = configs
    .filter((c) => c.sidebar?.hide !== true && c.views?.['table'])
    .map((c) => ({
      id: c.name,
      route: c.route,
      title: c.title ?? c.tag,
      position: c.sidebar?.position,
    }))
    .sort((a, b) => {
      if (a.position != null && b.position != null)
        return a.position - b.position;
      if (a.position != null) return -1;
      if (b.position != null) return 1;
      return a.title.localeCompare(b.title);
    });

  return { sidebar };
};

export const createAppLayoutController = (configs: ResourceConfig[]) => {
  const layoutPayload = buildLayoutPayload(configs);

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
        return buildLayoutPayload(fresh);
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
